// Operator model facing (owner request, upstream #730): an operator's MODEL turns toward the target it is attacking and
// goes back to its deployed direction once the attack animation is over and no further attack follows.
//
// Display only. `dir` is the deploy direction: it rotates the attack range, decides which model is drawn (Front / Back,
// research 07 §5.5) and drives every directional effect — none of that moves here. The renderer already receives every
// attack (`['atk', attacker, target, kind]`) and every unit's position, so the model can be turned from what the snapshot
// says, without asking the sim for it.
//
// This module is the plan the renderer follows (render/app.js windUpAttacks → UnitView.faceTarget):
//   * **one attack = one group.** A group is the attacks of ONE source stamped at ONE event time (one sim tick), not
//     "everything inside the look-ahead window": a fast single-target attacker fires several attacks inside the window, and
//     counting those as one area attack was the reported bug. An area attack's hits share the tick, so they land in one
//     group.
//   * **an attack with more than one DISTINCT target is 群攻 (area) → no turn at all**, not even for its first target: an
//     area attacker's targets differ every swing, so a turn would flicker. Two hits on the SAME target (a 连击 in one tick)
//     are still a single-target attack.
//   * the turn happens when the attack ANIMATION starts (render/app.js turns right after the wind-up was accepted), never
//     before it was accepted.
//   * no turn while the operator is stunned / frozen / asleep (`UnitView.statuses`), and none for an enemy: the stun clip
//     plays in the facing the model already had.
//   * the model goes back to the deployed direction when the attack animation is over and no next attack is coming.
//
// The turnaround itself is the official one: skeleton + mirror + animation, 0.15 s (render/units.js `_startTurn`).
export const FACING_TURN_S = 0.15;      // 换骨架 + 镜像 + 换动画 takes this long

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

/** Attack kinds whose "source" is the previous target of a bounce, not an attacker (render/app.js CHAIN_KINDS). */
const BOUNCE = new Set(['chain', 'chainHeal']);

/** Live-facing states in which the official client keeps the model exactly as it is (its stun clip plays in place). */
export const HELD_FACING = ['stun', 'sleep', 'freeze'];

/**
 * Plan the look-ahead window: every queued event in ascending time order, with the ATTACKS grouped by **one attack** and
 * the area ones marked.
 *
 * One group = one source at one event time (one sim tick). More than one distinct target inside a group means the attack
 * hit several units at once (群攻) — its model must not turn, including its first target.
 *
 * Non-attack events (`skill` on/off, `fx`, …) are part of the plan so the renderer can read them in order — the official
 * cast effects of a wind-up need the skill state just before its attack. They carry `group: null` and `multi: false`.
 *
 * @param {{ forEachUpcoming: (from: number, to: number, fn: (ev: any[], t: number) => void) => void }} interp the
 *   interpolation buffer (render/interp.js SnapshotBuffer)
 * @param {number} from
 * @param {number} to
 * @returns {{ ev: any[], t: number, group: string|null, multi: boolean }[]} ascending by time
 */
export function attackGroups(interp, from, to) {
  const seen = new Map();                       // group key -> Set of distinct target ids
  const list = [];
  interp.forEachUpcoming(from, to, (ev, t) => {
    if (!Array.isArray(ev) || ev[1] == null) return;
    if (ev[0] !== 'atk' || (ev[3] != null && BOUNCE.has(ev[3]))) {
      // not this unit's own attack: a skill toggle rides along, a bounce belongs to the previous target
      list.push({ ev, t, group: null, multi: false });
      return;
    }
    const group = `${ev[1]}|${t}`;
    let targets = seen.get(group);
    if (!targets) seen.set(group, (targets = new Set()));
    if (ev[2] != null) targets.add(ev[2]);
    list.push({ ev, t, group, multi: false });
  });
  for (const entry of list) if (entry.group) entry.multi = (seen.get(entry.group)?.size ?? 0) > 1;
  return list;
}
