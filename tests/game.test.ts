import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game';

const run = (g: Game, seconds: number, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) g.advance(dt); };

test('drag snaps to 0.5 m, fine mode to 0.1 m, and stays inside the level window', () => {
  const g = new Game(0);
  g.setVertex(4.26, 5.24);
  assert.deepEqual([g.state.p, g.state.k], [4.5, 5]);
  g.toggleFine();
  g.setVertex(4.26, 5.24);
  assert.deepEqual([g.state.p, g.state.k], [4.3, 5.2]);
  g.setVertex(99, -3);
  assert.deepEqual([g.state.p, g.state.k], [7, 0.5]);
});

test('a miss costs a balloon, shows the flight, then returns to aiming; the wall is the advertised consequence', () => {
  const g = new Game(0);
  g.fire();
  assert.equal(g.state.phase, 'flight');
  assert.equal(g.state.balloonsLeft, 4);
  run(g, 1.2);
  assert.equal(g.state.phase, 'impact');
  assert.equal(g.state.shot!.result.end.id, 'wall');
  run(g, 1.5);
  assert.equal(g.state.phase, 'aim');
  assert.equal(g.state.log[0].unaided, true);
  assert.equal(g.state.log[0].success, false);
});

test('first-try win on level 1 gives three stars; flight timing does not depend on frame size', () => {
  for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
    const g = new Game(0);
    g.setVertex(4, 5);
    g.fire();
    run(g, 6, dt);
    assert.equal(g.state.phase, 'won');
    assert.equal(g.state.stars[0], 3);
  }
});

test('running out of balloons ends in a free refill screen, and restart refills', () => {
  const g = new Game(0);
  for (let i = 0; i < 5; i++) { g.fire(); run(g, 3); }
  assert.equal(g.state.phase, 'out');
  g.restart();
  assert.equal(g.state.phase, 'aim');
  assert.equal(g.state.balloonsLeft, 5);
  assert.equal(g.state.log.length, 5, 'the learning log survives a restart');
});

test('hints are counted and mark the next attempt as hinted', () => {
  const g = new Game(0);
  assert.ok(g.showHint());
  g.setVertex(4, 5);
  g.fire();
  run(g, 5);
  assert.equal(g.state.log[0].hintsUsed, 1);
  assert.equal(g.state.log[0].unaided, false);
});

test('pause freezes the flight', () => {
  const g = new Game(0);
  g.fire();
  run(g, 0.3);
  const x = g.state.ball!.x;
  g.togglePause(true);
  run(g, 2);
  assert.equal(g.state.ball!.x, x);
  g.fire();
  assert.equal(g.state.phase, 'flight');
});

test('the raft drifts before the throw and the flight follows the shifted arc', () => {
  const g = new Game(4);
  g.setVertex(4, 5);
  g.fire();
  assert.equal(g.state.phase, 'drift');
  run(g, 1.2);
  assert.equal(g.state.phase, 'flight');
  assert.ok(Math.abs(g.state.raftX - 2) < 1e-9);
  assert.equal(g.state.shot!.flown.p, 6);
  run(g, 5);
  assert.equal(g.state.phase, 'won');
});

test('return fire: a wrong bucket gets you soaked and retries the same volley; the zero catches it', () => {
  const g = new Game(3);
  assert.equal(g.state.phase, 'card');
  g.setBucket(4); // under the vertex: a classic confusion
  g.fire();
  assert.equal(g.state.phase, 'incoming');
  run(g, 4);
  assert.equal(g.state.lastCatch, false);
  run(g, 1.5);
  assert.equal(g.state.phase, 'card');
  assert.equal(g.state.volleyIndex, 0);
  for (const x of [8, 10, 11]) {
    g.setBucket(x);
    g.fire();
    run(g, 6);
  }
  assert.equal(g.state.phase, 'won');
  assert.equal(g.state.stars[3], 2, 'one soaking costs a star');
});
