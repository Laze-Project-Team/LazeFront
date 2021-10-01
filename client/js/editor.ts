import editor from './monaco/src/js/main';
import * as monaco from 'monaco-editor';
import moment from 'moment';
import io from 'socket.io-client';

// セーブ
editor.addAction({
	id: 'save-file',
	label: 'セーブ',
	keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
	contextMenuOrder: 1.5,
	run: (editor, ...args) => save(editor.getModel()!.getValue()!),
});

// Socket.IO
const socket = io('');

$(() => {
	// ボタン
	$('#btn-save').on('click', () => save(editor.getValue()));
	$('#btn-compile').on('click', () => compile(editor));
	$('#btn-newfile').on('click', () => newFile('file', ''));

	const adjustCanvasSize = (direction: 'x' | 'y') => {
		if (direction === 'x') {
			(document.querySelector('.editor-console') as HTMLElement)!.style.height = (canvas.clientWidth * 9) / 16 + document.querySelector('.editor-output-label')!.clientHeight + 'px';
		} else {
			(document.querySelector('.editor-output') as HTMLElement)!.style.width = document.querySelector('.editor-console')!.clientWidth - (canvas.clientHeight * 16) / 9 + 'px';
		}
		return true;
	};
	setTimeout(() => {
		adjustCanvasSize('x');
	}, 100);

	// リサイズ可能に
	$('.explorer').resizable({
		handleSelector: '.exp-spliter',
		resizeHeight: false,
		onDrag: () => adjustCanvasSize('x'),
		onDragEnd: () => {
			editor.layout();
			return true;
		},
	});
	$('.editor-console').resizable({
		onDrag: () => adjustCanvasSize('y'),
		onDragEnd: () => {
			editor.layout();
			return true;
		},
		handleSelector: '.console-spliter',
		resizeWidth: false,
		resizeHeightFrom: 'top',
	});
	$('.editor-output').resizable({
		onDrag: () => adjustCanvasSize('x'),
		onDragEnd: () => {
			editor.layout();
			return true;
		},
		handleSelector: '.editor-output-spliter',
		resizeHeight: false,
	});

	const canvas = <HTMLCanvasElement>document.getElementById('output-canvas');
	canvas.width = 1280;
	canvas.height = 720;
});

// window閉じる時の警告
window.onbeforeunload = function (e) {
	return '';
};

const editorPrepared = setInterval(() => {
	if (document.getElementsByClassName('monaco-editor')) {
		document.getElementById('loading-screen')!.style.display = 'none';
		clearInterval(editorPrepared);
	}
}, 50);

// 変数
let projectName = 'Project1';

// ログ出力
function logConsole(value: string | string[], style = 'log') {
	const outputArea = document.getElementById('editor-console');
	if (!outputArea) return;

	if (typeof value === 'string') value = [value];
	value.forEach((item) => {
		let output = document.createElement('div');
		output.classList.add(style);
		output.innerHTML = `<span class="output-value">${item}</span><span class="output-timestamp">${moment().format('HH:mm')}</span>`;
		outputArea.append(output);
	});

	// スクロール
	outputArea.scrollTop = outputArea.scrollHeight;
}
// ポップアップメッセージ
function logPopup(value: string, style = 'info') {
	const outputArea = document.getElementById('popup-message');
	if (!outputArea) return;

	let output = document.createElement('div');
	output.classList.add('popup');
	output.classList.add(style);
	output.innerHTML = `<span>${value}</span><button><svg viewBox="0 0 64 64"><use xlink:href="assets/icons/icons.svg#cross"></use></svg></button>`;
	output.addEventListener('animationend', function (e) {
		if (e.animationName.startsWith('popup-end')) this.remove();
	});

	output.getElementsByTagName('button')[0].onclick = function () {
		output.getElementsByTagName('button')[0].parentElement?.classList.add('close');
	};
	outputArea.prepend(output);
}

// ログ出力
socket.on('output', (result: { value: string | string[]; style: 'log' | 'err' | 'info' }) => logConsole(result.value, result.style));

// セーブ
function save(content: string) {
	currentContents.filter((content) => content.path === currentFile)[0].content = content;
	$('.current-file').removeClass('unsaved');
}

// コンパイル
function compile(editor: monaco.editor.IStandaloneCodeEditor) {
	const value = editor.getValue();
	socket.emit('compile', {
		filename: currentFile,
		value: value,
	});
}
// == mouseとkeyboard(canvas用)
let canvas = <HTMLCanvasElement>document.getElementById('output-canvas');
let mouseX = 0.0;
let mouseY = 0.0;
let mousePressed = false;
let memorySize = 0;
let lastDownTarget: EventTarget | null;
let pressedKeys = new Array(256);
window.onload = function () {
	for (let i = 0; i < 256; i++) {
		pressedKeys[i] = false;
	}
	mousePressed = false;
	document.addEventListener(
		'mousedown',
		(e) => {
			mousePressed = true;
			lastDownTarget = e.target;
		},
		false
	);
	document.addEventListener(
		'mouseup',
		(e) => {
			if (e.target === canvas) {
				mousePressed = false;
			}
		},
		false
	);
	document.addEventListener(
		'keydown',
		(e) => {
			if (lastDownTarget === canvas) {
				pressedKeys[e.keyCode] = true;
			}
		},
		false
	);
	document.addEventListener(
		'keyup',
		(e) => {
			if (lastDownTarget === canvas) {
				pressedKeys[e.keyCode] = false;
			}
		},
		false
	);
};
//@ts-ignore
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
//@ts-ignore
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

canvas.onclick = function () {
	canvas.requestPointerLock();
};

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
	if (
		document.pointerLockElement === canvas ||
		//@ts-ignore
		document.mozPointerLockElement === canvas
	) {
		console.log('The pointer lock status is now locked');
		document.addEventListener('mousemove', updatePosition, false);
	} else {
		console.log('The pointer lock status is now unlocked');
		document.removeEventListener('mousemove', updatePosition, false);
	}
}

function updatePosition(e: MouseEvent) {
	mouseX += e.movementX;
	mouseY += e.movementY;
}

// ============ WebAssembly関係 ==========

// @ts-ignore
let memory = new WebAssembly.Memory({ initial: 17 });
let gl = canvas.getContext('webgl2');
let webglPrograms: WebGLProgram[] = [];
//WebGLShader
let webglShaders: WebGLShader[] = [];
//WebGLBuffer
let webglBuffers: WebGLBuffer[] = [];
let webglUniformLoc: WebGLUniformLocation[] = [];

function initShaderProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
	const vertexShader = loadShader(gl, gl!.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl!.FRAGMENT_SHADER, fsSource);

	// Create the shader program
	const shaderProgram = gl.createProgram();
	if (shaderProgram && vertexShader && fragmentShader) {
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		// If creating the shader program failed, alert

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
			return null;
		}
		webglPrograms.push(shaderProgram);
	}
	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl: WebGL2RenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);

	// Send the source to the shader object
	if (shader) {
		gl.shaderSource(shader, source);

		// Compile the shader program

		gl.compileShader(shader);

		// See if it compiled successfully

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
	}

	return shader;
}
let importObject = {
	console: {
		log: function (arg: number) {
			// var char = new Uint8Array([Math.floor((arg/256)/256), Math.floor((arg%(256*256))/256), Math.floor((arg%(256*256))%256)]);
			// char = char.filter(char => char != 0);
			// console.log(new TextDecoder('utf-8').decode(char));
			logConsole(`${Number(arg)}`);
			console.log(Number(arg));
		},
		logstring: function (offset: number, length: number) {
			// console.log(Number(length) * 4);
			var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
			// bytes.reverse();
			bytes = bytes.filter((element) => element != 0);
			let string = new TextDecoder('utf-8').decode(bytes);
			logConsole(string);
			console.log(string);
		},
		logMatrix: function (offset: number) {
			const buffer = memory.buffer.slice(offset, 128 + offset);
			const f64Array = new Float64Array(buffer);
			const f32Array = Float32Array.from(f64Array);
			logConsole(JSON.stringify(f32Array));
			console.log(f32Array);
		},
	},
	performance: {
		now: function () {
			return performance.now();
		},
	},
	js: {
		mem: memory,
		checkKeyPress: function (keyCode: number) {
			return BigInt(pressedKeys[keyCode]);
		},
		checkMousePress: function () {
			return BigInt(mousePressed);
		},
		checkMouseX: function () {
			return mouseX;
		},
		checkMouseY: function () {
			return mouseY;
		},
		rand: function () {
			return Math.random();
		},
		alloc: function (size: number) {
			let temp = memorySize;
			memorySize += size;
			return temp;
		},
	},
	webgl: {
		clearColor: function (r: number, g: number, b: number, a: number) {
			gl!.clearColor(r, g, b, a);
		},
		clear: function (i: number) {
			gl!.clear(i);
		},
		clearDepth: function (i: number) {
			gl!.clearDepth(i);
		},
		depthFunc: function (i: number) {
			gl!.depthFunc(i);
		},
		enable: function (i: number) {
			gl!.enable(i);
		},
		vertexAttribPointer: function (index: number, size: number, type: number, normalized: number, stride: number, offset: number) {
			gl!.vertexAttribPointer(index, size, type, false, stride, offset);
		},
		enableVertexAttribArray: function (index: number) {
			gl!.enableVertexAttribArray(index);
		},
		disable: function (i: number) {
			gl!.disable(i);
		},
		createProgram: function () {
			webglPrograms.push(gl!.createProgram()!);
			return webglPrograms.length - 1;
		},
		createBuffer: function () {
			webglBuffers.push(gl!.createBuffer()!);
			// console.log(webglBuffers.length - 1);
			return webglBuffers.length - 1;
		},
		bindBuffer: function (i: number, j: number) {
			gl!.bindBuffer(i, webglBuffers[j]);
		},
		bufferData: function (i: number, offset: number, size: number, j: number) {
			const buffer = memory.buffer.slice(offset, size * 8 + offset);
			const f64Array = new Float64Array(buffer);
			const f32Array = Float32Array.from(f64Array);
			gl!.bufferData(i, f32Array, j);
		},
		useProgram: function (i: number) {
			gl!.useProgram(webglPrograms[i]);
		},
		getAttribLocation: function (i: number, offset: number, length: number) {
			var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
			// bytes.reverse();
			bytes = bytes.filter((element) => element != 0);
			var string = new TextDecoder('utf-8').decode(bytes);
			// string = [...string].reverse().join("");
			return gl!.getAttribLocation(webglPrograms[i], string);
		},
		getUniformLocation: function (i: number, offset: number, length: number) {
			var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
			bytes = bytes.filter((element) => element != 0);
			var string = new TextDecoder('utf-8').decode(bytes);
			webglUniformLoc.push(gl!.getUniformLocation(webglPrograms[i], string)!);
			return webglUniformLoc.length - 1;
		},
		uniformMatrix2fv: function (i: number, transpose: number, offset: number) {
			const f64Array = new Float64Array(memory.buffer, offset, 4);
			const f32Array = Float32Array.from(f64Array);
			gl!.uniformMatrix2fv(webglUniformLoc[i], false, f32Array);
		},
		uniformMatrix3fv: function (i: number, transpose: any, offset: number) {
			const f64Array = new Float64Array(memory.buffer, offset, 9);
			const f32Array = Float32Array.from(f64Array);
			gl!.uniformMatrix3fv(webglUniformLoc[i], transpose, f32Array);
		},
		uniformMatrix4fv: function (i: number, transpose: any, offset: number) {
			const buffer = memory.buffer.slice(offset, 128 + offset);
			const f64Array = new Float64Array(buffer);
			const f32Array = Float32Array.from(f64Array);
			gl!.uniformMatrix4fv(webglUniformLoc[i], transpose, f32Array);
		},
		uniform1f: function (i: number, v0: number) {
			gl!.uniform1f(webglUniformLoc[i], v0);
		},
		uniform1fv: function (i: number, v0: any) {
			gl!.uniform1fv(webglUniformLoc[i], v0);
		},
		uniform1i: function (i: number, v0: any) {
			gl!.uniform1i(webglUniformLoc[i], v0);
		},
		uniform1iv: function (i: number, v0: any) {
			gl!.uniform1iv(webglUniformLoc[i], v0);
		},

		uniform2f: function (i: number, v0: number, v1: number) {
			gl!.uniform2f(webglUniformLoc[i], v0, v1);
		},
		uniform2fv: function (i: number, v0: any, v1: any) {
			gl!.uniform2fv(webglUniformLoc[i], v0, v1);
		},
		uniform2i: function (i: number, v0: any, v1: any) {
			gl!.uniform2i(webglUniformLoc[i], v0, v1);
		},
		uniform2iv: function (i: number, v0: any, v1: any) {
			gl!.uniform2iv(webglUniformLoc[i], v0, v1);
		},

		uniform3f: function (i: number, v0: any, v1: any, v2: any) {
			gl!.uniform3f(webglUniformLoc[i], v0, v1, v2);
		},
		uniform3fv: function (i: number, v0: any, v1: any, v2: any) {
			gl!.uniform3fv(webglUniformLoc[i], v0, v1, v2);
		},
		uniform3i: function (i: number, v0: any, v1: any, v2: any) {
			gl!.uniform3i(webglUniformLoc[i], v0, v1, v2);
		},
		uniform3iv: function (i: number, v0: any, v1: any, v2: any) {
			gl!.uniform3iv(webglUniformLoc[i], v0, v1, v2);
		},

		uniform4f: function (i: number, v0: any, v1: any, v2: any, v3: any) {
			gl!.uniform4f(webglUniformLoc[i], v0, v1, v2, v3);
		},
		uniform4fv: function (i: number, v0: any, v1: any, v2: any, v3: any) {
			// gl!.uniform4fv(webglUniformLoc[i], v0, v1, v2, v3);
		},
		uniform4i: function (i: number, v0: any, v1: any, v2: any, v3: any) {
			gl!.uniform4i(webglUniformLoc[i], v0, v1, v2, v3);
		},
		uniform4iv: function (i: number, v0: any, v1: any, v2: any, v3: any) {
			// gl!.uniform4iv(webglUniformLoc[i], v0, v1, v2, v3);
		},
		drawArrays: function (i: any, first: any, count: any) {
			// console.log(i);
			gl!.drawArrays(i, first, count);
		},
	},
};
const vsSource = ` #version 300 es
  layout (location = 0) in vec3 aVertexPosition;
  layout (location = 1) in vec3 aVertexNormal;

  uniform mat4 uProjMat;
  uniform mat4 uModelMat;
  uniform mat4 uViewMat;

  out vec3 vNormal;
  out vec3 vPosition;
  void main() {
    gl_Position = uProjMat * uViewMat * uModelMat * vec4(aVertexPosition, 1.0);
    vPosition = vec3(uModelMat * vec4(aVertexPosition, 1.0));
    vNormal = vec3(uModelMat * vec4(aVertexNormal, 1.0));
  }
`;
const fsSource = ` #version 300 es

  #ifdef GL_ES
  precision mediump float;
  #endif

  in vec3 vNormal;
  in vec3 vPosition;

  uniform vec3 lightPos;
  uniform vec3 lightColor;
  uniform vec3 objectColor;
  uniform vec3 viewPos; 

  out vec4 FragColor;

  void main() {
    float ambientStrength = 0.2;
    vec3 ambient = ambientStrength * lightColor;

    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(lightPos - vPosition);

    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;

    float specularStrength = 0.5;
    vec3 viewDir = normalize(viewPos - vPosition);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * lightColor;

    vec3 result = (ambient + diffuse + specular) * objectColor;
    FragColor = vec4(result, 1.0);
  }
`;
const lightFs = `#version 300 es

  #ifdef GL_ES
  precision mediump float;
  #endif

  out vec4 FragColor;

  void main(){
    FragColor = vec4(1.0);
  }
`;

let interval: any;

socket.on('compileFinished', (result: { success: boolean; wasm: string }) => {
	if (result.success) {
		logConsole('---------- START ----------');
		fetch(result.wasm)
			.then((response) => {
				webglPrograms = [];
				webglShaders = [];
				webglBuffers = [];
				webglUniformLoc = [];
				return response.arrayBuffer();
			})
			.then((bytes) => WebAssembly.instantiate(bytes, importObject))
			.then((results) => {
				clearInterval(interval);
				// console.log(gl?.drawingBufferHeight);
				let instance = results.instance;
				initShaderProgram(gl!, vsSource, fsSource);
				initShaderProgram(gl!, vsSource, lightFs);
				var first = performance.now();
				// document.getElementById("container").textContent = instance.exports.main();
				// Set the pixel data in the module's memory
				const memorySizeFunc = instance.exports.memorySize as CallableFunction;
				const mainFunc = instance.exports.main as CallableFunction;
				const loopFunc = instance.exports.loop as CallableFunction;

				memorySize = memorySizeFunc();
				// console.log(webglPrograms)
				mainFunc();
				const draw = () => {
					gl?.viewport(0, 0, canvas.width, canvas.height);
					loopFunc();
				};
				if (instance.exports.loop) interval = setInterval(draw, 1000 / 60);
				// console.log(performance.now() - first);
			})
			.catch(console.error);
	} else {
		logConsole('compile error', 'err');
	}
});
// ============ WebAssembly関係 ==========

// ロード完了 → ファイルツリーに反映
let currentContents: contentObject[] = [];
socket.on('loadedProject', (result: loadedProject) => {
	// プロジェクト名更新
	projectName = result.dir.name;
	$('#project-name-label').text(projectName);

	// ツリービュー
	parseDir(result.dir);

	// コンテンツ更新
	currentContents = result.contents;

	// editor-cover
	$('#editor-cover').show();

	// モーダル閉じる
	$('#overlay-load-project').removeClass('show');
});
interface contextObject {
	name: string;
	callback: EventListener;
}
function contextmenu(contexts: contextObject[], e: Event) {
	e.preventDefault();
	e.stopPropagation();
	const menu = $('#contextmenu');
	menu.html('');

	for (const context of contexts) {
		const item = $.parseHTML(`<a class="contextmenu-item">${context.name}</a>`)[0];
		item.addEventListener('click', context.callback);
		menu.append(item);
	}

	menu.css({ top: `${e.pageY}px`, left: `${e.pageX}px` });
}
$(() => {
	function closeContextMenu() {
		const menu = $('#contextmenu');
		menu.css({ top: `100vw`, left: `100vh` });
	}
	document.addEventListener('click', closeContextMenu);
	document.addEventListener('contextmenu', closeContextMenu);
});

const contextFile = (file: HTMLElement) => [
	{
		name: '名前の変更',
		callback: () => renameFile(file.dataset.path!),
	},
	{
		name: '削除',
		callback: () => deleteFile(file.dataset.path!),
	},
];
const contextRoot = [
	{
		name: '新規ファイル',
		callback: () => newFile('file', ''),
	},
	{
		name: '新規フォルダ',
		callback: () => newFile('folder', ''),
	},
];
const contextFolder = (file: HTMLElement) =>
	[
		{
			name: '新規ファイル',
			callback: () => newFile('file', file.dataset.path!),
		},
		{
			name: '新規フォルダ',
			callback: () => newFile('folder', file.dataset.path!),
		},
		// @ts-ignore
	].concat(contextFile(file));

let currentDir: dirObject = { name: 'Project1', type: 'folder', value: [] };
let currentFile: string = '';
function parseDir(dir: dirObject, openInfo: string[] = [], activeInfo: string = '') {
	const tree = (root: Element, dir: dirObject, path: string, nest = 0) => {
		if (!dir.value) return;
		dir.value.forEach((subdir) => {
			let file = document.createElement('li');
			file.innerText = subdir.name;
			const filePath = `${path}${subdir.name}`;
			file.dataset.path = filePath;
			file.style.paddingLeft = `${nest * 20 + 30}px`;
			file.classList.add('ui-dir');
			if (subdir.type === 'folder') {
				file.classList.add('ui-folder');
				file.addEventListener('click', () => file.classList.toggle('opened'));
				file.addEventListener('contextmenu', (e) => contextmenu(contextFolder(file), e));
				if (openInfo.includes(filePath)) file.classList.add('opened');
			}
			if (subdir.type === 'file') {
				file.classList.add('ui-file');
				file.addEventListener('click', () => loadFile(file.dataset.path!));
				file.addEventListener('contextmenu', (e) => contextmenu(contextFile(file), e));
				if (activeInfo === filePath) file.classList.add('active');
			}
			root.appendChild(file);

			if (subdir.type === 'folder') {
				let folder = document.createElement('ul');
				folder.classList.add('ui-folder-root');
				root.appendChild(folder);
				tree(folder, subdir, `${path}${subdir.name}/`, nest + 1);
			}
		});
	};
	const root = document.querySelector('#exp-view > ul');
	if (!root) return;
	root.innerHTML = '';

	const sortDir = dirSort(dir);

	projectName = sortDir.name;
	currentDir = sortDir;
	tree(root, sortDir, '');
}
const fileSort = (a: { type: 'file' | 'folder'; name: string }, b: { type: 'file' | 'folder'; name: string }) => {
	if (a.type === b.type) {
		return a.name.localeCompare(b.name, navigator.languages[0] || navigator.language, { numeric: true, ignorePunctuation: true });
	} else {
		if (a.type === 'file') {
			return 1;
		} else {
			return -1;
		}
	}
};
function dirSort(dir: dirObject) {
	const sortValue = (value: dirObject[]) => {
		value.sort(fileSort);
		for (const item of value.filter((item) => item.type === 'folder')) {
			sortValue(item.value!);
		}
	};
	const modDir: dirObject = JSON.parse(JSON.stringify(dir));

	sortValue(modDir.value!);

	return modDir;
}
$(() => {
	document.querySelector('.exp-view')!.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		e.stopPropagation();

		contextmenu(contextRoot, e);
	});
});

function renameFile(filePath: string) {
	const pathList = filePath.split('/');
	const filename = pathList.pop();
	const dir = pathList.join('/');
	openModal('名前の変更', '', [{ id: 'name', name: '変更後の名前', placeholder: filename, required: true }], getInitialButtonWithName('変更'), () => {
		const rmFilename = $('#modal-field-name').val()!.toString();
		if (rmFilename.indexOf('/') > -1) {
			return {
				success: false,
				err: [
					{
						id: 'name',
						message: '使用不可能文字(/)が含まれています',
					},
				],
			};
		} else {
			const rmFilePath = `${dir ? dir + '/' : ''}${rmFilename}`;
			if ($(`.exp-view li[data-path="${rmFilePath}"]`).length > 0) {
				return {
					success: false,
					err: [
						{
							id: 'name',
							message: `${rmFilename} というファイルまたはフォルダはこの場所に既に存在します。別の名前を指定してください。`,
						},
					],
				};
			} else {
				renameDir(filePath, rmFilename, rmFilePath);
				return { success: true };
			}
		}
	});
}
function deleteFile(filePath: string) {
	const filename = filePath.split('/').slice(-1)[0];
	openModal('ファイル/フォルダの削除', `${filename} を削除します。削除されたファイルは失われ、復元することはできません。本当に削除してよろしいですか？`, [], getInitialButtonWithName('削除'), () => {
		deleteDir(filePath);
		return { success: true };
	});
}
function newFile(type: 'file' | 'folder', dir: string) {
	const name = type === 'file' ? 'ファイル' : 'フォルダ';
	openModal(`新規${name}作成`, `作成されるディレクトリ：${dir}/`, [{ id: 'name', name: `${name}名`, required: true }], getInitialButtonWithName('作成'), () => {
		const filename = $('#modal-field-name').val()!.toString();
		const filePath = `${dir ? dir + '/' : ''}${filename}`;
		if (filename.indexOf('/') > -1) {
			return {
				success: false,
				err: [
					{
						id: 'name',
						message: '使用不可能文字(/)が含まれています',
					},
				],
			};
		} else {
			if ($(`.exp-view li[data-path="${filePath}"]`).length > 0) {
				return {
					success: false,
					err: [
						{
							id: 'name',
							message: `${filename} というファイルまたはフォルダはこの場所に既に存在します。別の名前を指定してください。`,
						},
					],
				};
			} else {
				newDir(type, filename, dir);
				return { success: true };
			}
		}
	});
}

function getDirFromPath(path: string, dir: dirObject, lastNode = 0) {
	const pathList = path.split('/');
	let dirObj = dir;
	for (let i = 0; i < pathList.length - lastNode; i++) {
		let value = dirObj.value!.filter((item) => item.name === pathList[i]);
		if (value.length > 0) {
			dirObj = value[0];
		} else {
			console.error('Cannot find path while searching directory');
			return;
		}
	}
	return dirObj;
}
function getOpenInfo() {
	let openInfo: string[] = [];
	$('.exp-view > ul li.opened').each(function () {
		openInfo.push(this.dataset.path!);
	});
	return openInfo;
}
function getActiveInfo() {
	return $('.exp-view > ul li.active').attr('data-path')!;
}

function renameDir(oldPath: string, newFilename: string, newPath: string) {
	if (oldPath === currentFile) {
		currentFile = newPath;
		$('#footer-filename').text(newFilename);
	}
	const dirObj = getDirFromPath(oldPath, currentDir);
	if (dirObj) {
		dirObj.name = newFilename;
		currentContents.filter((content) => content.path === oldPath)[0].path = newPath;
		$(`.exp-view li[data-path="${oldPath}"]`).text(newFilename);
		(document.querySelector(`.exp-view li[data-path="${oldPath}"]`)! as HTMLElement).dataset.path = newPath;
	}
}
function deleteDir(path: string) {
	if (currentFile === path) closeFile();
	const dirObj = getDirFromPath(path, currentDir, 1);
	if (dirObj) {
		currentContents = currentContents.filter((content) => content.path !== path);
		const name = path.split('/').slice(-1)[0];
		dirObj.value! = dirObj.value!.filter((item) => item.name !== name);
		$(`.exp-view li[data-path="${path}"]`).remove();
	}
}
function newDir(type: 'file' | 'folder', name: string, dir: string) {
	const dirObj = dir === '' ? currentDir : getDirFromPath(dir, currentDir);
	if (dirObj) {
		const path = `${dir ? dir + '/' : ''}${name}`;
		currentContents.push({
			path: path,
			content: '',
		});
		dirObj.value!.push({
			name: name,
			type: type,
			value: type === 'folder' ? [] : undefined,
		});
		if (dir) $(`.exp-view > ul li[data-path="${dir}"]`).addClass('opened');
		parseDir(currentDir, getOpenInfo(), getActiveInfo());
	}
}

function loadFile(path: string) {
	closeFileWarn(() => {
		$('#editor-cover').hide();
		currentFile = path;
		$('#footer-filename').text(path.split('/').slice(-1)[0]);
		const content = currentContents.filter((content) => content.path === path);
		if (content.length > 0) {
			editor.getModel()?.setValue(content[0].content);
			$('.current-file').removeClass(['nofile', 'unsaved']);

			// active切り替え
			$('.ui-dir.active').removeClass('active');
			$(`.ui-dir[data-path="${path}"]`).addClass('active');
		} else {
			console.error(`Cannot read file ${path}`);
		}
	});
}
function closeFile() {
	$('#editor-cover').show();
	currentFile = '';
	$('.current-file').addClass('nofile');
	$('.exp-view li.active').removeClass('active');
}

function closeFileWarn(callback: Function) {
	if ($('.current-file').hasClass('unsaved')) {
		openModal(
			'ファイルを閉じる',
			`${currentFile}は保存されていませんが、これを閉じようとしています。閉じた場合このファイルに加えた変更は失われます。本当に閉じてよろしいですか？`,
			[],
			[
				{ id: 'cancel', name: 'キャンセル', role: 'cancel', icon: '/assets/icons/icons.svg#cross' },
				{
					id: 'save',
					name: '保存しないで閉じる',
					icon: '/assets/icons/icons.svg#trash',
					callback: () => {
						$('#modal').removeClass('show');
						callback();
					},
				},
				{ id: 'enter', name: '保存して閉じる', role: 'submit', icon: '/assets/icons/icons.svg#save' },
			],
			() => {
				save(editor.getValue());
				callback();
				return { success: true };
			}
		);
	} else {
		callback();
	}
}
$('#footer-fileclose').on('click', () => closeFileWarn(closeFile));
editor.onDidChangeModelContent(() => $('.current-file').addClass('unsaved'));

interface field {
	id: string;
	name: string;
	type?: string;
	options?: string[];
	value?: string;
	required?: boolean;
	placeholder?: string;
	disabled?: boolean;
}
interface Button {
	id: string;
	name: string;
	role?: string;
	icon?: string;
	callback?: Function;
}
const getInput = (field: field) => {
	if (field.type === 'select') {
		return `<select name="${field.id}" id="modal-field-${field.id}">
			${field.options!.map((option) => '<option value="' + option + '">' + option + '</option>').join('')}
		</select>`;
	} else {
		return `<input
			id="modal-field-${field.id}"
			${field.required ? 'required' : ''}
			${field.disabled ? 'disabled' : ''}
			placeholder="${field.placeholder || ''}"
			value="${field.value || ''}"
			type="text"
			class="browser-default"
			autocomplete="off"
			spellcheck="false"
			/>`;
	}
};
const initialButtons = [
	{ id: 'cancel', name: 'キャンセル', role: 'cancel', icon: '/assets/icons/icons.svg#cross' },
	{ id: 'enter', name: '決定', role: 'submit', icon: '/assets/icons/icons.svg#check' },
];
const getInitialButtonWithName = (name: string) => {
	let result: Button[] = JSON.parse(JSON.stringify(initialButtons));
	result[1]!.name = name;
	return result;
};
function openModal(title: string, description: string, fields: field[], buttons: Button[] = initialButtons, callback: Function) {
	$('#modal .title').text(title);
	$('#modal .description').text(description);
	$('#modal .fields').html('');
	for (const field of fields) {
		$('#modal .fields').append(`<div class="field"><label for="modal-field-${field.id}">${field.name}</label>` + getInput(field) + '<small class="warning"></small></div>');
	}
	setTimeout(() => {
		$('#modal .fields .field:first-child input').trigger('focus');
	}, 200);

	$('#modal .buttons').html('');
	for (const button of buttons) {
		const btnElement = $(`
			<button
				id="modal-${button.id}"
				type="${button.role === 'submit' ? 'submit' : 'button'}"
			>
				<svg viewBox="0 0 64 64">
					<use xlink:href="${button.icon}"></use>
				</svg>
				<span>${button.name}</span>
			</button>`)[0];
		if (button.callback) btnElement.addEventListener('click', () => button.callback!());
		if (button.role === 'cancel') btnElement.addEventListener('click', () => $('#modal').removeClass('show'));
		$('#modal .buttons').append(btnElement);
	}

	$('#modal-form').off('submit');
	$('#modal-form').on('submit', () => {
		try {
			const result = callback();
			if (result.success) {
				$('#modal').removeClass('show');
			} else {
				if (result.err) {
					for (const err of result.err) {
						$(`#modal-field-${err.id} + small`).text(err.message);
					}
				}
			}
		} catch (error) {
			console.error(error);
		} finally {
			return false;
		}
	});
	$('#modal').addClass('show');
}
$(() => {
	$('#modal-back').on('click', () => $('#modal').removeClass('show'));
	$(document).on('keydown', (e) => (e.key === 'Escape' ? $('#modal').removeClass('show') : null));

	// サンプル読み込み
	$('#btn-sample').on('click', () => {
		fetch('/samplelist')
			.then((res) => res.json())
			.then((res) => {
				openModal(
					'読み込むサンプルを選択',
					'以下の中から読み込むサンプルを選択してください',
					[{ id: 'sample', name: 'サンプル', type: 'select', options: res }],
					getInitialButtonWithName('読み込み'),
					() => {
						const value = $('#modal-field-sample').val()!.toString();
						socket.emit('loadProject', { projectName: value });
						return {
							success: true,
						};
					}
				);
			});
	});
});
