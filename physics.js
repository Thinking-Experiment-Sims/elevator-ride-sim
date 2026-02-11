/**
 * @typedef {Object} SimulationConfig
 * @property {"up"|"down"} direction
 * @property {number} startFloor
 * @property {number} endFloor
 * @property {number} floorHeightM
 * @property {number} massKg
 * @property {number} maxSpeedMps
 * @property {number} accelMagMps2
 * @property {number} gMps2
 */

/**
 * @typedef {Object} RideSegment
 * @property {"accelerating"|"cruising"|"decelerating"} phase
 * @property {number} tStart
 * @property {number} duration
 * @property {number} y0
 * @property {number} v0
 * @property {number} a
 */

/**
 * @typedef {Object} SimulationState
 * @property {number} t
 * @property {number} y
 * @property {number} v
 * @property {number} a
 * @property {"accelerating"|"cruising"|"decelerating"|"stopped"} phase
 * @property {number} fn
 * @property {number} fg
 * @property {"lighter"|"normal"|"heavier"} sensation
 */

/**
 * Build a motion profile using trapezoidal or triangular velocity shape.
 * @param {SimulationConfig} config
 * @returns {{segments: RideSegment[], totalTime: number, totalDisplacement: number, vPeak: number, profileType: "trapezoidal"|"triangular"}}
 */
export function buildRideProfile(config) {
  const displacement = (config.endFloor - config.startFloor) * config.floorHeightM;
  const directionSign = Math.sign(displacement) || (config.direction === "up" ? 1 : -1);
  const distance = Math.abs(displacement);
  const aMag = Math.max(config.accelMagMps2, 0.05);
  const vMax = Math.max(config.maxSpeedMps, 0.1);

  const tToVmax = vMax / aMag;
  const dAccelToVmax = 0.5 * aMag * tToVmax * tToVmax;

  let tAccel;
  let tCruise;
  let dAccel;
  let dCruise;
  let vPeak;
  let profileType;

  if (2 * dAccelToVmax <= distance) {
    profileType = "trapezoidal";
    tAccel = tToVmax;
    dAccel = dAccelToVmax;
    dCruise = distance - 2 * dAccel;
    tCruise = dCruise / vMax;
    vPeak = vMax;
  } else {
    profileType = "triangular";
    tAccel = Math.sqrt(distance / aMag);
    dAccel = 0.5 * aMag * tAccel * tAccel;
    dCruise = 0;
    tCruise = 0;
    vPeak = aMag * tAccel;
  }

  const a1 = directionSign * aMag;
  const a3 = -directionSign * aMag;

  /** @type {RideSegment[]} */
  const segments = [];

  segments.push({
    phase: "accelerating",
    tStart: 0,
    duration: tAccel,
    y0: 0,
    v0: 0,
    a: a1,
  });

  segments.push({
    phase: "cruising",
    tStart: tAccel,
    duration: tCruise,
    y0: directionSign * dAccel,
    v0: directionSign * vPeak,
    a: 0,
  });

  segments.push({
    phase: "decelerating",
    tStart: tAccel + tCruise,
    duration: tAccel,
    y0: directionSign * (dAccel + dCruise),
    v0: directionSign * vPeak,
    a: a3,
  });

  return {
    segments,
    totalTime: 2 * tAccel + tCruise,
    totalDisplacement: displacement,
    vPeak,
    profileType,
  };
}

/**
 * @param {{segments: RideSegment[], totalTime: number, totalDisplacement: number}} profile
 * @param {number} t
 * @param {SimulationConfig} config
 * @returns {SimulationState}
 */
export function sampleStateAtTime(profile, t, config) {
  const clampedT = clamp(t, 0, profile.totalTime);
  const fg = config.massKg * config.gMps2;

  if (clampedT >= profile.totalTime) {
    return withForces(
      {
        t: clampedT,
        y: profile.totalDisplacement,
        v: 0,
        a: 0,
        phase: "stopped",
      },
      config.massKg,
      fg
    );
  }

  const segment = profile.segments.find((seg) => clampedT < seg.tStart + seg.duration) || profile.segments[2];
  const dt = clampedT - segment.tStart;
  const y = segment.y0 + segment.v0 * dt + 0.5 * segment.a * dt * dt;
  const v = segment.v0 + segment.a * dt;

  return withForces(
    {
      t: clampedT,
      y,
      v,
      a: segment.a,
      phase: segment.phase,
    },
    config.massKg,
    fg
  );
}

/**
 * @param {{t:number, y:number, v:number, a:number, phase:"accelerating"|"cruising"|"decelerating"|"stopped"}} state
 * @param {number} massKg
 * @param {number} fg
 * @returns {SimulationState}
 */
function withForces(state, massKg, fg) {
  // Prevent nonphysical negative contact force in extreme settings.
  const fn = Math.max(0, massKg * (9.81 + state.a));
  return {
    ...state,
    fn,
    fg,
    sensation: deriveSensation(fn, fg),
  };
}

/**
 * @param {number} fn
 * @param {number} fg
 * @returns {"lighter"|"normal"|"heavier"}
 */
export function deriveSensation(fn, fg) {
  const tol = Math.max(0.02 * fg, 0.5);
  if (fn > fg + tol) return "heavier";
  if (fn < fg - tol) return "lighter";
  return "normal";
}

/**
 * @param {number} m
 * @param {number} g
 * @param {number} a
 * @returns {number}
 */
export function normalForce(m, g, a) {
  return m * (g + a);
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
