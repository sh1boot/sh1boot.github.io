'use strict';

// Replace the head and sweep the remaining slots from the previous frame.
let trailLength = 300;
const historyMargin = 200;
const samplesPerStep = 4;
let rainbowPeriod = trailLength / 2;
const noiseAmplitude = 2.5;
const walkStep = 3.075;
const wormCount = document.querySelector('#worm-count');
const lengthControl = document.querySelector('#worm-length');
const startingPoints = [[-54, 10], [55, -45], [12, 85], [-105, -75], [121, 71], [-130, 65]];
const worms = [];

function createWorm(index) {
  const head = [...startingPoints[index]];
  return {
    head,
    heading: Math.random() * Math.PI * 2,
    rainbowOffset: index * rainbowPeriod / startingPoints.length,
    history: Array.from({length: trailLength + historyMargin}, () => [...head])
  };
}

function setWormCount() {
  const count = Number(wormCount.value);
  while (worms.length < count) worms.push(createWorm(worms.length));
  worms.length = count;
}

function restartWalk() {
  worms.length = 0;
  setWormCount();
}

lengthControl.addEventListener('input', () => {
  const step = lengthControl.valueAsNumber;
  trailLength = Math.round(step <= 677 ? 30 * 10 ** (step / 677) : 300 * 3 ** ((step - 677) / 323));
  const text = trailLength + ' points';
  document.querySelector('#worm-length-value').value = text;
  lengthControl.setAttribute('aria-valuetext', text);
  rainbowPeriod = trailLength / 2;
  const size = trailLength + historyMargin;
  for (const worm of worms) {
    const {history} = worm;
    const tail = history[history.length - 1];
    while (history.length < size) history.push(tail);
    history.length = size;
    worm.rainbowOffset %= rainbowPeriod;
  }
});

wormCount.addEventListener('change', setWormCount);
setWormCount();

function tick(worm) {
  let {head, heading} = worm;
  const {history} = worm;
  if (worm === worms[0] && pointerTarget) {
    head = pointerTarget;
  } else {
    heading += (Math.random() - 0.5) * 1.55;
    const nextX = head[0] + walkStep * Math.cos(heading);
    const nextY = head[1] + walkStep * Math.sin(heading);
    if (Math.abs(nextX) > 211) heading = Math.PI - heading;
    if (Math.abs(nextY) > 155) heading = -heading;
    head = [clamp(nextX, -211, 211), clamp(nextY, -155, 155)];
  }
  worm.head = head;
  worm.heading = heading;
  const noise = () => noiseAmplitude * (2 * Math.random() - 1);
  const source = history.slice();
  history[0] = [head[0] + noise(), head[1] + noise()];
  const advance = phaseControl.valueAsNumber;
  worm.rainbowOffset = (worm.rainbowOffset + advance) % rainbowPeriod;
  const {weights, first} = runningFilter;
  for (let i = 1; i < history.length; i++) {
    let x = 0;
    let y = 0;
    for (let j = 0; j < weights.length; j++) {
      const point = source[clamp(i + first + j, 0, history.length - 1)];
      x += weights[j] * point[0];
      y += weights[j] * point[1];
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const limit = Math.max(1, Math.abs(x) / 476, Math.abs(y) / 356);
      history[i] = [x / limit, y / limit];
    }
  }
}

// Catmull–Rom cubic (a = −0.5), evaluated at the same quarter steps
// as ShaderToy's spline helper. Clamp at the head for the first segment.
function sample(history, t) {
  const i = Math.floor(t);
  const u = t - i;
  const u2 = u * u;
  const u3 = u2 * u;
  const weights = [
    (-u3 + 2 * u2 - u) / 2, (3 * u3 - 5 * u2 + 2) / 2,
    (-3 * u3 + 4 * u2 + u) / 2, (u3 - u2) / 2
  ];
  const point = [0, 0];
  for (let j = 0; j < 4; j++) {
    const source = history[Math.max(0, i + j - 1)];
    point[0] += weights[j] * source[0];
    point[1] += weights[j] * source[1];
  }
  return point;
}

const canvas = document.querySelector('#worm');
let pointerId;
let pointerTarget;

function updatePointerTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / 480, rect.height / 360);
  if (!scale) return;
  pointerTarget = [
    (clamp(event.clientX - rect.left, 0, rect.width) - rect.width / 2) / scale,
    (rect.height / 2 - clamp(event.clientY - rect.top, 0, rect.height)) / scale
  ];
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || pointerId !== undefined) return;
  pointerId = event.pointerId;
  canvas.setPointerCapture(pointerId);
  updatePointerTarget(event);
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId === pointerId) updatePointerTarget(event);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(name, event => {
    if (event.pointerId !== pointerId) return;
    pointerId = undefined;
    pointerTarget = undefined;
  });
}

const fadeStretched = document.querySelector('#fade-stretched');

function segmentOpacity(distance) {
  const halfOpacityLength = 480 * 0.027 / samplesPerStep;
  const stretch = Math.log1p(distance / halfOpacityLength) / Math.LN2;
  return Math.exp(-Math.LN2 * stretch * stretch);
}
const pause = document.querySelector('#pause');
const status = document.querySelector('#status');
let paused = false;
pause.addEventListener('click', () => {
  paused = !paused;
  pause.textContent = paused ? 'Resume' : 'Pause';
  status.textContent = paused ? 'Paused' : 'Running';
  status.dataset.paused = paused;
});
document.querySelector('#restart').addEventListener('click', restartWalk);

const walkPanel = document.querySelector('#walk-panel');
const fullscreen = document.querySelector('#fullscreen');
const fullscreenStatus = document.querySelector('#fullscreen-status');
fullscreen.disabled = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  fullscreenStatus.hidden = true;
  try {
    if (document.fullscreenElement === walkPanel) await document.exitFullscreen();
    else await walkPanel.requestFullscreen();
  } catch {
    fullscreenStatus.textContent = 'Fullscreen is unavailable.';
    fullscreenStatus.hidden = false;
  }
});
document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === walkPanel;
  fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
  fullscreen.setAttribute('aria-pressed', String(active));
});


function webglRenderer(gl) {
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }

  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec2 position;
    attribute vec4 color;
    varying vec4 rgba;
    void main() { gl_Position = vec4(position, 0.0, 1.0); rgba = color; }
  `));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec4 rgba;
    void main() { gl_FragColor = rgba; }
  `));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, size, offset] of [['position', 2, 0], ['color', 4, 8]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 24, offset);
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const rainbow = [
    [1, 0.32, 0.32], [1, 0.96, 0.32], [0.32, 1, 0.32],
    [0.32, 1, 1], [0.32, 0.32, 1], [1, 0.32, 1]
  ];

  function drawTrail(worm, width, height, ratio, scale, dim) {
    const {head, history, rainbowOffset} = worm;
    const points = Array.from({length: trailLength * samplesPerStep + 1}, (_, i) =>
      i === 0 ? head : sample(history, i / samplesPerStep));
    const vertices = [];
    const emit = ([x, y], color, opacity) =>
      vertices.push(x * 2 * scale / width, y * 2 * scale / height, ...color, opacity);
    let previous;
    // Draw older segments first so the head covers the tail at crossings.
    for (let i = points.length - 1; i >= 0; i--) {
      const [x, y] = points[i];
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy) || 1;
      const age = i / (points.length - 1);
      const fade = Math.max(0, (age - 0.75) / 0.25);
      const radius = (1.6 - 1.25 * fade) * ratio / scale;
      const nx = -dy * radius / length;
      const ny = dx * radius / length;
      const phase = (i / samplesPerStep - rainbowOffset + rainbowPeriod) % rainbowPeriod;
      const hue = phase / rainbowPeriod * rainbow.length;
      const stop = Math.floor(hue);
      const blend = hue - stop;
      const first = rainbow[stop % rainbow.length];
      const second = rainbow[(stop + 1) % rainbow.length];
      const color = first.map((value, channel) =>
        (value + (second[channel] - value) * blend) * (1 - 0.54 * fade));
      const left = [x + nx, y + ny];
      const right = [x - nx, y - ny];
      if (!dim) {
        emit(left, color, 1);
        emit(right, color, 1);
      } else if (previous) {
        const distance = Math.hypot(x - b[0], y - b[1]);
        const opacity = segmentOpacity(distance);
        if (opacity > 0) {
          emit(previous.left, previous.color, opacity);
          emit(previous.right, previous.color, opacity);
          emit(left, color, opacity);
          emit(left, color, opacity);
          emit(previous.right, previous.color, opacity);
          emit(right, color, opacity);
        }
      }
      previous = {left, right, color};
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.drawArrays(dim ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, vertices.length / 6);
  }

  return function draw() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.064, 0.083, 0.132, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const scale = Math.min(width / 480, height / 360);
    const dim = fadeStretched.checked;
    for (const worm of worms) drawTrail(worm, width, height, ratio, scale, dim);
  };
}

try {
  const gl = canvas.getContext('webgl', {antialias: true});
  if (!gl) throw new Error('WebGL unavailable');
  const draw = webglRenderer(gl);
  const sweepInterval = 1000 / 60;
  let last = performance.now();
  let backlog = 0;
  function animate(now) {
    if (!paused) {
      backlog += Math.min(now - last, 100);
      while (backlog >= sweepInterval) {
        backlog -= sweepInterval;
        for (const worm of worms) tick(worm);
      }
    }
    last = now;
    draw();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
} catch (error) {
  document.querySelector('#error').hidden = false;
  pause.disabled = true;
  wormCount.disabled = true;
  lengthControl.disabled = true;
  document.querySelector('#restart').disabled = true;
  status.textContent = 'WebGL unavailable';
  status.dataset.paused = true;
  console.error(error);
}
