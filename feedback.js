/**
 * @typedef {Object} HintContext
 * @property {"up"|"down"} direction
 * @property {"heavier"|"normal"|"lighter"|""} predictionInitial
 * @property {"accelerating"|"cruising"|"decelerating"|"stopped"} phase
 * @property {number} velocity
 * @property {number} acceleration
 * @property {"heavier"|"normal"|"lighter"} sensation
 */

/**
 * Provide concise formative hints based on the current state and student prediction.
 * @param {HintContext} context
 * @returns {string[]}
 */
export function getFormativeHints(context) {
  const hints = [];

  if (context.phase === "cruising" && Math.abs(context.velocity) > 0.25) {
    hints.push(
      "At constant speed, acceleration is zero, so the forces are balanced and sensation should be normal."
    );
  }

  if (context.velocity > 0.2 && context.acceleration < -0.1 && context.sensation === "lighter") {
    hints.push(
      "Moving upward does not always feel heavier. If acceleration points downward, normal force drops and you feel lighter."
    );
  }

  if (context.velocity < -0.2 && context.acceleration > 0.1 && context.sensation === "heavier") {
    hints.push(
      "Moving downward can still feel heavier when acceleration points upward during braking."
    );
  }

  if (context.predictionInitial && context.phase === "accelerating") {
    const expected = context.direction === "up" ? "heavier" : "lighter";
    if (context.predictionInitial !== expected) {
      hints.push(
        `Initial speeding up in this ride should feel ${expected} because acceleration sets the force imbalance, not direction alone.`
      );
    }
  }

  if (context.phase !== "stopped") {
    hints.push(
      "Sensation changes come from normal force changes. Body mass stays the same throughout the ride."
    );
  }

  return unique(hints).slice(0, 3);
}

/**
 * @param {string[]} list
 * @returns {string[]}
 */
function unique(list) {
  return [...new Set(list)];
}
