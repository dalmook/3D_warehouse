/** Business quantities and design checks. Pure functions; design dimensions are metres. */
import {CATALOG, footprint, overlap, placementError, solid} from './city-core.mjs';
import {capacity} from './city-design.mjs';

const EPSILON = 1e-9;
const PALLET_TYPES = new Set(['pallet', 'plastic-pallet', 'stack']);
const cross = (a, b) => a.x * b.y - a.y * b.x;
const difference = (a, b) => ({x: a.x - b.x, y: a.y - b.y});
const interpolate = (a, b, t) => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
const nameOf = o => o.name || CATALOG[o.type]?.name || o.type;

function requireLayout(layout) {
  if (!layout || !Array.isArray(layout.objects) || !layout.warehouse ||
      !['width', 'depth', 'height'].every(k => Number.isFinite(layout.warehouse[k]) && layout.warehouse[k] > 0)) {
    throw Error('분석할 창고 크기와 설비 목록을 확인하세요.');
  }
  for (const o of layout.objects) {
    if (!o || !['x', 'y', 'z', 'rotation', 'width', 'depth', 'height'].every(k => Number.isFinite(o[k])) ||
        Math.min(o.width, o.depth, o.height) <= 0) throw Error('분석할 설비의 위치와 크기를 확인하세요.');
  }
}

// Floor footprint excludes painted zones, annotations, workers and supported/raised objects.
// This is the occupied design envelope, not the actual contact area of legs or rack uprights.
const occupiesFloor = o => solid(o) && !o.supportId && o.z <= EPSILON && o.z + (o.load?.totalHeight || o.height) > 0;

function clipToWarehouse(polygon, warehouse) {
  let result = polygon;
  for (const [coordinate, edge, keepGreater] of [
    ['x', 0, true], ['x', warehouse.width, false],
    ['y', 0, true], ['y', warehouse.depth, false]
  ]) {
    const output = [];
    for (let i = 0; i < result.length; i++) {
      const a = result[i], b = result[(i + 1) % result.length];
      const aInside = keepGreater ? a[coordinate] >= edge : a[coordinate] <= edge;
      const bInside = keepGreater ? b[coordinate] >= edge : b[coordinate] <= edge;
      if (aInside) output.push(a);
      if (aInside !== bInside) {
        const point = interpolate(a, b, (edge - a[coordinate]) / (b[coordinate] - a[coordinate]));
        point[coordinate] = edge;
        output.push(point);
      }
    }
    result = output.filter((p, i) => {
      const q = output[(i + output.length - 1) % output.length];
      return Math.hypot(p.x - q.x, p.y - q.y) > EPSILON;
    });
  }
  return result;
}

function polygonArea(polygon) {
  return polygon.reduce((sum, p, i) => sum + cross(p, polygon[(i + 1) % polygon.length]), 0) / 2;
}

function bounds(polygon) {
  return {minX: Math.min(...polygon.map(p => p.x)), maxX: Math.max(...polygon.map(p => p.x)),
    minY: Math.min(...polygon.map(p => p.y)), maxY: Math.max(...polygon.map(p => p.y))};
}

const boundsMeet = (a, b) => a.minX <= b.maxX + EPSILON && a.maxX >= b.minX - EPSILON &&
  a.minY <= b.maxY + EPSILON && a.maxY >= b.minY - EPSILON;

/** Segment parameter interval inside a counterclockwise convex polygon. */
function coveredInterval(a, b, polygon, ownIndex, otherIndex) {
  let from = 0, to = 1;
  const direction = difference(b, a);
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], edge = difference(polygon[(i + 1) % polygon.length], p);
    const length = Math.hypot(edge.x, edge.y);
    const start = cross(edge, difference(a, p)) / length;
    const end = cross(edge, difference(b, p)) / length;
    if (Math.abs(start) <= EPSILON && Math.abs(end) <= EPSILON) {
      // Coincident exterior edges have exactly one owner. Opposite edges are internal.
      if (edge.x * direction.x + edge.y * direction.y > 0 && ownIndex < otherIndex) return null;
      continue;
    }
    if (start < -EPSILON && end < -EPSILON) return null;
    const delta = end - start;
    if (Math.abs(delta) <= EPSILON) continue;
    const crossing = -start / delta;
    if (delta > 0) from = Math.max(from, crossing);
    else to = Math.min(to, crossing);
    if (to - from <= EPSILON) return null;
  }
  return to - from > EPSILON ? [Math.max(0, from), Math.min(1, to)] : null;
}

/**
 * Exact polygon union area, up to floating-point precision. Integrates exposed polygon
 * edges; overlapping regions count once, including coincident and contained polygons.
 * Clipping yields convex polygons. Bounding boxes prune disjoint pairs; no grid sampling.
 */
function unionArea(polygons) {
  const boxes = polygons.map(bounds);
  let total = 0;
  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    const neighbors = polygons.map((_, j) => j).filter(j => j !== i && boundsMeet(boxes[i], boxes[j]));
    for (let k = 0; k < polygon.length; k++) {
      const a = polygon[k], b = polygon[(k + 1) % polygon.length], covered = [];
      for (const j of neighbors) {
        const interval = coveredInterval(a, b, polygons[j], i, j);
        if (interval) covered.push(interval);
      }
      covered.sort((u, v) => u[0] - v[0]);
      let end = 0, visible = 0;
      for (const [from, to] of covered) {
        if (from > end) visible += from - end;
        end = Math.max(end, to);
      }
      visible += 1 - end;
      total += cross(a, b) * Math.max(0, visible) / 2;
    }
  }
  return Math.max(0, total);
}

function stable(value, key = '') {
  if (Array.isArray(value)) {
    const result = value.map(v => stable(v));
    return key === 'excludedBays' ? [...new Set(result)].sort((a, b) => a - b) : result;
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k], k)]));
  return value;
}

function scheduleCapacity(o, objectMap) {
  const result = capacity([o]);
  if (o.type === 'box') {
    let root = o;
    const seen = new Set();
    while (root.supportId && !seen.has(root.id)) {
      seen.add(root.id);
      const parent = objectMap.get(root.supportId);
      if (!parent) break;
      root = parent;
    }
    // Preserve the whole-layout support hierarchy when grouping different object types.
    if (PALLET_TYPES.has(root.type)) result.boxPositions = 0;
  }
  return result;
}

/** All placed object types are scheduled, including marked zones and workers. */
export function equipmentSchedule(layoutOrObjects) {
  const objects = Array.isArray(layoutOrObjects) ? layoutOrObjects : layoutOrObjects?.objects;
  if (!Array.isArray(objects)) throw Error('설비 목록을 확인하세요.');
  const objectMap = new Map(objects.map(o => [o.id, o])), groups = new Map();
  for (const o of objects) {
    const config = stable(o.config || {}), configuration = JSON.stringify(config);
    // Load specification changes rated storage capacity and must form a separate row.
    const loadSpecification = o.load ? stable(Object.fromEntries(Object.entries(o.load).filter(([k]) =>
      !['boxes', 'actual', 'count', 'remaining', 'layers', 'totalHeight', 'palletsNeeded'].includes(k)))) : null;
    const key = JSON.stringify([o.type, o.width, o.depth, o.height, config, loadSpecification]);
    if (!groups.has(key)) groups.set(key, {
      type: o.type, label: CATALOG[o.type]?.name || o.type, width: o.width, depth: o.depth, height: o.height,
      configuration, config, loadSpecification, quantity: 0, palletPositions: 0, boxPositions: 0, actualBoxes: 0,
      objectIds: [], names: []
    });
    const row = groups.get(key), values = scheduleCapacity(o, objectMap);
    row.quantity++;
    row.objectIds.push(o.id);
    row.names.push(nameOf(o));
    for (const k of ['palletPositions', 'boxPositions', 'actualBoxes']) row[k] += values[k];
  }
  return [...groups.values()].sort((a, b) => a.type.localeCompare(b.type, 'en') || a.width - b.width ||
    a.depth - b.depth || a.height - b.height || a.configuration.localeCompare(b.configuration, 'en'));
}

function csvCell(value) {
  let text = String(value ?? '');
  // Quoting alone does not neutralize formulas in spreadsheet applications.
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

/** UTF-8 BOM, CRLF and RFC 4180 escaping for Korean Excel users. */
export function scheduleCSV(layoutOrSchedule) {
  const rows = Array.isArray(layoutOrSchedule) ? layoutOrSchedule : equipmentSchedule(layoutOrSchedule);
  const header = ['설비 종류', '유형 코드', '폭 (m)', '깊이 (m)', '높이 (m)', '수량', '팔레트 보관 위치', '박스 보관 용량', '실제 박스 수', '설비 설정', '적재 규격', '설비명'];
  const values = rows.map(row => [row.label, row.type, row.width, row.depth, row.height, row.quantity,
    row.palletPositions, row.boxPositions, row.actualBoxes, row.configuration,
    row.loadSpecification ? JSON.stringify(row.loadSpecification) : '', (row.names || []).join(' / ')]);
  return '\uFEFF' + [header, ...values].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Read-only checks: existing placement rules, and the chosen width of explicitly marked aisles. */
export function analyzeLayout(layout, {minAisleWidth = 1.2} = {}) {
  requireLayout(layout);
  if (!Number.isFinite(minAisleWidth) || minAisleWidth <= 0) throw Error('통로 폭 기준은 양수로 입력하세요.');
  const objects = layout.objects, warehouseArea = layout.warehouse.width * layout.warehouse.depth;
  const objectBounds = new Map(objects.map(o => [o, bounds(footprint(o))]));
  const floorObjects = objects.filter(occupiesFloor);
  const polygons = floorObjects.map(o => clipToWarehouse(footprint(o), layout.warehouse))
    .filter(polygon => polygon.length >= 3 && polygonArea(polygon) > EPSILON);
  const occupiedArea = Math.min(warehouseArea, unionArea(polygons));
  const issues = [], emptyLayout = {...layout, objects: []};
  const append = (code, severity, objectIds, title, message, action, details = {}) => {
    issues.push({id: `${code}:${objectIds[0]}`, code, severity, objectIds, title, message, action, ...details});
  };
  for (const o of objects) {
    const error = placementError(o, emptyLayout);
    if (error || o.z < 0) append('boundary', 'error', [o.id], '창고 경계 확인',
      `${nameOf(o)}: ${error || '바닥 아래에 배치되어 있습니다.'}`, '위치·회전·높이를 조정해 창고 안으로 옮기세요.');
  }
  // One issue per affected object, retaining all peers, rather than an unbounded pair list.
  const peers = new Map();
  for (let i = 0; i < objects.length; i++) {
    const a = objects[i];
    if (!solid(a)) continue;
    for (let j = i + 1; j < objects.length; j++) {
      const b = objects[j];
      if (a.id !== b.id && solid(b) && boundsMeet(objectBounds.get(a), objectBounds.get(b)) && overlap(a, b)) {
        if (!peers.has(a.id)) peers.set(a.id, []);
        if (!peers.has(b.id)) peers.set(b.id, []);
        peers.get(a.id).push(b.id);
        peers.get(b.id).push(a.id);
      }
    }
  }
  for (const o of objects) if (peers.has(o.id)) append('overlap', 'error', [o.id, ...peers.get(o.id)],
    '설비 간 겹침', `${nameOf(o)}이(가) 다른 설비 ${peers.get(o.id).length}개와 겹칩니다.`,
    '겹친 설비의 위치 또는 크기를 조정하세요. 적층 설비는 받침과 바닥 높이를 확인하세요.');
  for (const aisle of objects.filter(o => o.type === 'aisle')) {
    const width = Math.min(aisle.width, aisle.depth);
    if (width < minAisleWidth - EPSILON) append('narrow-aisle', 'warning', [aisle.id], '설정한 통로 폭 미달',
      `${nameOf(aisle)}의 짧은 변 ${width.toFixed(2)} m가 설정 기준 ${minAisleWidth.toFixed(2)} m보다 작습니다.`,
      '작업 방식과 장비 규격에 맞춰 통로 크기 또는 검토 기준을 조정하세요.', {width, threshold: minAisleWidth});
    const planar = {...aisle, z: 0, height: 1, load: null};
    const intruders = floorObjects.filter(o => overlap(planar, {...o, z: 0, height: 1, load: null}));
    if (intruders.length) append('aisle-obstructed', 'warning', [aisle.id, ...intruders.map(o => o.id)],
      '지정 통로 내 설비', `${nameOf(aisle)}에 바닥 설비 ${intruders.length}개가 겹칩니다.`,
      '지정한 통로 밖으로 설비를 옮기거나 통로 구역을 수정하세요.');
  }
  return {
    capacity: capacity(objects), equipmentCount: objects.length, physicalEquipmentCount: objects.filter(solid).length,
    floor: {warehouseArea, occupiedArea, availableArea: Math.max(0, warehouseArea - occupiedArea),
      occupancyPercent: occupiedArea / warehouseArea * 100, method: 'exact-footprint-union',
      label: '바닥 설비 외곽 면적 · 회전·중복·창고 경계 반영',
      note: '구역 표시와 적층·공중 설비는 제외합니다. 잔여 면적은 작업 가능한 면적이나 통로 확보를 뜻하지 않습니다.'},
    issues, summary: {errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length},
    minAisleWidth, schedule: equipmentSchedule(objects)
  };
}
