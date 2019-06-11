/**
 * To draw images, we need to use textures
 * Webgl expects texture coordinates - texture coords go from 0 to 1
 */
 // Define several convolution kernels
 var kernels = {
  normal: [
    0, 0, 0,
    0, 1, 0,
    0, 0, 0
  ],
  gaussianBlur: [
    0.045, 0.122, 0.045,
    0.122, 0.332, 0.122,
    0.045, 0.122, 0.045
  ],
  unsharpen: [
    -1, -1, -1,
    -1,  9, -1,
    -1, -1, -1
  ],
  emboss: [
     -2, -1,  0,
     -1,  1,  1,
      0,  1,  2
  ]
};

// List of effects to apply.
var effectsToApply = [
  "normal"
];

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

  // Texture logic
  const flipYLocation = gl.getUniformLocation(program, 'u_flipY');
  const textureSizeLocation = gl.getUniformLocation(program, 'u_textureSize');
  const kernelWeightLocation = gl.getUniformLocation(program, 'u_kernelWeight');

  // Create texture
  var originalImageTexture = createTexture(gl);
  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // create 2 additional textures
  var textures = [];
  var fbuffers = [];
  for (let i=0; i<2; i++) {
    // 1. create texture
    let texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    textures.push(texture);
    // create the frame buffer
    let fbuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbuffer);
    fbuffers.push(fbuffer);
    // attach the texture to the frame buffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }
  gl.uniform1f(flipYLocation, 1);
  // set uniforms
  gl.uniform2f(textureSizeLocation, image.width, image.height);
  for (let j = 0; j < effectsToApply.length; j++) {
    // we want to use frame buffer j%%2
    setFramebuffer(gl, program, fbuffers[j % 2], image.width, image.height);
    drawWithKernel(gl, program, effectsToApply[j]);
  }
  // draw result to the canvas
  gl.uniform1f(flipYLocation, -1);
  setFramebuffer(gl, program, null, image.width, image.height);
  drawWithKernel(gl, program, "normal");
}
function setFramebuffer(gl, program, buffer, width, height) {
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
  gl.uniform2f(resolutionUniformLocation, width, height);
  gl.viewport(0, 0, width, height);
}
function drawWithKernel(gl, program, name) {
  console.log(name)
  const kernelLocation = gl.getUniformLocation(program, 'u_kernel');
  gl.uniform1fv(kernelLocation, kernels[name]);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
function createTexture(gl) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

function computeKernelWeight (kernel) {
  const weight = kernel.reduce((prev, curr) => {
    return prev+curr;
  })
  return weight <= 0 ? 1 : weight;
}

 main();