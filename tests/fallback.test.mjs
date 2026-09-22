import test from 'node:test';
import assert from 'node:assert/strict';
import {supportsWebGL2} from '../city-entry.mjs';
import {editPlanObject, resizePlan, hitPlanObject} from '../city-fallback.mjs';
import {object, normalize, History} from '../city-core.mjs';
import {readSavedLayout} from '../city-storage.mjs';

const empty = () => normalize({warehouse: {width: 20, depth: 20, height: 9}, objects: []});
const layoutWith = objects => normalize({...empty(), objects});

test('WebGL probe selects 2D on unavailable and throwing contexts', () => {
  assert.equal(supportsWebGL2(() => ({getContext: () => null})), false);
  assert.equal(supportsWebGL2(() => ({getContext: () => { throw Error('GPU disabled'); }})), false);
  let requested, released = false;
  assert.equal(supportsWebGL2(() => ({getContext: name => { requested = name; return {getExtension: () => ({loseContext: () => released = true})}; }})), true);
  assert.equal(requested, 'webgl2');
  assert.equal(released, true);
});

test('2D drag rejects a collision atomically and leaves undo history unchanged', () => {
  const a = object('box', 3, 3), b = object('box', 7, 7), original = layoutWith([a, b]);
  const bytes = JSON.stringify(original), history = new History(original);
  assert.throws(() => history.push(editPlanObject(original, a.id, {x: 7, y: 7})), /겹칩니다/);
  assert.equal(JSON.stringify(original), bytes);
  assert.equal(history.items.length, 1);
  const moved = editPlanObject(original, a.id, {x: 9, y: 9}); history.push(moved);
  assert.equal(history.undo().objects[0].x, 3);
  assert.equal(history.redo().objects[0].x, 9);
});

test('2D rotation and movement preserve the support group and original input', () => {
  const pallet = object('pallet', 5, 5), box = object('box', 5.2, 5, {z: .16, supportId: pallet.id});
  const before = layoutWith([pallet, box]), next = editPlanObject(before, pallet.id, {x: 8, y: 8, rotation: 90});
  assert.equal(before.objects[0].x, 5);
  assert.equal(next.objects[1].supportId, pallet.id);
  assert.ok(Math.abs(next.objects[1].x - 8) < 1e-8);
  assert.ok(Math.abs(next.objects[1].y - 7.8) < 1e-8);
  assert.equal(next.objects[1].z, .16);
});

test('2D edits reject nonfinite geometry, locked children, and load resizing', () => {
  const pallet = object('pallet', 5, 5), box = object('box', 5, 5, {z: .16, supportId: pallet.id, locked: true});
  const layout = layoutWith([pallet, box]);
  assert.throws(() => editPlanObject(layout, pallet.id, {x: Infinity}), /숫자/);
  assert.throws(() => editPlanObject(layout, pallet.id, {x: 8}), /잠긴/);
  assert.throws(() => editPlanObject(layout, box.id, {name: 'changed'}), /잠금/);
  const loaded = layoutWith([object('pallet', 5, 5, {load: {totalHeight: 1, boxes: []}})]);
  assert.throws(() => editPlanObject(loaded, loaded.objects[0].id, {width: 3}), /적재/);
});

test('2D warehouse resizing rejects stranded and over-height equipment', () => {
  const layout = layoutWith([object('rack', 15, 15)]);
  assert.throws(() => resizePlan(layout, {width: 10, depth: 10, height: 9}), /경계/);
  assert.throws(() => resizePlan(layout, {width: 20, depth: 20, height: 3}), /경계/);
  assert.throws(() => resizePlan(layout, {width: NaN, depth: 20, height: 9}), /10~200/);
  assert.equal(layout.warehouse.width, 20);
  assert.equal(resizePlan(layout, {width: 30, depth: 25, height: 9}).warehouse.width, 30);
});

test('2D hit testing respects rotated footprints', () => {
  const rack = object('rack', 10, 10, {width: 8, depth: 1, rotation: 90}), layout = layoutWith([rack]);
  assert.equal(hitPlanObject(layout, {x: 10, y: 13})?.id, rack.id);
  assert.equal(hitPlanObject(layout, {x: 13, y: 10}), null);
  assert.equal(hitPlanObject(layout, {x: 0, y: 0}), null);
});

test('2D recovery keeps unreadable saved data intact and blocks autosave', () => {
  const values = new Map([['warehouse-city-v9', '{not-json']]);
  const result = readSavedLayout({getStorage: () => ({getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)}), key: 'warehouse-city-v9', normalize, fallback: empty});
  assert.equal(result.autosaveBlocked, true);
  assert.equal(values.get('warehouse-city-v9'), '{not-json');
  assert.ok([...values.keys()].some(key => key.startsWith('warehouse-city-v9-recovery-')));
});
