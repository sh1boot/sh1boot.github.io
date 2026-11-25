'use strict';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const filterAnchor = 5;
const defaultBaseShift = 3;
const referenceStrength = 0.01;
const strengthControl = document.querySelector('#strength');
const phaseControl = document.querySelector('#phase');
const fitLength = document.querySelector('#fit-length');
const gainChart = document.querySelector('#gain-chart');
const handleLayer = document.querySelector('#response-handles');
const delayChart = document.querySelector('#delay-chart');
const delayLayer = document.querySelector('#delay-handles');
const delayDisplay = document.querySelector('#delay-display');
const defaultTapCount = 49;
const gainDetail = 0.35;
let design;
let designedFilter;
let runningFilter;
const gainMin = -36;
const gainMax = 3;
const chartLeft = 39;
const chartWidth = 267;
const svgNamespace = 'http://www.w3.org/2000/svg';
let responseDrag;
let handleNodes = [];
let delayNodes = [];
const delayTargetLimit = 12;
let delayLimit = delayTargetLimit;
let delayDisplayOffset = 0;

function chartX(frequency) {
  return chartLeft + 2 * chartWidth * frequency;
}

function gainY(db) {
  const span = db >= 0 ? 47 / Math.asinh(gainMax / gainDetail)
    : 88 / Math.asinh(-gainMin / gainDetail);
  return 59 - span * Math.asinh(db / gainDetail);
}

function gainFromY(y) {
  const span = y <= 59 ? 47 / Math.asinh(gainMax / gainDetail)
    : 88 / Math.asinh(-gainMin / gainDetail);
  return gainDetail * Math.sinh((59 - y) / span);
}

function measureResponse(kernel, frequency) {
  let re = 0, im = 0, momentRe = 0, momentIm = 0;
  kernel.weights.forEach((weight, i) => {
    const offset = kernel.first + i;
    const angle = 2 * Math.PI * frequency * offset;
    const real = weight * Math.cos(angle);
    const imag = weight * Math.sin(angle);
    re += real;
    im += imag;
    momentRe += offset * real;
    momentIm += offset * imag;
  });
  const power = re * re + im * im;
  return {
    re, im,
    db: 10 * Math.log10(power),
    delay: power > 1e-6 ? -(re * momentRe + im * momentIm) / power : NaN
  };
}

function defaultDesign() {
  return {
    count: defaultTapCount,
    points: [
      [0, 0], [0.025, 0.15], [0.075, 0.15], [0.11, 0],
      [0.20, 0], [0.25, -6], [0.30, -12], [0.40, -12], [0.50, -12]
    ],
    delays: [0, 0.04, 0.10, 0.16, 0.25, 0.5].map(frequency => [frequency, 0])
  };
}

function desiredDb(points, frequency) {
  const right = points.findIndex(([x]) => x >= frequency);
  if (right <= 0) return points[Math.max(0, right)][1];
  const [low, lowDb] = points[right - 1];
  const [high, highDb] = points[right];
  return lowDb + (highDb - lowDb) * (frequency - low) / (high - low);
}

function phaseFromDelay(points, frequency) {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const [left, first] = points[i - 1];
    const [right, last] = points[i];
    const width = Math.max(0, Math.min(frequency, right) - left);
    area += width * (first + (last - first) * width / (2 * (right - left)));
    if (frequency <= right) break;
  }
  return -2 * Math.PI * area;
}

function projectKernel(count, first, responseAt) {
  const resolution = 256;
  const weights = new Array(count).fill(0);
  // Project the requested complex response onto the selected real FIR support.
  for (let i = 0; i < resolution; i++) {
    const frequency = (i + 0.5) / (2 * resolution);
    const {re, im} = responseAt(frequency);
    for (let j = 0; j < count; j++) {
      const angle = 2 * Math.PI * (first + j) * frequency;
      weights[j] += (re * Math.cos(angle) + im * Math.sin(angle)) / resolution;
    }
  }
  const dc = (1 - weights.reduce((sum, tap) => sum + tap, 0)) / count;
  return {first, weights: weights.map(tap => tap + dc)};
}

function fitDesign() {
  const {count, points, delays} = design;
  const first = -filterAnchor - Math.floor((count - 1) / 2);
  return projectKernel(count, first, frequency => {
    const magnitude = 10 ** (desiredDb(points, frequency) / 20);
    const phase = phaseFromDelay(delays, frequency) - 2 * Math.PI * frequency * filterAnchor;
    return {re: magnitude * Math.cos(phase), im: magnitude * Math.sin(phase)};
  });
}

function sweepStrength() {
  const position = strengthControl.valueAsNumber;
  return position <= 7614
    ? referenceStrength * 0.03 ** (1 - position / 7614)
    : referenceStrength * 3 ** ((position - 7614) / 2386);
}

function rebuildFilter() {
  const ratio = sweepStrength() / referenceStrength;
  const shift = phaseControl.valueAsNumber - filterAnchor;
  const {first, weights} = designedFilter;
  const origin = -filterAnchor - first;
  const blend = {first, weights: weights.map((tap, j) => {
    const carry = j === origin ? 1 : 0;
    return carry + ratio * (tap - carry);
  })};
  if (Number.isInteger(shift)) {
    runningFilter = {first: first - shift, weights: blend.weights};
  } else {
    // Add a phase ramp, then fit it to the same number of taps.
    runningFilter = projectKernel(weights.length, first - Math.round(shift), frequency => {
      const {re, im} = measureResponse(blend, frequency);
      const angle = 2 * Math.PI * frequency * shift;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {re: re * cos + im * sin, im: im * cos - re * sin};
    });
  }
  updateResponseCharts();
}

function delayY(samples) {
  return 52 - 40 * samples / delayLimit;
}

function updateResponseCharts() {
  const reference = phaseControl.valueAsNumber;
  document.querySelector('#delay-reference').value = String(Number(reference.toFixed(2)));
  delayDisplayOffset = delayDisplay.value === 'total' ? reference : 0;
  delayLimit = delayDisplay.value === 'total' ? 28 : delayTargetLimit;
  document.querySelector('#delay-high').textContent = '+' + delayLimit;
  document.querySelector('#delay-low').textContent = '−' + delayLimit;
  document.querySelector('#delay-base').setAttribute('d', `M39 ${delayY(delayDisplayOffset)}H306`);
  document.querySelector('#delay-dc').value = measureResponse(runningFilter, 0).delay.toFixed(2);
  const gain = [];
  const targetGain = [`M${chartX(design.points[0][0])} ${gainY(design.points[0][1])}`];
  for (let i = 1; i < design.points.length; i++) {
    const [first, startDb] = design.points[i - 1];
    const [last, endDb] = design.points[i];
    for (let j = 1; j <= 12; j++) {
      const fraction = j / 12;
      targetGain.push(`L${chartX(first + (last - first) * fraction)} ${gainY(startDb + (endDb - startDb) * fraction)}`);
    }
  }
  const delay = [];
  let connected = false;
  for (let i = 0; i <= 256; i++) {
    const frequency = i / 512;
    const x = chartX(frequency).toFixed(2);
    const measurement = measureResponse(runningFilter, frequency);
    gain.push((i ? 'L' : 'M') + x + ' ' + gainY(clamp(measurement.db, gainMin, gainMax)).toFixed(2));
    const value = measurement.delay - reference + delayDisplayOffset;
    if (!Number.isFinite(value)) {
      connected = false;
    } else {
      delay.push((connected ? 'L' : 'M') + x + ' ' + delayY(value).toFixed(2));
      connected = true;
    }
  }
  document.querySelector('#fitted-gain').setAttribute('d', gain.join(' '));
  document.querySelector('#target-gain').setAttribute('d', targetGain.join(' '));
  document.querySelector('#fitted-delay').setAttribute('d', delay.join(' '));
  document.querySelector('#target-delay').setAttribute('d', design.delays.map(([x, samples], i) =>
    (i ? 'L' : 'M') + chartX(x) + ' ' + delayY(samples + delayDisplayOffset)).join(' '));
  for (const [nodes, points, toY, unit] of [
    [handleNodes, design.points, gainY, 'dB'], [delayNodes, design.delays, samples => delayY(samples + delayDisplayOffset), 'samples relative to base']
  ]) {
    nodes.forEach((node, i) => {
      const [frequency, value] = points[i];
      node.setAttribute('cx', chartX(frequency));
      node.setAttribute('cy', toY(value));
      const wavelength = frequency ? (1 / frequency).toFixed(2) + ' points per ripple' : 'DC';
      node.setAttribute('aria-label', `${wavelength}, ${value.toFixed(2)} ${unit}`);
    });
  }
}

function moveResponseHandle(chart, index, frequency, value) {
  const points = chart === gainChart ? design.points : design.delays;
  const previous = points[index - 1];
  const next = points[index + 1];
  const current = points[index][0];
  const minFrequency = previous && previous[0] + (previous[0] === current ? 0 : 0.004);
  const maxFrequency = next && next[0] - (next[0] === current ? 0 : 0.004);
  const low = chart === gainChart ? gainMin : -delayTargetLimit;
  const high = chart === gainChart ? gainMax : delayTargetLimit;
  points[index] = [
    !index ? 0 : next ? clamp(frequency, minFrequency, maxFrequency) : 0.5,
    clamp(value, low, high)
  ];
  designedFilter = fitDesign();
  rebuildFilter();
}

function renderHandles(chart, layer, points) {
  layer.replaceChildren();
  return points.map((_, index) => {
    const mark = document.createElementNS(svgNamespace, 'circle');
    const fixed = chart === gainChart && !index;
    mark.setAttribute('r', fixed ? '3' : '5');
    mark.classList.add('response-handle');
    layer.append(mark);
    if (fixed) return mark;
    mark.setAttribute('tabindex', '0');
    mark.addEventListener('pointerdown', event => {
      if (responseDrag || event.button !== 0) return;
      responseDrag = {chart, index, id: event.pointerId};
      chart.setPointerCapture(event.pointerId);
    });
    mark.addEventListener('keydown', event => {
      const verticalStep = chart === gainChart && !event.shiftKey ? 0.01 : 0.1;
      const delta = {ArrowLeft: [-0.003, 0], ArrowRight: [0.003, 0],
        ArrowUp: [0, verticalStep], ArrowDown: [0, -verticalStep]}[event.key];
      if (!delta) return;
      event.preventDefault();
      const [frequency, value] = points[index];
      moveResponseHandle(chart, index, frequency + delta[0],
        value + delta[1]);
    });
    return mark;
  });
}

for (const chart of [gainChart, delayChart]) {
  chart.addEventListener('pointermove', event => {
    if (responseDrag?.id !== event.pointerId || responseDrag.chart !== chart) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(chart.getScreenCTM().inverse());
    const value = chart === gainChart ? gainFromY(point.y) : (52 - point.y) * delayLimit / 40 - delayDisplayOffset;
    moveResponseHandle(chart, responseDrag.index, (point.x - chartLeft) / (2 * chartWidth), value);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    chart.addEventListener(name, event => {
      if (responseDrag?.id === event.pointerId) responseDrag = undefined;
    });
  }
}
function updateControlReadouts() {
  document.querySelector('#tap-value').value = fitLength.value;
  const strength = (100 * sweepStrength()).toFixed(2) + '%';
  document.querySelector('#strength-value').value = strength;
  strengthControl.setAttribute('aria-valuetext', strength);
  const shift = phaseControl.valueAsNumber;
  const phase = shift + ' samples';
  document.querySelector('#phase-value').value = phase;
  phaseControl.setAttribute('aria-valuetext', phase);
}

delayDisplay.addEventListener('change', updateResponseCharts);
fitLength.addEventListener('input', () => {
  design.count = fitLength.valueAsNumber;
  designedFilter = fitDesign();
  updateControlReadouts();
  rebuildFilter();
});
for (const control of [strengthControl, phaseControl]) {
  control.addEventListener('input', () => {
    updateControlReadouts();
    rebuildFilter();
  });
}

const copyStatus = document.querySelector('#copy-status');
document.querySelector('#copy-filter').addEventListener('click', async () => {
  const coefficientData = {
    firstSampleOffset: runningFilter.first,
    coefficients: runningFilter.weights
  };
  copyStatus.hidden = false;
  try {
    await navigator.clipboard.writeText(JSON.stringify(coefficientData, null, 2));
    copyStatus.textContent = 'Filter copied.';
  } catch {
    copyStatus.textContent = 'Clipboard access failed.';
  }
});

function resetFilter() {
  fitLength.value = defaultTapCount;
  strengthControl.value = 7614;
  phaseControl.value = defaultBaseShift;
  design = defaultDesign();
  designedFilter = fitDesign();
  handleNodes = renderHandles(gainChart, handleLayer, design.points);
  delayNodes = renderHandles(delayChart, delayLayer, design.delays);
  copyStatus.hidden = true;
  updateControlReadouts();
  rebuildFilter();
}

document.querySelector('#reset').addEventListener('click', resetFilter);

const gainGrid = document.querySelector('#gain-grid');
for (const db of [3, 0.25, 0, -0.25, -3, -12, -36]) {
  const y = gainY(db);
  const line = document.createElementNS(svgNamespace, 'path');
  line.setAttribute('d', `M39 ${y}H306`);
  line.setAttribute('stroke', db === 0 ? '#62718b' : '#293143');
  gainGrid.append(line);
  const label = document.createElementNS(svgNamespace, 'text');
  label.setAttribute('x', '33');
  label.setAttribute('y', y + 4);
  label.setAttribute('text-anchor', 'end');
  label.textContent = db > 0 ? '+' + db : String(db);
  gainGrid.append(label);
}

resetFilter();
