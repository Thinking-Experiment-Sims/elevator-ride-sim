import { buildRideProfile, sampleStateAtTime, clamp } from "./physics.js";

const GRAVITY = 9.81;
const FLOOR_HEIGHT_M = 3.0;
const MASS_KG = 4.5;
const MAX_SPEED_MPS = 4.0;
const ACCEL_FLOORS = 3;
const ACCEL_DISTANCE_M = ACCEL_FLOORS * FLOOR_HEIGHT_M;
const ACCEL_MPS2 = (MAX_SPEED_MPS * MAX_SPEED_MPS) / (2 * ACCEL_DISTANCE_M);

const els = {
  statusLine: document.getElementById("status-line"),
  floorLabel: document.getElementById("floor-label"),
  thermoFill: document.getElementById("thermo-fill"),
  thermoFloor: document.getElementById("thermo-floor"),
  bubble: document.getElementById("bubble"),
  fnArrow: document.getElementById("fn-arrow"),
  fgArrow: document.getElementById("fg-arrow"),
  fnLabel: document.getElementById("fn-label"),
  fgLabel: document.getElementById("fg-label"),
  accelArrow: document.getElementById("accel-arrow"),
  accelDirection: document.getElementById("accel-direction"),
  accelLine: document.getElementById("accel-line"),
  senseLine: document.getElementById("sense-line"),
  compareLine: document.getElementById("compare-line"),
  simSpeed: document.getElementById("sim-speed"),
  simSpeedOut: document.getElementById("sim-speed-out"),
  themeToggle: document.getElementById("theme-toggle"),
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
let simSpeed = 1;
let rafId = null;
let lastMs = 0;
let theme = "dark";
let config = makeConfig(currentFloor, targetFloor);
let profile = buildRideProfile(config);

init();

function init() {
  initTheme();
  wireEvents();
  updateSimSpeedOutput();
  updateButtons();
  render(sampleStateAtTime(profile, 0, config));
}

function wireEvents() {
  els.go10.addEventListener("click", () => startRide(10));
  els.go20.addEventListener("click", () => startRide(20));
  els.go1.addEventListener("click", () => startRide(1));
  els.pause.addEventListener("click", togglePause);
  els.reset.addEventListener("click", resetRide);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.simSpeed.addEventListener("input", () => {
    simSpeed = clamp(Number(els.simSpeed.value), 0.5, 3);
    updateSimSpeedOutput();
  });
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
  currentFloor = 1;
  targetFloor = 1;
  simTime = 0;
  config = makeConfig(1, 1);
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

  const dt = Math.min((now - lastMs) / 1000, 0.05) * simSpeed;
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
  const floorRatio = (exactFloor - 1) / 19;

  const relation = getForceRelation(state.fn, state.fg);
  const accelDir = getAccelerationDirection(state.a);
  const statusText = getStatusText(state.phase, state.a, state.v, floorInteger);
  const phaseClass = getThermoPhaseClass(state.phase);

  els.statusLine.innerHTML = `<strong>Status:</strong> ${statusText}`;
  els.floorLabel.textContent = `Floor: ${floorInteger}`;
  els.thermoFloor.textContent = String(floorInteger);
  els.thermoFill.style.height = `${(floorRatio * 100).toFixed(1)}%`;
  els.thermoFill.className = `thermo-fill ${phaseClass}`;

  els.fnLabel.textContent = `F_norm = ${Math.round(state.fn)} N`;
  els.fgLabel.textContent = `F_grav = ${Math.round(state.fg)} N`;

  els.accelLine.textContent = `a = ${state.a.toFixed(1)} m/s^2 (${accelDir})`;
  els.senseLine.textContent = `Sensation: ${state.sensation}`;
  els.compareLine.textContent = relation === "gt" ? "F_N > F_g" : relation === "lt" ? "F_N < F_g" : "F_N = F_g";

  renderAccelerationIndicator(accelDir);
  els.bubble.textContent = getBubbleText(state.phase, state.sensation);
  renderFbdArrows(state.fn, state.fg, relation);
}

function updateSimSpeedOutput() {
  const label = `${simSpeed.toFixed(2)}x`;
  els.simSpeedOut.value = label;
  els.simSpeedOut.textContent = label;
}

function initTheme() {
  const saved = window.localStorage.getItem("elevator_theme");
  if (saved === "light" || saved === "dark") {
    theme = saved;
  } else {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  applyTheme();
}

function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);
  els.themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  window.localStorage.setItem("elevator_theme", theme);
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

/** @param {"accelerating"|"cruising"|"decelerating"|"stopped"} phase */
function getThermoPhaseClass(phase) {
  if (phase === "accelerating") return "phase-accelerating";
  if (phase === "cruising") return "phase-cruising";
  if (phase === "decelerating") return "phase-decelerating";
  return "phase-stopped";
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
  if (phase === "stopped") return "Zorro is ready for the ride.";
  if (sensation === "heavier") return "Zorro feels heavier than normal.";
  if (sensation === "lighter") return "Zorro feels lighter than normal.";
  return "Zorro feels normal.";
}

/** @param {"upward"|"downward"|"none"} accelDir */
function renderAccelerationIndicator(accelDir) {
  els.accelArrow.classList.remove("accel-up", "accel-down", "accel-none");
  els.accelDirection.classList.remove("dir-up", "dir-down", "dir-none");

  if (accelDir === "upward") {
    els.accelArrow.classList.add("accel-up");
    els.accelDirection.classList.add("dir-up");
    els.accelDirection.textContent = "upward ↑";
    return;
  }

  if (accelDir === "downward") {
    els.accelArrow.classList.add("accel-down");
    els.accelDirection.classList.add("dir-down");
    els.accelDirection.textContent = "downward ↓";
    return;
  }

  els.accelArrow.classList.add("accel-none");
  els.accelDirection.classList.add("dir-none");
  els.accelDirection.textContent = "none";
}

/** @param {number} fn @param {number} fg @param {"gt"|"lt"|"eq"} relation */
function renderFbdArrows(fn, fg, relation) {
  const fgHeight = 140;
  const minFnHeight = 70;
  const maxFnHeight = 180;

  els.fnArrow.classList.remove("larger", "equal");
  els.fgArrow.classList.remove("larger", "equal");

  // Gravity magnitude is constant (mg), so its arrow length stays fixed.
  els.fgArrow.style.height = `${fgHeight}px`;

  if (relation === "eq") {
    els.fnArrow.style.height = `${fgHeight}px`;
    els.fnArrow.classList.add("equal");
    els.fgArrow.classList.add("equal");
    return;
  }

  let fnHeight = clamp((fn / Math.max(fg, 1)) * fgHeight, minFnHeight, maxFnHeight);
  if (Math.abs(fnHeight - fgHeight) < 24) {
    fnHeight = relation === "gt" ? fgHeight + 24 : fgHeight - 24;
  }
  els.fnArrow.style.height = `${fnHeight}px`;

  if (relation === "gt") {
    els.fnArrow.classList.add("larger");
  } else {
    els.fgArrow.classList.add("larger");
  }
}
