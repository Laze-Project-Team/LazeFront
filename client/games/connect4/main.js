var connection;
var userId = "";
var userNum = 0;
let first = true;
var connectedUser, myConnection;
let whenqueued = -1;

let lazeCall = (a) => { };
let lazeCallNoParam = (a) => { };

//when a user logs in 
function onLogin(success, id) {

    if (success === false) {
        alert("oops...try a different username");
    } else {
        userId = id;
        console.log(userId);

        //creating our RTCPeerConnection object 

        var configuration = {
            "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
        };

        myConnection = new webkitRTCPeerConnection(configuration);
        console.log("RTCPeerConnection object was created");
        console.log(myConnection);

        //setup ice handling
        //when the browser finds an ice candidate we send it to another peer 
        myConnection.onicecandidate = function (event) {

            if (event.candidate) {
                send({
                    type: "candidate",
                    candidate: event.candidate
                });
            }
        };
    }
};

// Alias for sending messages in JSON format 
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }

    connection.send(JSON.stringify(message));
};

//setup a peer connection with another user 
function connectToUser(otherUsername) {

    connectedUser = otherUsername;

    if (otherUsername.length > 0) {
        //make an offer 
        myConnection.createOffer(function (offer) {
            console.log();
            send({
                type: "offer",
                offer: offer
            });

            myConnection.setLocalDescription(offer);
        }, function (error) {
            alert("An error has occurred.");
        });
    }
}

//when somebody wants to call us 
function onOffer(offer, name) {
    userNum = 2;
    if (whenqueued > 0)
        lazeCallNoParam(whenqueued);
    connectedUser = name;
    myConnection.setRemoteDescription(new RTCSessionDescription(offer));

    myConnection.createAnswer(function (answer) {
        myConnection.setLocalDescription(answer);
        send({
            type: "answer",
            answer: answer
        });

    }, function (error) {
        alert("oops...error");
    });
}

//when another user answers to our offer  
function onAnswer(answer) {
    userNum = 1;
    if (whenqueued > 0)
        lazeCallNoParam(whenqueued);
    myConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

//when we got ice candidate from another user 
function onCandidate(candidate) {
    myConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

let eventHandlers = {};
let eventHandlerAddress = {};

const memory = new WebAssembly.Memory({ initial: 17 });
const c = document.getElementById('canvas');
const gl = c.getContext('webgl');
const vsSource =
    `
  attribute vec3 aVertexPosition;
  attribute vec2 aTexCoord;

  uniform mat4 model;
  uniform mat4 projection;

  varying highp vec2 vTexCoord; 
  void main() {
    gl_Position = model * projection * vec4(aVertexPosition, 1.0);
    vTexCoord = aTexCoord;
  }
`;
const fsSource =
    `
  varying highp vec2 vTexCoord;

  uniform sampler2D uSampler;

  void main() {
    gl_FragColor = texture2D(uSampler, vTexCoord);
  }
`;
const vsSource1 =
    `
  attribute vec2 aVertexPosition;

  uniform mat4 model;
  uniform mat4 projection;

  void main() {
    gl_Position = model * projection * vec4(aVertexPosition, 0.0, 1.0);
  }
`;
const fsSource1 =
    `
 uniform highp vec3 objectColor;
 uniform highp float transparency;

  void main() {
    gl_FragColor = vec4(objectColor, transparency);
  }
`;
const vsCircleSource =
    `
uniform vec2 u_resolution;
attribute vec2 a_position;
attribute vec2 a_center;
attribute float a_radius;

varying vec2 center;
varying vec2 resolution;
varying float radius;
 
void main() {
  vec2 clipspace = a_position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clipspace * vec2(1, -1), 0, 1);
  radius = a_radius;
  center = a_center;
  resolution = u_resolution;
}
`;
const fsCircleSource =
    `
precision mediump float;

varying vec2 center;
varying vec2 resolution;
varying float radius;
void main() {
  vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
  float x = gl_FragCoord.x;
  float y = resolution[1] - gl_FragCoord.y;
  float dx = center[0] - x;
  float dy = center[1] - y;
  float distance = sqrt(dx*dx + dy*dy);
  if ( distance < radius )
    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
  else 
    gl_FragColor = color0;
}
`

//WebGLProgram
let webglPrograms = [];
//WebGLShader
let webglShaders = [];
//WebGLBuffer
let webglBuffers = [];
let webglUniformLoc = [];
let webglTextures = [];

let lastDownTarget;
let pressedKeys = new Array(256);
let mousePressed;

let memorySize = 0;

window.onload = function () {
    for (let i = 0; i < 256; i++) {
        pressedKeys[i] = false;
    }
    mousePressed = false;
    document.addEventListener('mousedown', (e) => {
        mousePressed = true;
        lastDownTarget = e.target;
    }, false);
    document.addEventListener('mouseup', (e) => {
        mousePressed = false;
    }, false);
    document.addEventListener('keydown', (e) => {
        if (lastDownTarget === c) {
            pressedKeys[e.keyCode] = true;
        }
    }, false);
    document.addEventListener('keyup', (e) => {
        if (lastDownTarget === c) {
            pressedKeys[e.keyCode] = false;
        }
    }, false);
    c.addEventListener("mousemove", updatePosition, false);
};

let mouseX = 0.0;
let mouseY = 0.0;

function updatePosition(e) {
    mouseX = ((e.clientX - c.getBoundingClientRect().left) - c.clientWidth / 2) / (c.clientWidth / 2);
    mouseY = -(((e.clientY - c.getBoundingClientRect().top) - c.clientHeight / 2) / (c.clientHeight / 2));
}

function strToMem(str) {
    let resultBytes = new Uint8Array(str.length * 4);
    let bytes = new TextEncoder('utf-8').encode(str);
    for (let i = 0, j = 0; i < bytes.length;) {
        resultBytes[j] = bytes[i];
        if (bytes[i] >= 128) {
            resultBytes[j + 1] = bytes[i + 1];
            resultBytes[j + 2] = bytes[i + 2];
            resultBytes[j + 3] = 0;
            i += 3;
            j += 4;
        }
        else {
            resultBytes[j + 1] = 0;
            resultBytes[j + 2] = 0;
            resultBytes[j + 3] = 0;
            i++;
            j += 4;
        }
    }
    let temp = memorySize;
    let memoryBuffer = new Uint8Array(memory.buffer, memorySize, 12);
    memorySize += 12;
    memoryBuffer.set([memorySize, 0, 0, 0, str.length, 0, 0, 0, 0, 0, 0, 0], 0);
    let helloBytes = new Uint8Array(memory.buffer, memorySize, str.length * 4);
    helloBytes.set(resultBytes, 0);
    memorySize += str.length * 4;
    console.log(temp);
    return temp;
}

let callback = () => {
    console.log('つながった');
}

    var importObject = {
        console:
        {
            log: function (arg) {
                // var char = new Uint8Array([Math.floor((arg/256)/256), Math.floor((arg%(256*256))/256), Math.floor((arg%(256*256))%256)]);
                // char = char.filter(char => char != 0);
                // console.log(new TextDecoder('utf-8').decode(char));
                console.log(Number(arg));
            },
            logstring: function (offset, length) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                let string = new TextDecoder('utf-8').decode(bytes);
                console.log(string);
            },
            logMatrix: function (offset) {
                const buffer = memory.buffer.slice(offset, 128 + offset);
                const f64Array = new Float64Array(buffer);
                const f32Array = Float32Array.from(f64Array);
                console.log(f32Array);
            }
        },
        performance:
        {
            now: function () {
                return performance.now();
            }
        },
        js:
        {
            mem: memory,
            checkKeyPress: function (keyCode) {
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
            alloc: function (size) {
                let temp = memorySize;
                memorySize += size;
                return temp;
            },
            getHelloWorld: function () {
                return strToMem(helloworld);
            },
            lockPointer: function () {
                c.requestPointerLock = c.requestPointerLock || c.mozRequestPointerLock;
                document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

                c.onclick = function () {
                    c.requestPointerLock();
                };

                document.addEventListener('pointerlockchange', lockChangeAlert, false);
                document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

                function lockChangeAlert() {
                    if (document.pointerLockElement === canvas ||
                        document.mozPointerLockElement === canvas) {
                        console.log('The pointer lock status is now locked');

                    } else {
                        console.log('The pointer lock status is now unlocked');
                    }
                }
            },
            connectedCallback: callback
        },
        p2p: {
            connectP2P: function (offset, length, index) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                let string = new TextDecoder('utf-8').decode(bytes);
                connection = new WebSocket(string);
                //handle messages from the server 
                connection.onmessage = function (message) {
                    var data = JSON.parse(message.data);

                    switch (data.type) {
                        case "login":
                            onLogin(data.success, data.userId);
                            lazeCallNoParam(index);
                            break;
                        case "joinQueue":
                            connectToUser(data.userId);
                            break;
                        case "offer":
                            onOffer(data.offer, data.name);
                            break;
                        case "answer":
                            onAnswer(data.answer);
                            break;
                        case "candidate":
                            onCandidate(data.candidate);
                            break;
                        default:
                            if (eventHandlers.hasOwnProperty(data.type)) {
                                dataBytes = Uint8Array.from(data.data);
                                var bytes = new Uint8Array(memory.buffer, memorySize, dataBytes.byteLength);
                                bytes.set(dataBytes, 0);
                                lazeCall(eventHandlers[data.type], memorySize);
                            }
                            // tempFunc(strToMem(data.type));
                            break;
                    }
                };
                connection.onopen = function () {
                    console.log("Connected");
                    send({
                        type: 'login'
                    })
                };

                connection.onerror = function (err) {
                    console.log("Got error", err);
                };
                first = false;
            },
            joinRandomQueue: function (index) {
                send({
                    type: 'joinQueue'
                });
                whenqueued = index;
            },
            addEventHandler: function (offset, length, funcIndex) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                let string = new TextDecoder('utf-8').decode(bytes);
                eventHandlers[string] = funcIndex;
            },
            send: function (offset, length, objOffset, objLength) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                let string = new TextDecoder('utf-8').decode(bytes);
                var sendData = new Uint8Array(memory.buffer, objOffset, Number(objLength) * 4);
                send({
                    type: string,
                    data: Array.from(sendData)
                });
            },
            getUserNum: function () {
                return userNum;
            }
        },
        webgl:
        {
            clearColor: function (r, g, b, a) {
                gl.clearColor(r, g, b, a);
            },
            clear: function (i) {
                gl.clear(i);
            },
            clearDepth: function (i) {
                gl.clearDepth(i);
            },
            depthFunc: function (i) {
                gl.depthFunc(i);
            },
            blendFunc: function (i, j) {
                gl.blendFunc(i, j);
            },
            enable: function (i) {
                gl.enable(i);
            },
            vertexAttribPointer: function (index, size, type, normalized, stride, offset) {
                gl.vertexAttribPointer(index, size, type, false, stride, offset);
            },
            enableVertexAttribArray: function (index) {
                gl.enableVertexAttribArray(index);
            },
            disable: function (i) {
                gl.disable(i);
            },
            createProgram: function () {
                webglPrograms.push(gl.createProgram());
                return webglPrograms.length - 1;
            },
            createBuffer: function () {
                webglBuffers.push(gl.createBuffer());
                return webglBuffers.length - 1;
            },
            bindBuffer: function (i, j) {
                gl.bindBuffer(i, webglBuffers[j]);
            },
            bufferData: function (i, offset, size, j) {
                const buffer = memory.buffer.slice(offset, size * 8 + offset);
                const f64Array = new Float64Array(buffer);
                const f32Array = Float32Array.from(f64Array);
                gl.bufferData(i, f32Array, j);
            },
            elementBufferData: function (i, offset, size, j) {
                const i32Array = new Uint32Array(memory.buffer, offset, size);
                const i16Array = Uint16Array.from(i32Array);
                console.log(i16Array);
                gl.bufferData(i, i16Array, j);
            },
            useProgram: function (i) {
                gl.useProgram(webglPrograms[i]);
            },
            getAttribLocation: function (i, offset, length) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                // bytes.reverse();
                bytes = bytes.filter(element => element != 0);
                var string = new TextDecoder('utf-8').decode(bytes);
                // string = [...string].reverse().join("");
                return gl.getAttribLocation(webglPrograms[i], string);
            },
            getUniformLocation: function (i, offset, length) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                var string = new TextDecoder('utf-8').decode(bytes);
                webglUniformLoc.push(gl.getUniformLocation(webglPrograms[i], string));
                return webglUniformLoc.length - 1;
            },
            uniformMatrix2fv: function (i, transpose, offset) {
                const f64Array = new Float64Array(memory.buffer, offset, 4);
                const f32Array = Float32Array.from(f64Array);
                gl.uniformMatrix2fv(webglUniformLoc[i], transpose, f32Array);
            },
            uniformMatrix3fv: function (i, transpose, offset) {
                const f64Array = new Float64Array(memory.buffer, offset, 9);
                const f32Array = Float32Array.from(f64Array);
                gl.uniformMatrix3fv(webglUniformLoc[i], transpose, f32Array);
            },
            uniformMatrix4fv: function (i, transpose, offset) {
                const buffer = memory.buffer.slice(offset, 128 + offset);
                const f64Array = new Float64Array(buffer);
                const f32Array = Float32Array.from(f64Array);
                gl.uniformMatrix4fv(webglUniformLoc[i], transpose, f32Array);
            },
            uniform1f: function (i, v0) {
                gl.uniform1f(webglUniformLoc[i], v0);
            },
            uniform1fv: function (i, v0) {
                gl.uniform1fv(webglUniformLoc[i], v0);
            },
            uniform1i: function (i, v0) {
                gl.uniform1i(webglUniformLoc[i], v0);
            },
            uniform1iv: function (i, v0) {
                gl.uniform1iv(webglUniformLoc[i], v0);
            },

            uniform2f: function (i, v0, v1) {
                gl.uniform2f(webglUniformLoc[i], v0, v1);
            },
            uniform2fv: function (i, v0, v1) {
                gl.uniform2fv(webglUniformLoc[i], v0, v1);
            },
            uniform2i: function (i, v0, v1) {
                gl.uniform2i(webglUniformLoc[i], v0, v1);
            },
            uniform2iv: function (i, v0, v1) {
                gl.uniform2iv(webglUniformLoc[i], v0, v1);
            },

            uniform3f: function (i, v0, v1, v2) {
                gl.uniform3f(webglUniformLoc[i], v0, v1, v2);
            },
            uniform3fv: function (i, v0, v1, v2) {
                gl.uniform3fv(webglUniformLoc[i], v0, v1, v2);
            },
            uniform3i: function (i, v0, v1, v2) {
                gl.uniform3i(webglUniformLoc[i], v0, v1, v2);
            },
            uniform3iv: function (i, v0, v1, v2) {
                gl.uniform3iv(webglUniformLoc[i], v0, v1, v2);
            },

            uniform4f: function (i, v0, v1, v2, v3) {
                gl.uniform4f(webglUniformLoc[i], v0, v1, v2, v3);
            },
            uniform4fv: function (i, v0, v1, v2, v3) {
                gl.uniform4fv(webglUniformLoc[i], v0, v1, v2, v3);
            },
            uniform4i: function (i, v0, v1, v2, v3) {
                gl.uniform4i(webglUniformLoc[i], v0, v1, v2, v3);
            },
            uniform4iv: function (i, v0, v1, v2, v3) {
                gl.uniform4iv(webglUniformLoc[i], v0, v1, v2, v3);
            },
            drawArrays: function (i, first, count) {
                // console.log(i);
                gl.drawArrays(i, first, count);
            },
            uniform4i: function (i, v0, v1, v2, v3) {
                gl.uniform4i(webglUniformLoc[i], v0, v1, v2, v3);
            },
            uniform4iv: function (i, v0, v1, v2, v3) {
                gl.uniform4iv(webglUniformLoc[i], v0, v1, v2, v3);
            },
            drawArrays: function (i, first, count) {
                // console.log(i);
                gl.drawArrays(i, first, count);
            },
            drawElements: function (i, count, type, offset) {
                gl.drawElements(i, count, type, offset);
            },
            loadTexture: function (offset, length) {
                var bytes = new Uint8Array(memory.buffer, offset, Number(length) * 4);
                bytes = bytes.filter(element => element != 0);
                var string = new TextDecoder('utf-8').decode(bytes);
                return _loadTexture(gl, string);
            },
            activeTexture: function (i) {
                gl.activeTexture(i);
            },
            bindTexture: function (i, j) {
                gl.bindTexture(i, webglTextures[j]);
            }
        }
    }



    //
    // Initialize a shader program, so WebGL knows how to draw our data
    //
    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        // Create the shader program

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // If creating the shader program failed, alert

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        webglPrograms.push(shaderProgram);
        return shaderProgram;
    }

    //
    // creates a shader of the given type, uploads the source and
    // compiles it.
    //
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);

        // Send the source to the shader object

        gl.shaderSource(shader, source);

        // Compile the shader program

        gl.compileShader(shader);

        // See if it compiled successfully

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function _loadTexture(gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Because images have to be downloaded over the internet
        // they might take a moment until they are ready.
        // Until then put a single pixel in the texture so we can
        // use it immediately. When the image has finished downloading
        // we'll update the texture with the contents of the image.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            width, height, border, srcFormat, srcType,
            pixel);

        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                srcFormat, srcType, image);

            // WebGL1 has different requirements for power of 2 images
            // vs non power of 2 images so check if the image is a
            // power of 2 in both dimensions.
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                // Yes, it's a power of 2. Generate mips.
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // No, it's not a power of 2. Turn off mips and set
                // wrapping to clamp to edge
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = url;

        webglTextures.push(texture);
        return webglTextures.length - 1;
    }

    function isPowerOf2(value) {
        return (value & (value - 1)) == 0;
    }

    const draw = () => {
        instance.exports.loop();
    };

    let interval;

    fetch('./laze.wasm').then(response =>
        response.arrayBuffer()
    ).then(bytes => WebAssembly.instantiate(bytes, importObject)).then(results => {

        instance = results.instance;
        lazeCall = instance.exports.jsCallListener;
        lazeCallNoParam = instance.exports.jsCallListenerNoParam;

        initShaderProgram(gl, vsSource, fsSource);
        initShaderProgram(gl, vsSource1, fsSource1);
        initShaderProgram(gl, vsCircleSource, fsCircleSource);
        var first = performance.now();
        // document.getElementById("container").textContent = instance.exports.main();
        // Set the pixel data in the module's memory
        memorySize = instance.exports.memorySize();
        instance.exports.main();
        if (instance.exports.loop)
            setInterval(instance.exports.loop, 1000 / 60);
        console.log(performance.now() - first, performance.now());
    }).catch(console.error);
