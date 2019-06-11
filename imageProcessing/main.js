/**
 * To draw images, we need to use textures
 * Webgl expects texture coordinates - texture coords go from 0 to 1
 */


function main () {
  // 1. load the image
  var image = new Image();
  image.src = './image.jpg';
  image.onload = function () {
    console.log('image loaded')
    render(image);
  }
}
function render(image) {
  var canvas = document.querySelector('#canvas');
  var gl = canvas.getContext('webgl');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  var vertexShader = createShader(gl, 'vertex-shader', gl.VERTEX_SHADER);
  var fragmentShader = createShader(gl, 'fragment-shader', gl.FRAGMENT_SHADER);

  var program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  initPosBuffer(gl, program, image);
  initTexBuffer(gl, program, image);
  // draw
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;
  gl.drawArrays(primitiveType, offset, count);
}

function createShader(gl, shaderId, shaderType) {
  var shader = gl.createShader(shaderType);
  var source = document.querySelector(`#${shaderId}`).text;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error('shader compile failed');
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error('program link failed');
  gl.deleteProgram(program);
}

function initPosBuffer (gl, program, image) {
  var x1 = 0;
  var x2 = x1 + image.width;
  var y1 = 0;
  var y2 = y1 + image.height;
  var positions = [
    x1, y1,
    x2, y1,
    x1, y2,

    x1, y2,
    x2, y2,
    x2, y1
  ];
  var positionLocation = gl.getAttribLocation(program, 'a_position');
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // set the resolution
  var resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
}
function initTexBuffer (gl, program, image) {
  var texCoords = [
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    0.0,  1.0,
    1.0,  1.0,
    1.0,  0.0
  ];
  // 1. get attribute index into the list of attributes
  var texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  // 2. activate the attribute
  gl.enableVertexAttribArray(texCoordLocation);
  // 3. create the buffer
  var texCoordBuffer = gl.createBuffer();
  // 4. bind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  // 5. give the data to the buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  // 6. tell webgl how to get data out of the buffer
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  // Create texture
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  var textureSizeLocation = gl.getUniformLocation(program, 'u_textureSize');
  gl.uniform2f(textureSizeLocation, image.width, image.height);
}
 main();