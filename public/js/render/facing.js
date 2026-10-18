// Operator model facing (owner request): an operator's MODEL turns toward the target it is attacking and goes back to its
// deployed direction a few seconds after the last attack.
//
// Display only. `dir` is the deploy direction: it rotates the attack range, decides which model is drawn (Front / Back,
// research 07 §5.5) and drives every directional effect — none of that moves here. The renderer already receives every
// attack (`['atk', attacker, target, kind]`) and every unit's position, so the model can be turned from what the snapshot
// says, without asking the sim for it.
//
// Rules:
//   * an operator's model turns toward the target it hits — before the attack CLIP starts, not after it (render/app.js
//     windUpAttacks faces the unit, then winds the swing up),
//   * no turn while the operator is stunned / frozen / asleep (`UnitView.statuses`),
//   * no turn for a multi-target attack (群攻): several hits from one operator in one window leave the model alone, so an
//     area attacker does not flicker between its targets,
//   * the model turns back to the deployed direction HOLD seconds after the LAST attack (every attack restarts the hold).
export const FACING_HOLD_S = 3;         // keep the facing this long after the last attack

/** Direction names as the sim / renderer spell them (UP is +row: the board's "up" is a bigger row). */
const UP = 'UP', DOWN = 'DOWN', LEFT = 'LEFT', RIGHT = 'RIGHT';

/**
 * The direction to draw a model in for a target offset (dx = right, dy = up, in tiles). Vertical only past ~60° off the
 * horizontal — the owner's rule ("敌人在上方约 >60° 才朝上转"): a 45° diagonal keeps the model level. A target that hugs
 * the unit (a blocked enemy within a tile) reads as vertical as soon as it is at least as far up/down as sideways: that is
 * the only angle a melee operator ever shows.
 * @param {number} dx
 * @param {number} dy
 * @returns {'UP'|'DOWN'|'LEFT'|'RIGHT'|null} null when the target is on the unit's own tile
 */
export function facingDir(dx, dy) {
  const c = Number(dx) || 0, r = Number(dy) || 0;
  const ac = Math.abs(c), ar = Math.abs(r);
  if (ac < 1e-6 && ar < 1e-6) return null;
  const close = Math.max(ac, ar) < 1 - 1e-6;
  const vertical = close ? ar >= ac - 1e-9 : ar > 1.7320508075688772 * ac;   // tan 60°
  if (vertical) return r > 0 ? UP : DOWN;
  return c > 0 ? RIGHT : LEFT;
}

/** The direction to draw for one unit attacking another (both `{ x, y }` in tiles), or null. */
export function facingToward(unit, target) {
  if (!unit || !target) return null;
  return facingDir(Number(target.x) - Number(unit.x), Number(target.y) - Number(unit.y));
}
