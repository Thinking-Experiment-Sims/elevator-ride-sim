import { buildRideProfile, sampleStateAtTime, clamp } from "./physics.js";

const GRAVITY = 9.81;
const FLOOR_HEIGHT_M = 3.0;
const MASS_KG = 80;
const MAX_SPEED_MPS = 4.0;
const ACCEL_MPS2 = 4.0;

const els = {
  statusLine: document.getElementById("status-line"),
  floorLabel: document.getElementById("floor-label"),
  bubble: document.getElementById("bubble"),
  fnArrow: document.getElementById("fn-arrow"),
  fgArrow: document.getElementById("fg-arrow"),
  fnLabel: document.getElementById("fn-label"),
  fgLabel: document.getElementById("fg-label"),
  accelLine: document.getElementById("accel-line"),
  senseLine: document.getElementById("sense-line"),
  compareLine: document.getElementById("compare-line"),
  go10: document.getElementById("go10"),
  go20: document.getElementById("go20"),
  go1: document.getElementById("go1"),
  pause: document.getElementById("pause"),
  reset: document.getElementById("reset"),
};

let currentFloor = 1;
let targetFloor = 1;
let running = false;
let rideInProgress = false;
let simTime = 0;
let rafId = null;
let lastMs = 0;
let config = makeConfig(currentFloor, targetFloor);
let profile = buildRideProfile(config);

init();

function init() {
  wireEvents();
  updateButtons();
  render(sampleStateAtTime(profile, 0, config));
}

function wireEvents() {
  els.go10.addEventListener("click", () => startRide(10));
  els.go20.addEventListener("click", () => startRide(20));
  els.go1.addEventListener("click", () => startRide(1));
  els.pause.addEventListener("click", togglePause);
  els.reset.addEventListener("click", resetRide);
}

function startRide(nextFloor) {
  if (rideInProgress || nextFloor === currentFloor) return;

  targetFloor = nextFloor;
  config = makeConfig(currentFloor, targetFloor);
  profile = buildRideProfile(config);
  simTime = 0;
  running = true;
  rideInProgress = true;
  updateButtons();

  lastMs = performance.now();
  requestFrame();
}

function togglePause() {
  if (!rideInProgress) return;

  if (running) {
    running = false;
    cancelFrame();
    updateButtons();
    return;
  }

  running = true;
  lastMs = performance.now();
  updateButtons();
  requestFrame();
}

function resetRide() {
  if (!rideInProgress && simTime === 0) return;

  running = false;
  rideInProgress = false;
  cancelFrame();
  targetFloor = currentFloor;
  simTime = 0;
  config = makeConfig(currentFloor, targetFloor);
  profile = buildRideProfile(config);
  updateButtons();
  render(sampleStateAtTime(profile, 0, config));
}

function requestFrame() {
  cancelFrame();
  rafId = requestAnimationFrame(onFrame);
}

function cancelFrame() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/** @param {number} now */
function onFrame(now) {
  if (!running) return;

  const dt = Math.min((now - lastMs) / 1000, 0.05);
  lastMs = now;
  simTime = clamp(simTime + dt, 0, profile.totalTime);

  const state = sampleStateAtTime(profile, simTime, config);
  render(state);

  if (simTime >= profile.totalTime) {
    running = false;
    rideInProgress = false;
    currentFloor = targetFloor;
    updateButtons();

    const doneState = sampleStateAtTime(profile, profile.totalTime, config);
    render(doneState);
    return;
  }

  requestFrame();
}

/**
 * @param {import("./physics.js").SimulationState} state
 */
function render(state) {
  const exactFloor = clamp(config.startFloor + state.y / FLOOR_HEIGHT_M, 1, 20);
  const floorInteger = clamp(Math.round(exactFloor), 1, 20);

  const relation = getForceRelation(state.fn, state.fg);
  const accelDir = getAccelerationDirection(state.a);
  const statusText = getStatusText(state.phase, state.a, state.v, floorInteger);

  els.statusLine.innerHTML = `<strong>Status:</strong> ${statusText}`;
  els.floorLabel.textContent = `Floor: ${floorInteger}`;

  els.fnLabel.textContent = `F_norm = ${Math.round(state.fn)} N`;
  els.fgLabel.textContent = `F_grav = ${Math.round(state.fg)} N`;

  els.accelLine.textContent = `a = ${state.a.toFixed(1)} m/s^2 (${accelDir})`;
  els.senseLine.textContent = `Sensation: ${state.sensation}`;
  els.compareLine.textContent = relation === "gt" ? "F_N > F_g" : relation === "lt" ? "F_N < F_g" : "F_N = F_g";

  els.bubble.textContent = getBubbleText(state.phase, state.sensation);
  renderFbdArrows(state.fn, state.fg, relation);
}

/** @param {number} fromFloor @param {number} toFloor */
function makeConfig(fromFloor, toFloor) {
  return {
    direction: toFloor > fromFloor ? "up" : "down",
    startFloor: fromFloor,
    endFloor: toFloor,
    floorHeightM: FLOOR_HEIGHT_M,
    massKg: MASS_KG,
    maxSpeedMps: MAX_SPEED_MPS,
    accelMagMps2: ACCEL_MPS2,
    gMps2: GRAVITY,
  };
}

function updateButtons() {
  const lockFloorButtons = rideInProgress;
  els.go10.disabled = lockFloorButtons || currentFloor === 10;
  els.go20.disabled = lockFloorButtons || currentFloor === 20;
  els.go1.disabled = lockFloorButtons || currentFloor === 1;
  els.pause.disabled = !rideInProgress;
  els.pause.textContent = running ? "Pause" : "Resume";
  els.reset.disabled = !rideInProgress && simTime === 0;
}

/** @param {number} fn @param {number} fg */
function getForceRelation(fn, fg) {
  const tol = Math.max(0.02 * fg, 0.5);
  if (fn > fg + tol) return "gt";
  if (fn < fg - tol) return "lt";
  return "eq";
}

/** @param {number} a */
function getAccelerationDirection(a) {
  if (a > 0.02) return "upward";
  if (a < -0.02) return "downward";
  return "none";
}

/**
 * @param {"accelerating"|"cruising"|"decelerating"|"stopped"} phase
 * @param {number} a
 * @param {number} v
 * @param {number} floor
 */
function getStatusText(phase, a, v, floor) {
  if (phase === "stopped") return `At rest on floor ${floor}.`;

  const accelWord = Math.abs(a).toFixed(1);
  const accelDir = a > 0 ? "upward" : a < 0 ? "downward" : "none";

  if (phase === "accelerating") return `Accelerating ${accelDir} at ${accelWord} m/s/s.`;
  if (phase === "decelerating") return `Accelerating ${accelDir} at ${accelWord} m/s/s.`;

  const moveDir = v > 0 ? "upward" : "downward";
  return `Moving ${moveDir} at constant speed.`;
}

/** @param {"accelerating"|"cruising"|"decelerating"|"stopped"} phase @param {"lighter"|"normal"|"heavier"} sensation */
function getBubbleText(phase, sensation) {
  if (phase === "stopped") return "Push a button and let's get started!";
  if (sensation === "heavier") return "Whoa! I feel heavier than normal.";
  if (sensation === "lighter") return "Whoa! I feel lighter than normal.";
  return "I feel normal.";
}

/** @param {number} fn @param {number} fg @param {"gt"|"lt"|"eq"} relation */
function renderFbdArrows(fn, fg, relation) {
  const maxHeight = 180;
  const minHeight = 70;
  const equalHeight = 140;

  els.fnArrow.classList.remove("larger", "equal");
  els.fgArrow.classList.remove("larger", "equal");

  if (relation === "eq") {
    els.fnArrow.style.height = `${equalHeight}px`;
    els.fgArrow.style.height = `${equalHeight}px`;
    els.fnArrow.classList.add("equal");
    els.fgArrow.classList.add("equal");
    return;
  }

  const larger = relation === "gt" ? fn : fg;
  const smaller = relation === "gt" ? fg : fn;
  const largerHeight = maxHeight;
  let smallerHeight = clamp((smaller / larger) * maxHeight, minHeight, maxHeight - 22);

  if (largerHeight - smallerHeight < 24) {
    smallerHeight = largerHeight - 24;
  }

  if (relation === "gt") {
    els.fnArrow.style.height = `${largerHeight}px`;
    els.fgArrow.style.height = `${smallerHeight}px`;
    els.fnArrow.classList.add("larger");
  } else {
    els.fnArrow.style.height = `${smallerHeight}px`;
    els.fgArrow.style.height = `${largerHeight}px`;
    els.fgArrow.classList.add("larger");
  }
}
