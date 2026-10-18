// Operator model facing (render/facing.js): the direction to draw an operator's model in for the target it is attacking.
// Display only — `dir` (the deploy direction that rotates the attack range and picks Front / Back) never moves.
// The renderer decides it from the attack event's target and both units' positions (render/app.js windUpAttacks /
// onAttack), so this rule is the whole geometry of the feature.
// `node --test test/render/facing.test.js`
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { facingDir, facingToward, FACING_TURN_S, HELD_FACING } from '../../public/js/render/facing.js';

test('a target straight above is faced UP, straight right is RIGHT', () => {
  assert.equal(facingDir(0, 1), 'UP');
  assert.equal(facingDir(0, -1), 'DOWN');
  assert.equal(facingDir(1, 0), 'RIGHT');
  assert.equal(facingDir(-1, 0), 'LEFT');
});

test('only past ~60° off the horizontal does a target count as above / below (a 45° diagonal stays level)', () => {
  // tan 60° ≈ 1.732: below it level, above it vertical
  assert.equal(facingDir(1, 1), 'RIGHT', '45° up-right keeps the model level');
  assert.equal(facingDir(1, 1.7), 'RIGHT', 'just below 60°');
  assert.equal(facingDir(1, 1.8), 'UP', 'just past 60°');
  assert.equal(facingDir(-1, -1.8), 'DOWN', 'and the same downwards');
  assert.equal(facingDir(-2, 1), 'LEFT');
});

test('a target hugging the unit (inside a tile) reads as vertical once it is at least as high as it is wide', () => {
  // the only angle a melee operator ever shows: a blocked enemy on an adjacent tile
  assert.equal(facingDir(0.4, 0.4), 'UP', 'a blocked enemy at the up-right corner is looked up at');
  assert.equal(facingDir(0.6, 0.2), 'RIGHT', 'a blocked enemy mostly to the right stays level');
  assert.equal(facingDir(0.4, -0.4), 'DOWN');
  assert.equal(facingDir(0.2, 0.9), 'UP');
});

test('a target on the unit´s own tile has no direction', () => {
  assert.equal(facingDir(0, 0), null);
  assert.equal(facingDir(1e-9, -1e-9), null);
  assert.equal(facingToward({ x: 3, y: 4 }, { x: 3, y: 4 }), null);
});

test('facingToward subtracts the two positions, and never throws on a missing one', () => {
  assert.equal(facingToward({ x: 4.5, y: 9.5 }, { x: 4.5, y: 10.4 }), 'UP');
  assert.equal(facingToward({ x: 4.5, y: 9.5 }, { x: 7.2, y: 9.6 }), 'RIGHT');
  assert.equal(facingToward({ x: 4.5, y: 9.5 }, { x: 4.6, y: 8.2 }), 'DOWN');
  assert.equal(facingToward(null, { x: 1, y: 1 }), null);
  assert.equal(facingToward({ x: 0, y: 0 }, undefined), null);
  assert.equal(facingToward({ x: 0, y: 0 }, { x: 'a', y: 'b' }), null);
});

test('the hold after the last attack is 3 s', () => {
  assert.equal(FACING_TURN_S, 0.15, '换骨架 + 镜像 + 换动画 takes 0.15 s');
  assert.deepEqual(HELD_FACING, ['stun', 'sleep', 'freeze'], 'the states whose clip plays in the facing the model already has');
});
