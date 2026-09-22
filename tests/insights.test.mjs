import test from 'node:test';
import assert from 'node:assert/strict';
import {object, normalize, copy} from '../city-core.mjs';
import {capacity} from '../city-design.mjs';
import {stackLayout} from '../city-domain.mjs';
import {analyzeLayout, equipmentSchedule, scheduleCSV} from '../city-insights.mjs';

const layout = (objects, warehouse = {width: 20, depth: 20, height: 10}) => normalize({objects, warehouse});
const box = (id, x, y, width = 2, depth = 2, extra = {}) => object('box', x, y, {id, width, depth, height: 1, ...extra});
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('empty layout reports finite zero occupancy and capacity without changing the input', () => {
  const source = layout([]), before = copy(source), result = analyzeLayout(source);
  assert.deepEqual(source, before);
  assert.deepEqual(result.capacity, {palletPositions: 0, boxPositions: 0, actualBoxes: 0});
  assert.equal(result.floor.occupiedArea, 0);
  assert.equal(result.floor.availableArea, 400);
  assert.equal(result.floor.occupancyPercent, 0);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.schedule, []);
});

test('union counts intersecting, identical, contained and touching footprints only once', () => {
  const cases = [
    [[box('a', 5, 5), box('b', 6, 5)], 6],
    [[box('a', 5, 5), box('b', 5, 5), box('c', 5, 5)], 4],
    [[box('a', 5, 5, 4, 4), box('b', 5, 5)], 16],
    [[box('a', 5, 5), box('b', 7, 5)], 8],
    [[box('a', 5, 5), box('b', 7, 7)], 8],
    [[box('a', 4, 4, 4, 2), box('b', 3, 5, 2, 4)], 12]
  ];
  for (const [objects, area] of cases) {
    near(analyzeLayout(layout(objects)).floor.occupiedArea, area);
    near(analyzeLayout(layout([...objects].reverse())).floor.occupiedArea, area);
  }
});

test('rotated union uses true polygons, not bounding boxes or raw summed dimensions', () => {
  const objects = [box('a', 5, 5), box('b', 5, 5, 2, 2, {rotation: 45})];
  near(analyzeLayout(layout(objects)).floor.occupiedArea, 16 - 8 * Math.SQRT2);
  for (const rotation of [13, 45, 90, 180, 270]) {
    near(analyzeLayout(layout([box('r', 5, 5, 4, 2, {rotation})])).floor.occupiedArea, 8);
  }
});

test('warehouse clipping handles rotated corners, outside and fully enclosing objects', () => {
  near(analyzeLayout(layout([box('a', 0, 0, 2, 2, {rotation: 45})])).floor.occupiedArea, 1);
  near(analyzeLayout(layout([box('a', -3, -3)])).floor.occupiedArea, 0);
  near(analyzeLayout(layout([box('a', 10, 10, 100, 100, {rotation: 27})])).floor.occupiedArea, 400);
  const result = analyzeLayout(layout([box('a', 0, 10, 4, 2), box('b', 0, 10, 4, 2)]));
  near(result.floor.occupiedArea, 4);
  assert.equal(result.issues.filter(i => i.code === 'boundary').length, 2);
});

test('common partial edges do not introduce union holes or depend on object order', () => {
  const objects = [box('a', 5, 5, 4, 4), box('b', 8, 5, 2, 2), box('c', 5, 8, 2, 2), box('d', 8, 8, 2, 2)];
  for (let i = 0; i < objects.length; i++) {
    near(analyzeLayout(layout(objects.slice(i).concat(objects.slice(0, i)))).floor.occupiedArea, 28);
  }
});

test('floor footprint excludes zoning, workers, overhead devices and stacked contents', () => {
  const pallet = object('pallet', 5, 5, {id: 'p', width: 2, depth: 2});
  const result = analyzeLayout(layout([
    pallet, box('supported', 5, 5, 2, 2, {supportId: 'p', z: pallet.height}),
    box('raised', 12, 12, 3, 3, {z: 3}),
    object('aisle', 10, 10), object('safety', 3, 3), object('floorStorageZone', 15, 15),
    object('worker', 2, 2), object('textlabel', 8, 8), object('cctv', 8, 8)
  ]));
  near(result.floor.occupiedArea, 4);
  assert.equal(result.floor.method, 'exact-footprint-union');
});

test('placement review identifies boundary, height and overlap with actionable object IDs', () => {
  const result = analyzeLayout(layout([
    box('boundary', 0, 2), box('tall', 4, 4, 2, 2, {height: 11}),
    box('overlap-a', 8, 8), box('overlap-b', 8.5, 8),
    box('on-top', 8, 8, 2, 2, {z: 1, supportId: 'overlap-a'})
  ]));
  assert.deepEqual(result.issues.filter(i => i.code === 'boundary').map(i => i.objectIds[0]), ['boundary', 'tall']);
  const a = result.issues.find(i => i.code === 'overlap' && i.objectIds[0] === 'overlap-a');
  assert.deepEqual(a.objectIds, ['overlap-a', 'overlap-b']);
  assert.ok(a.action.length > 10);
  assert.equal(result.issues.some(i => i.code === 'overlap' && i.objectIds.includes('on-top')), false);
  assert.equal(result.summary.errorCount, 4);
});

test('aisle check uses explicit markings and configurable design width, preserving rotation', () => {
  const source = layout([
    object('aisle', 5, 5, {id: 'narrow', width: 1, depth: 7, rotation: 27}),
    object('aisle', 14, 14, {id: 'wide', width: 8, depth: 2}),
    object('safety', 4, 14, {width: .5, depth: 4})
  ]);
  const issues = analyzeLayout(source, {minAisleWidth: 1.5}).issues;
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'narrow-aisle');
  assert.deepEqual(issues[0].objectIds, ['narrow']);
  assert.equal(issues[0].width, 1);
  assert.equal(issues[0].threshold, 1.5);
  assert.equal(analyzeLayout(source, {minAisleWidth: 1}).issues.length, 0);
  assert.throws(() => analyzeLayout(source, {minAisleWidth: -1}));
});

test('designated aisles report physical floor intrusions even though painted zones are non-solid', () => {
  const result = analyzeLayout(layout([
    object('aisle', 5, 5, {id: 'aisle', width: 3, depth: 8}),
    box('blocking', 5, 5), box('overhead', 5, 8, 1, 1, {z: 3}), object('worker', 5, 3)
  ]));
  const issue = result.issues.find(i => i.code === 'aisle-obstructed');
  assert.deepEqual(issue.objectIds, ['aisle', 'blocking']);
  assert.equal(result.summary.warningCount, 1);
});

test('equipment groups ignore names and rotations but distinguish dimensions and configuration', () => {
  const source = layout([
    object('rack', 4, 4, {id: 'a', name: 'A', config: {bays: 4, levels: 3, excludedBays: [2, 1]}}),
    object('rack', 4, 8, {id: 'b', name: 'B', rotation: 90, config: {excludedBays: [1, 2], levels: 3, bays: 4}}),
    object('rack', 4, 12, {id: 'c', config: {bays: 4, levels: 4}}),
    object('rack', 12, 12, {id: 'd', width: 6, config: {bays: 4, levels: 4}})
  ]);
  const before = copy(source), rows = equipmentSchedule(source);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.find(r => r.quantity === 2).objectIds, ['a', 'b']);
  assert.equal(rows.reduce((n, r) => n + r.palletPositions, 0), capacity(source.objects).palletPositions);
  assert.deepEqual(source, before);
});

test('schedule capacity retains cross-type supports and agrees with whole-layout totals', () => {
  const load = stackLayout({palletWidth: 1.2, palletDepth: 1, palletHeight: .16,
    boxWidth: .4, boxDepth: .3, boxHeight: .25, maxHeight: 1.8, count: 12});
  const source = layout([
    object('pallet', 5, 5, {id: 'p', config: {floorStorage: true}}),
    box('b', 5, 5, .4, .3, {height: .25, z: .16, supportId: 'p'}),
    box('c', 5, 5, .4, .3, {height: .25, z: .41, supportId: 'b'}),
    object('pallet', 8, 8, {id: 'loaded', load}), object('floorStorageZone', 12, 12, {config: {slots: 6}})
  ]);
  const result = analyzeLayout(source);
  assert.deepEqual(result.capacity, capacity(source.objects));
  for (const key of ['palletPositions', 'boxPositions', 'actualBoxes']) {
    assert.equal(result.schedule.reduce((sum, row) => sum + row[key], 0), result.capacity[key]);
  }
  assert.equal(result.schedule.find(row => row.type === 'box').boxPositions, 0);
  assert.equal(result.capacity.actualBoxes, 14);
});

test('CSV includes BOM and Korean headers, escapes quotes/newlines and blocks spreadsheet formulas', () => {
  const dangerous = ['=HYPERLINK("bad")', '+SUM(1,2)', '-1+1', '@cmd', '  =2+2', '\t=2+2', '\r=2+2'];
  for (const name of dangerous) {
    const csv = scheduleCSV(layout([box('a', 4, 4, 2, 2, {name})]));
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    assert.ok(csv.startsWith('\uFEFF"설비 종류"'));
    assert.ok(csv.includes('"\'' + name.replaceAll('"', '""') + '"'), `Unprotected ${JSON.stringify(name)}`);
    assert.ok(csv.endsWith('\r\n'));
  }
  const source = layout([box('a', 4, 4, 2, 2, {name: '포장 "A",\n1구역'})]);
  assert.ok(scheduleCSV(source).includes('"포장 ""A"",\n1구역"'));
  assert.equal(scheduleCSV(source), scheduleCSV(equipmentSchedule(source)));
});

test('invalid raw geometry cannot silently produce misleading occupancy', () => {
  const source = layout([]);
  assert.throws(() => analyzeLayout({...source, warehouse: {...source.warehouse, width: 0}}));
  assert.throws(() => analyzeLayout({...source, objects: [box('bad', NaN, 4)]}));
});
