import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arcFromVertex, arcFromEquation, fmt, formatFactoredForm, formatVertexForm, landingX, shiftArc, yAt, zeros } from '../src/math/arc';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('arc pinned to the origin: a = −k/p² and lands at 2p', () => {
  const arc = arcFromVertex(0, 0, 4, 5);
  close(arc.a, -5 / 16);
  close(yAt(arc, 0), 0);
  close(yAt(arc, 4), 5);
  close(landingX(arc)!, 8);
});

test('raised launcher: a = (h − k)/p²', () => {
  const arc = arcFromVertex(0, 3, 2, 4);
  close(arc.a, -0.25);
  close(yAt(arc, 0), 3);
  close(landingX(arc)!, 6);
});

test('zeros are symmetric about the axis x = p', () => {
  const arc = arcFromEquation(-0.5, 4, 8, 0);
  const [z1, z2] = zeros(arc);
  close(z1, 0);
  close(z2, 8);
  close((z1 + z2) / 2, arc.p);
});

test('a ≥ 0 never comes back down: no landing', () => {
  assert.equal(landingX(arcFromVertex(0, 3, 2, 3)), null);
  assert.equal(landingX(arcFromVertex(0, 3, 2, 1)), null);
});

test('a horizontal shift moves the vertex and both zeros by the same amount', () => {
  const arc = shiftArc(arcFromVertex(0, 0, 4, 5), 2);
  close(arc.p, 6);
  close(arc.x0, 2);
  const [z1, z2] = zeros(arc);
  close(z1, 2);
  close(z2, 10);
});

test('equations render in Workbook vertex form with real minus signs', () => {
  assert.equal(formatVertexForm({ a: -0.25, p: 2, k: 4 }), 'y = −0.25(x − 2)² + 4');
  assert.equal(formatVertexForm({ a: -5 / 16, p: 4, k: 5 }), 'y = −0.31(x − 4)² + 5');
  assert.equal(formatVertexForm({ a: -1, p: -3, k: -2 }), 'y = −(x + 3)² − 2');
  assert.equal(formatVertexForm({ a: 1, p: 0, k: 0 }), 'y = x²');
  assert.equal(formatVertexForm({ a: 0, p: 2, k: 3 }), 'y = 3');
  assert.equal(formatFactoredForm(-0.5, 2, 10), 'y = −0.5(x − 2)(x − 10)');
  assert.equal(formatFactoredForm(-1, 0, 6), 'y = −x(x − 6)');
  assert.equal(fmt(-0.004), '0');
  assert.equal(fmt(-7 / 25), '−0.28');
});
