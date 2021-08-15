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
	$('#btn-load').on('click', loadProject);
	$('#btn-save').on('click', () => save(editor.getValue()));
	$('#btn-compile').on('click', () => compile(editor));
	$('#btn-newproject').on('click', newProject);
	$('#btn-newfile').on('click', () => newFile('file', ''));

	// newProject
	$('#project-name').on('keyup', () => ($('#project-name').val() ? $('#setname-submit').prop('disabled', false) : $('#setname-submit').prop('disabled', true)));
	$('#setname-cancel').on('click', setNameCancel);
	$('#setname').on('submit', setNewProjectName);
	// loadProject
	$('#selectname-cancel').on('click', selectNameCancel);
	$('#selectname').on('submit', selectName);

	// modal close
	$(document).on('keydown', (e) => {
		if (e.key === 'Escape') {
			$('.overlay').removeClass('show');
		}
	});

	const adjustCanvasSize = (direction: 'x' | 'y') => {
		if (direction === 'x') {
			(document.querySelector('.editor-console') as HTMLElement)!.style.height = (canvas.clientWidth * 9) / 16 + document.querySelector('.editor-output-label')!.clientHeight + 'px';
		} else {
			(document.querySelector('.editor-output') as HTMLElement)!.style.width = document.querySelector('.editor-console')!.clientWidth - (canvas.clientHeight * 16) / 9 + 'px';
		}
		return true;
	};

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
		handleSelector: '.editor-output-spliter',
		resizeHeight: false,
	});

	const canvas = <HTMLCanvasElement>document.getElementById('output-canvas');
	canvas.width = 1280;
	canvas.height = 720;

	// アカウントのステータス更新
	updateAccount();

	// ファイルロード
	socket.on('loadedFile', (result: { fileContent: string; logValue: string; style: string }) => {
		editor.setValue(result.fileContent);
		logConsole(result.logValue, result.style);
	});
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
let editFileName = 'test.lang';
let projectName = 'Project1';
let account = {
	id: 'guest',
	username: 'ゲスト',
	avatar: '',
};

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
	outputArea.scrollTop = outputArea.scrollHeight;

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

// 保存済み
socket.on('saved', (result: saveResult) => {
	// ログ
	logConsole(result.value, result.style);

	// ポップアップ
	logPopup(result.value, result.style);
});

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
let infoObject = {
	x: 0.0,
	y: 0.0,
	size: 0,
	mousePressed: false,
};
let lastDownTarget: EventTarget | null;
let pressedKeys = new Array(256);
window.onload = function () {
	for (let i = 0; i < 256; i++) {
		pressedKeys[i] = false;
	}
	infoObject.mousePressed = false;
	document.addEventListener(
		'mousedown',
		(e) => {
			infoObject.mousePressed = true;
			lastDownTarget = e.target;
		},
		false
	);
	document.addEventListener(
		'mouseup',
		(e) => {
			if (e.target === canvas) {
				infoObject.mousePressed = false;
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
	infoObject.x += e.movementX;
	infoObject.y += e.movementY;
}

// ============ WebAssembly関係 ==========

// @ts-ignore
import importObjectFunc from './importObject.js';

let gl = canvas.getContext('webgl2');
let importObject = importObjectFunc(gl, pressedKeys, infoObject, logConsole).importObject;
const initShaderProgram = importObjectFunc(gl, pressedKeys, infoObject, logConsole).initShaderProgram;
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

socket.on('compileFinished', (result: { success: boolean; wasm: string }) => {
	if (result.success) {
		logConsole('---------- START ----------');
		fetch(result.wasm)
			.then((response) => {
				canvas = <HTMLCanvasElement>document.getElementById('output-canvas');
				gl = canvas.getContext('webgl2');
				return response.arrayBuffer();
			})
			.then((bytes) => WebAssembly.instantiate(bytes, importObject))
			.then((results) => {
				console.log(gl?.drawingBufferHeight);
				let instance = results.instance;
				initShaderProgram(gl, vsSource, fsSource);
				initShaderProgram(gl, vsSource, lightFs);
				var first = performance.now();
				// document.getElementById("container").textContent = instance.exports.main();
				// Set the pixel data in the module's memory
				const memorySizeFunc = instance.exports.memorySize as CallableFunction;
				const mainFunc = instance.exports.main as CallableFunction;
				const loopFunc = instance.exports.loop as CallableFunction;

				infoObject.size = memorySizeFunc();
				mainFunc();
				const draw = () => {
					gl?.viewport(0, 0, 512, 512);
					loopFunc();
				};
				if (instance.exports.loop) setInterval(draw, 1000 / 60);
				console.log(performance.now() - first, performance.now());
			})
			.catch(console.error);
	} else {
		logConsole('compile erorr', 'err');
	}
});
// ============ WebAssembly関係 ==========

// プロジェクトの作成をキャンセル
function setNameCancel() {
	$('#overlay-create-project').removeClass('show');
	$('#setname').off('submit');
}
function selectNameCancel() {
	$('#overlay-load-project').removeClass('show');
	$('#selectname').off('submit');
}

// プロジェクトのロード
function loadProject() {
	fetch(`/projectlist?user=${account.id}`)
		.then((result) => result.json())
		.then((result: string[]) => {
			result.forEach((projectName) => {
				$('#project-selecter').append(`<option value="${projectName}">${projectName}</option>`);
			});
			$('#overlay-load-project').addClass('show');
		});
	$('#project-selecter').html('');
}
function selectName() {
	const projectName = $('#project-selecter').val()?.toString();
	if (projectName) {
		socket.emit('loadProject', {
			projectName: projectName,
		});
		$('.overlay').removeClass('show');
	}
	return false;
}

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
	openModal('名前の変更', '', [{ id: 'name', name: '変更後の名前', placeholder: filename, required: true }], () => {
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
	openModal('ファイル/フォルダの削除', `${filename} を削除します。削除されたファイルは失われ、復元することはできません。本当に削除してよろしいですか？`, [], () => {
		deleteDir(filePath);
		return { success: true };
	});
}
function newFile(type: 'file' | 'folder', dir: string) {
	const name = type === 'file' ? 'ファイル' : 'フォルダ';
	openModal(`新規${name}作成`, `作成されるディレクトリ：${dir}/`, [{ id: 'name', name: `${name}名`, required: true }], () => {
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
}
function closeFile() {
	$('#editor-cover').show();
	currentFile = '';
	$('.current-file').addClass('nofile');
	$('.exp-view li.active').removeClass('active');
}
function closeFileWarn() {
	if ($('.current-file').hasClass('unsaved')) {
		openModal('ファイルを閉じる', `${currentFile}は保存されていませんが、これを閉じようとしています。閉じた場合このファイルに加えた変更は失われます。本当に閉じてよろしいですか？`, [], closeFile);
	} else {
		closeFile();
	}
}
$('#footer-fileclose').on('click', closeFileWarn);
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
function openModal(title: string, description: string, fields: field[], callback: Function) {
	$('#modal .title').text(title);
	$('#modal .description').text(description);
	$('#modal .fields').html('');
	for (const field of fields) {
		$('#modal .fields').append(`<div class="field"><label for="modal-field-${field.id}">${field.name}</label>` + getInput(field) + '<small class="warning"></small></div>');
	}
	setTimeout(() => {
		$('#modal .fields .field:first-child input').trigger('focus');
	}, 200);

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
	$('#modal-cancel').on('click', () => $('#modal').removeClass('show'));
	$('#modal-back').on('click', () => $('#modal').removeClass('show'));
	$(document).on('keydown', (e) => (e.key === 'Escape' ? $('#modal').removeClass('show') : null));

	// サンプル読み込み
	$('#btn-sample').on('click', () => {
		fetch('/samplelist')
			.then((res) => res.json())
			.then((res) => {
				openModal('読み込むサンプルを選択', '以下の中から読み込むサンプルを選択してください', [{ id: 'sample', name: 'サンプル', type: 'select', options: res }], () => {
					const value = $('#modal-field-sample').val()!.toString();
					socket.emit('loadProject', { projectName: value });
					return {
						success: true,
					};
				});
			});
	});
});

// 新しいプロジェクト
function newProject() {
	$('#project-name').val('');
	$('#setname-submit').prop('disabled', true);
	$('#project-name-warning').text('');
	$('#overlay-create-project').addClass('show');
}
function setNewProjectName() {
	const projectName = $('#project-name').val()?.toString();
	if (projectName) {
		if (projectName.indexOf('/') > -1) {
			$('#project-name-warning').text('/は使えません');
		} else {
			socket.emit('newProject', {
				projectName: projectName,
			});
			$('.overlay').removeClass('show');
		}
	}
	return false;
}
socket.on('newProjectCreated', (result: { success: boolean; value: string; style: string; projectName: string }) => {
	logConsole(result.value, result.style);
	if (result.success)
		socket.emit('loadProject', {
			projectName: result.projectName,
		});
});

// ログインイベント
socket.on('login', (data: userData) => {
	account = data;
	updateAccount();
});

// アカウントのステータス更新
function updateAccount() {
	// 名前
	$('#account-name').text(account.username);
	// アバター画像
	$('#avatar-img').attr('src', `/avatar/id?id=${account.id}`);
	// ドロップダウン更新
	const accountMenu = $('ul[aria-labelledby="account-menu"]');
	if (account.id === 'guest') {
		accountMenu.removeClass('user');
		accountMenu.addClass('guest');
	} else {
		accountMenu.addClass('user');
		accountMenu.removeClass('guest');
	}
}
