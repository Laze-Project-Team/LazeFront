let importObject;
const memory = new WebAssembly.Memory({ initial: 17 });
let mouseX = 0.0, mouseY = 0.0;
//WebGLProgram
let webglPrograms = [];
//WebGLShader
let webglShaders = [];
//WebGLBuffer
let webglBuffers = [];
let webglUniformLoc = [];

export default function(gl, pressedKeys, info, logConsole){
    function initShaderProgram(gl, vsSource, fsSource) {
      const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
      const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
      // Create the shader program
      const shaderProgram = gl.createProgram();
      if(shaderProgram)
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
    importObject =  {
      console:
      {
        log: function(arg)
        {
          // var char = new Uint8Array([Math.floor((arg/256)/256), Math.floor((arg%(256*256))/256), Math.floor((arg%(256*256))%256)]);
          // char = char.filter(char => char != 0);
          // console.log(new TextDecoder('utf-8').decode(char));
          logConsole(`${Number(arg)}`);
          console.log(Number(arg));
        },
        logstring: function(offset, length)
        {
          // console.log(Number(length) * 4);
          var bytes = new Uint8Array(memory.buffer, offset, Number(length)*4);
          // bytes.reverse();
          bytes = bytes.filter(element => element != 0);
          let string = new TextDecoder('utf-8').decode(bytes);
          logConsole(string);
          console.log(string);
        },
        logMatrix: function(offset)
        {
          const buffer = memory.buffer.slice(offset, 128 + offset);
          const f64Array = new Float64Array(buffer);
          const f32Array = Float32Array.from(f64Array);
          logConsole(JSON.stringify(f32Array));
          console.log(f32Array);
        }
      },
      performance:
      {
        now: function(){
          return performance.now();
        }
      },
      js:
      {
        mem: memory,
        checkKeyPress: function(keyCode)
        {
          return BigInt(pressedKeys[keyCode]);
        },
        checkMousePress: function()
        {
          return BigInt(info.mousePressed);
        },
        checkMouseX: function()
        {
          return info.x;
        },
        checkMouseY: function()
        {
          return info.y;
        },
        rand: function()
        {
          return Math.random();
        },
        alloc: function(size)
        {
          let temp = info.size;
          info.size+=size;
          return temp;
        }
      },
      webgl:
      {
        clearColor: function(r, g, b, a)
        {
          gl.clearColor(r, g, b, a);
        },
        clear: function(i)
        {
          gl.clear(i);
        },
        clearDepth: function(i)
        {
          gl.clearDepth(i);
        },
        depthFunc: function(i)
        {
          gl.depthFunc(i);
        },
        enable: function (i) {
          gl.enable(i);
        },
        vertexAttribPointer: function(index, size, type, normalized, stride, offset)
        {
          gl.vertexAttribPointer(index, size, type, false, stride, offset);
        },
        enableVertexAttribArray: function(index)
        {
          gl.enableVertexAttribArray(index);
        },
        disable: function(i)
        {
          gl.disable(i);
        },
        createProgram: function()
        {
          webglPrograms.push(gl.createProgram());
          return webglPrograms.length - 1;
        },
        createBuffer: function()
        {
          webglBuffers.push(gl.createBuffer());
          return webglBuffers.length - 1;
        },
        bindBuffer: function(i, j)
        {
          gl.bindBuffer(i, webglBuffers[j]);
        },
        bufferData: function(i, offset, size, j)
        {
          const buffer = memory.buffer.slice(offset, size * 8 + offset);
          const f64Array = new Float64Array(buffer);
          const f32Array = Float32Array.from(f64Array);
          gl.bufferData(i, f32Array, j);
        },
        useProgram: function(i)
        {
          gl.useProgram(webglPrograms[i]);
        },
        getAttribLocation: function(i, offset, length)
        {
          var bytes = new Uint8Array(memory.buffer, offset, Number(length)*4);
          // bytes.reverse();
          bytes = bytes.filter(element => element != 0);
          var string = new TextDecoder('utf-8').decode(bytes);
          // string = [...string].reverse().join("");
          return gl.getAttribLocation(webglPrograms[i], string);
        },
        getUniformLocation: function(i, offset, length)
        {
          var bytes = new Uint8Array(memory.buffer, offset, Number(length)*4);
          bytes = bytes.filter(element => element != 0);
          var string = new TextDecoder('utf-8').decode(bytes);
          webglUniformLoc.push(gl.getUniformLocation(webglPrograms[i], string));
          return webglUniformLoc.length - 1;
        },
        uniformMatrix2fv: function(i, transpose, offset)
        {
          const f64Array = new Float64Array(memory.buffer, offset, 4);
          const f32Array = Float32Array.from(f64Array);
          gl.uniformMatrix2fv(webglUniformLoc[i], transpose, f32Array);
        },
        uniformMatrix3fv: function(i, transpose, offset)
        {
          const f64Array = new Float64Array(memory.buffer, offset, 9);
          const f32Array = Float32Array.from(f64Array);
          gl.uniformMatrix3fv(webglUniformLoc[i], transpose, f32Array);
        },
        uniformMatrix4fv: function(i, transpose, offset)
        {
          const buffer = memory.buffer.slice(offset, 128 + offset);
          const f64Array = new Float64Array(buffer);
          const f32Array = Float32Array.from(f64Array);
          gl.uniformMatrix4fv(webglUniformLoc[i], transpose, f32Array);
        },
        uniform1f: function(i, v0)
        {
          gl.uniform1f(webglUniformLoc[i], v0);
        },
        uniform1fv: function(i, v0)
        {
          gl.uniform1fv(webglUniformLoc[i], v0);
        },
        uniform1i: function(i, v0)
        {
          gl.uniform1i(webglUniformLoc[i], v0);
        },
        uniform1iv: function(i, v0)
        {
          gl.uniform1iv(webglUniformLoc[i], v0);
        },
    
        uniform2f: function(i, v0, v1)
        {
          gl.uniform2f(webglUniformLoc[i], v0, v1);
        },
        uniform2fv: function(i, v0, v1)
        {
          gl.uniform2fv(webglUniformLoc[i], v0, v1);
        },
        uniform2i: function(i, v0, v1)
        {
          gl.uniform2i(webglUniformLoc[i], v0, v1);
        },
        uniform2iv: function(i, v0, v1)
        {
          gl.uniform2iv(webglUniformLoc[i], v0, v1);
        },
    
        uniform3f: function(i, v0, v1, v2)
        {
          gl.uniform3f(webglUniformLoc[i], v0, v1, v2);
        },
        uniform3fv: function(i, v0, v1, v2)
        {
          gl.uniform3fv(webglUniformLoc[i], v0, v1, v2);
        },
        uniform3i: function(i, v0, v1, v2)
        {
          gl.uniform3i(webglUniformLoc[i], v0, v1, v2);
        },
        uniform3iv: function(i, v0, v1, v2)
        {
          gl.uniform3iv(webglUniformLoc[i], v0, v1, v2);
        },
    
        uniform4f: function(i, v0, v1, v2, v3)
        {
          gl.uniform4f(webglUniformLoc[i], v0, v1, v2, v3);
        },
        uniform4fv: function(i, v0, v1, v2, v3)
        {
          gl.uniform4fv(webglUniformLoc[i], v0, v1, v2, v3);
        },
        uniform4i: function(i, v0, v1, v2, v3)
        {
          gl.uniform4i(webglUniformLoc[i], v0, v1, v2, v3);
        },
        uniform4iv: function(i, v0, v1, v2, v3)
        {
          gl.uniform4iv(webglUniformLoc[i], v0, v1, v2, v3);
        },
        drawArrays: function(i, first, count)
        {
          // console.log(i);
          gl.drawArrays(i, first, count);
        }
      }
    };
    return {importObject, initShaderProgram};
}