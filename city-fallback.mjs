import {CATALOG, copy, object, normalize, demo, footprint, placementError, History, repoPath, utf8base64, fromBase64} from './city-core.mjs';
import {capacity, planRacks} from './city-design.mjs';
import {closure, transformSupported, cloneGroup} from './city-domain.mjs';
import {appendLayoutObjects, pasteLayout} from './city-editing.mjs';
import {readSavedLayout, githubRequest, compareLayouts} from './city-storage.mjs';
import {download, exportSVG, exportDXF, imageCanvas, reportPDF} from './city-output.mjs';

const KEY = 'warehouse-city-v9';
const geometry = ['x', 'y', 'z', 'width', 'depth', 'height', 'rotation'];
const thumbnails = new Map();
/** Small schematic thumbnails, rendered without a GPU or a remote asset request. */
function thumbnail(type, definition) {
  if (thumbnails.has(type)) return thumbnails.get(type);
  const color = /^#[0-9a-f]{6}$/i.test(definition.color) ? definition.color : '#5d889c';
  const cube = (x, y, width, height, depth, fill = color) => `<path d="M${x} ${y}l${width} 0 ${depth} -${depth / 2} -${width} 0Z" fill="${fill}" opacity=".75"/><path d="M${x} ${y}v${height}h${width}v-${height}Z" fill="${fill}"/><path d="M${x + width} ${y}l${depth} -${depth / 2}v${height}l-${depth} ${depth / 2}Z" fill="${fill}" opacity=".55"/>`;
  let shape;
  if (['rack', 'boxrack', 'shelf'].includes(type)) {
    shape = '';
    for (const x of [27, 62, 97]) shape += cube(x, 12, 3, 47, 8, '#416b83');
    for (const y of [26, 42, 58]) { shape += cube(27, y, 74, 3, 8, '#d89241'); for (const x of [34, 70]) shape += cube(x, y - 11, 23, 10, 6, '#cfa375'); }
  } else if (type === 'worker') shape = '<circle cx="65" cy="17" r="8" fill="#63838e"/><path d="M54 29Q65 24 76 29L80 49H73L72 65H65L62 49H60L59 65H52L54 43L48 49L44 44Z" fill="' + color + '"/>';
  else if (['pallet', 'plastic-pallet', 'stack'].includes(type)) { shape = ''; for (let i = 0; i < 5; i++) shape += cube(27 + i * 12, 43, 10, 6, 23); if (type === 'stack') for (const x of [30, 52, 74]) shape += cube(x, 24, 20, 19, 20, '#caa074'); }
  else if (['forklift', 'handpallet'].includes(type)) shape = cube(27, 35, 35, 18, 20) + cube(78, 12, 4, 43, 5, '#486879') + '<path d="M82 54H106M87 51H111" stroke="#486879" stroke-width="4"/><circle cx="35" cy="56" r="8" fill="#3d5663"/><circle cx="65" cy="56" r="8" fill="#3d5663"/>';
  else if (['aisle', 'safety', 'floorStorageZone', 'waypoint'].includes(type)) shape = '<path d="M24 45L72 17L112 38L64 65Z" fill="' + color + '" opacity=".22" stroke="' + color + '" stroke-width="2" stroke-dasharray="4 3"/><path d="M43 46L91 35M84 31L92 35L88 42" fill="none" stroke="' + color + '" stroke-width="3"/>';
  else if (type === 'conveyor' || type === 'worktable') { shape = cube(25, 32, 70, 9, 22); for (const x of [29, 87]) shape += cube(x, 42, 4, 15, 3, '#63808d'); if (type === 'conveyor') for (let x = 33; x < 95; x += 9) shape += '<path d="M' + x + ' 30l16 -8" stroke="#d8e3e9" stroke-width="2"/>'; }
  else if (['dock', 'door'].includes(type)) shape = cube(30, 15, 7, 44, 8) + cube(91, 15, 7, 44, 8) + cube(30, 15, 68, 7, 8) + '<path d="M40 28H88M40 36H88M40 44H88" stroke="#b4cbd3" stroke-width="4"/>';
  else shape = cube(33, 28, 53, type === 'partition' ? 28 : 30, 23);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 76"><ellipse cx="71" cy="66" rx="45" ry="5" fill="#274759" opacity=".07"/>${shape}</svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); thumbnails.set(type, url); return url;
}

/** Shared transaction boundary, also exercised in the no-WebGL regression tests. */
export function editPlanObject(layout, id, changes) {
  const next = copy(layout), before = layout.objects.find(o => o.id === id), after = next.objects.find(o => o.id === id);
  if (!before) throw Error('설비를 먼저 선택하세요.');
  if (before.locked && changes.locked !== false) throw Error('잠금을 먼저 해제하세요.');
  Object.assign(after, copy(changes));
  if (geometry.some(k => !Number.isFinite(after[k])) || after.width < .05 || after.depth < .05 || after.height < .01 || after.z < 0) throw Error('위치와 크기는 유효한 숫자로 입력하세요.');
  const moved = geometry.some(k => before[k] !== after[k]);
  if (moved) {
    if (before.load && ['width', 'depth', 'height'].some(k => before[k] !== after[k])) throw Error('적재된 팔레트의 크기는 적재 도구에서 변경하세요.');
    const family = closure(next.objects, [id]);
    if (family.some(o => o.id !== id && o.locked)) throw Error('받침 위의 잠긴 설비를 먼저 해제하세요.');
    transformSupported(next.objects, before, after);
    for (const o of family) { const error = placementError(o, next); if (error) throw Error(error); }
  }
  return normalize(next);
}

export function resizePlan(layout, warehouse) {
  if (!Object.values(warehouse).every(Number.isFinite) || warehouse.width < 10 || warehouse.width > 200 || warehouse.depth < 10 || warehouse.depth > 200 || warehouse.height < 3 || warehouse.height > 30) throw Error('가로·세로 10~200m, 높이 3~30m로 입력하세요.');
  const next = {...copy(layout), warehouse: {...layout.warehouse, ...warehouse}};
  for (const o of next.objects) {
    const error = placementError(o, {...next, objects: []});
    if (error) throw Error('배치된 설비가 새 창고 경계를 벗어납니다.');
  }
  return normalize(next);
}

export function hitPlanObject(layout, point) {
  return [...layout.objects].reverse().find(o => {
    const angle = o.rotation * Math.PI / 180, dx = point.x - o.x, dy = point.y - o.y;
    return Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)) <= o.width / 2 && Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)) <= o.depth / 2;
  }) || null;
}

export async function startFallback() {
  const $ = id => document.getElementById(id), canvas = $('scene'), ctx = canvas.getContext('2d');
  if (!ctx) throw Error('이 브라우저는 2D 도면 화면을 지원하지 않습니다.');
  let {layout, autosaveBlocked, loadWarning} = readSavedLayout({getStorage: () => localStorage, key: KEY, normalize, fallback: demo});
  const history = new History(layout), selectedIds = new Set();
  let selected = null, tool = null, brush = null, rotation = 0, drag = null, hover = null, view = {scale: 1, x: 0, y: 0}, zoom = 1, pan = {x: 0, y: 0}, showGrid = true, showDimensions = true, toastTimer, backgroundImage = null, backgroundSrc = '';
  document.body.classList.add('edit', 'canvas-fallback');
  document.documentElement.dataset.renderer = 'canvas2d';
  $('stage').setAttribute('aria-label', '창고 평면 설계');
  canvas.setAttribute('aria-label', '2D 창고 평면. 설비 선택, 드래그 이동, 휠 확대');
  canvas.style.touchAction = 'none';
  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = safe(fn); };
  const emit = name => document.dispatchEvent(new Event(name));
  function safe(fn) { return async (...args) => { try { return await fn(...args); } catch (e) { toast(e.message); } }; }
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
  function persist() {
    if (autosaveBlocked) { $('saveState').textContent = '원본 보호 중 · JSON으로 내보내 보관하세요'; return; }
    try { localStorage.setItem(KEY, JSON.stringify(layout)); $('saveState').textContent = '이 기기에 저장됨 · ' + new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'}); }
    catch { $('saveState').textContent = '자동 저장 실패 · JSON 내보내기가 필요합니다'; toast('저장 공간이 부족하거나 저장소 접근이 차단되었습니다. JSON으로 내보내세요.'); }
  }
  function commit(raw) { const next = normalize(raw); layout = next; history.push(next); persist(); sync(); emit('city-change'); }
  function replace(raw) { const next = normalize(raw); selected = null; selectedIds.clear(); cancelTool(); commit(next); fit(); }
  function select(id) { selected = layout.objects.some(o => o.id === id) ? id : null; syncInspector(); draw(); emit('city-selection'); }
  function ids() { return selectedIds.size ? [...selectedIds] : selected ? [selected] : []; }
  function cancelTool() { tool = null; brush = null; hover = null; drag = null; canvas.style.cursor = 'default'; catalogue(); draw(); }
  function fit() { zoom = 1; pan = {x: 0, y: 0}; resize(); }
  function focus(id) { select(id); const o = layout.objects.find(o => o.id === id); if (o) { pan = {x: (layout.warehouse.width / 2 - o.x) * view.scale, y: (layout.warehouse.depth / 2 - o.y) * view.scale}; draw(); } }
  function unavailable() { toast('이 브라우저에서는 평면 설계를 사용합니다. 3D·운영·내부 체험은 WebGL 2 지원 환경에서 이용하세요.'); }
  function setMode(mode) { if (mode !== 'edit') unavailable(); }
  const point = e => { const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left - view.x) / view.scale, y: (e.clientY - r.top - view.y) / view.scale}; };
  function snap(n) { const step = Number($('snapStep')?.value ?? .5); return step ? Math.round(n / step) * step : Math.round(n * 100) / 100; }
  function screenPoint(x, y) { const r = canvas.getBoundingClientRect(); return {x: r.left + view.x + x * view.scale, y: r.top + view.y + y * view.scale}; }
  function updateView() {
    const r = canvas.getBoundingClientRect(), width = Math.max(1, r.width), height = Math.max(1, r.height), w = layout.warehouse;
    const base = Math.max(.2, Math.min((width - 112) / w.width, (height - 230) / w.depth));
    view = {scale: base * zoom, x: (width - w.width * base * zoom) / 2 + pan.x, y: (height - w.depth * base * zoom) / 2 + pan.y - 10};
  }
  function resize() { const r = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.round(r.width * ratio)); canvas.height = Math.max(1, Math.round(r.height * ratio)); draw(); }
  function polygon(context, o) { context.beginPath(); footprint(o).forEach((p, i) => context[i ? 'lineTo' : 'moveTo'](p.x, p.y)); context.closePath(); }
  function drawEquipment(context, o, scale, active = false, preview = false) {
    const zone = ['aisle', 'safety', 'floorStorageZone', 'waypoint'].includes(o.type);
    context.save(); polygon(context, o); context.fillStyle = o.color || '#78a3ac'; context.globalAlpha = preview ? .5 : zone ? .15 : .73; context.fill(); context.globalAlpha = 1; context.lineWidth = (active ? 2.5 : .8) / scale; context.strokeStyle = active ? '#167d78' : zone ? o.color : '#425e6a'; if (zone) context.setLineDash([4 / scale, 3 / scale]); context.stroke(); context.setLineDash([]);
    context.translate(o.x, o.y); context.rotate(-o.rotation * Math.PI / 180);
    if (['rack', 'boxrack', 'shelf'].includes(o.type)) {
      const bays = Math.min(100, o.config?.bays || 4); context.strokeStyle = '#e7f2f4'; context.lineWidth = 1 / scale;
      for (let i = 1; i < bays; i++) { const x = -o.width / 2 + o.width * i / bays; context.beginPath(); context.moveTo(x, -o.depth / 2); context.lineTo(x, o.depth / 2); context.stroke(); }
      context.strokeStyle = '#385565'; context.lineWidth = 2 / scale;
      for (const y of [-o.depth / 2, o.depth / 2]) { context.beginPath(); context.moveTo(-o.width / 2, y); context.lineTo(o.width / 2, y); context.stroke(); }
    }
    if (['pallet', 'plastic-pallet', 'stack'].includes(o.type)) {
      context.strokeStyle = '#87623b'; context.lineWidth = 1 / scale;
      for (let i = 1; i < 4; i++) { const x = -o.width / 2 + o.width * i / 4; context.beginPath(); context.moveTo(x, -o.depth / 2); context.lineTo(x, o.depth / 2); context.stroke(); }
    }
    context.restore();
    if (!preview && scale > 7 && o.width * scale > 30) {
      const label = o.name || CATALOG[o.type]?.name || o.type; context.save(); context.font = `500 ${11 / scale}px system-ui,sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#203f4b';
      const y = o.y + (o.depth * scale < 20 ? o.depth / 2 + 10 / scale : 0); context.fillText(label, o.x, y, Math.max(40 / scale, o.width)); context.restore();
    }
    if (active && showDimensions) {
      context.save(); context.font = `600 ${11 / scale}px system-ui,sans-serif`; context.fillStyle = '#107b74'; context.textAlign = 'center'; context.fillText(`${o.width} × ${o.depth} m`, o.x, o.y - o.depth / 2 - 10 / scale); context.restore();
    }
  }
  function draw() {
    if (!canvas.width || !canvas.height) return;
    updateView(); const r = canvas.getBoundingClientRect(), ratio = canvas.width / Math.max(1, r.width), dark = document.documentElement.dataset.theme !== 'light' && !!document.documentElement.dataset.theme;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, r.width, r.height); ctx.fillStyle = dark ? '#132b3c' : '#edf2f4'; ctx.fillRect(0, 0, r.width, r.height);
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale); const w = layout.warehouse;
    ctx.shadowColor = '#233f5016'; ctx.shadowBlur = 24 / view.scale; ctx.fillStyle = dark ? '#1c394c' : '#fff'; ctx.fillRect(0, 0, w.width, w.depth); ctx.shadowBlur = 0;
    if (backgroundImage && layout.background) { const b = layout.background; ctx.save(); ctx.globalAlpha = b.opacity ?? .4; ctx.drawImage(backgroundImage, b.x - b.width / 2, b.y - b.depth / 2, b.width, b.depth); ctx.restore(); }
    if (showGrid && view.scale > 2) { const step = view.scale > 18 ? .5 : view.scale > 7 ? 1 : 5; ctx.lineWidth = .5 / view.scale; ctx.strokeStyle = dark ? '#335366' : '#e0e9eb'; ctx.beginPath(); for (let x = 0; x <= w.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, w.depth); } for (let y = 0; y <= w.depth; y += step) { ctx.moveTo(0, y); ctx.lineTo(w.width, y); } ctx.stroke(); }
    ctx.lineWidth = 2 / view.scale; ctx.strokeStyle = dark ? '#759bae' : '#718994'; ctx.strokeRect(0, 0, w.width, w.depth);
    const ordered = [...layout.objects].sort((a, b) => (a.z || 0) - (b.z || 0));
    for (let o of ordered) { if (drag?.preview?.id === o.id) o = drag.preview; drawEquipment(ctx, o, view.scale, o.id === selected || selectedIds.has(o.id)); }
    if (tool && hover) drawEquipment(ctx, brush ? {...brush, x: snap(hover.x), y: snap(hover.y), rotation} : object(tool, snap(hover.x), snap(hover.y), {rotation}), view.scale, true, true);
    if (showDimensions) { ctx.font = `600 ${12 / view.scale}px system-ui,sans-serif`; ctx.fillStyle = dark ? '#c6e0ed' : '#5c7480'; ctx.textAlign = 'center'; ctx.fillText(`${w.width} m`, w.width / 2, -16 / view.scale); ctx.save(); ctx.translate(-20 / view.scale, w.depth / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${w.depth} m`, 0, 0); ctx.restore(); }
    ctx.restore(); minimap();
  }
  function minimap() {
    const c = $('minimap'), context = c.getContext('2d'), w = layout.warehouse, scale = Math.min((c.width - 30) / w.width, (c.height - 30) / w.depth);
    context.clearRect(0, 0, c.width, c.height); context.save(); context.translate((c.width - w.width * scale) / 2, (c.height - w.depth * scale) / 2); context.scale(scale, scale); context.fillStyle = '#f3f7f8'; context.fillRect(0, 0, w.width, w.depth);
    for (const o of layout.objects) { polygon(context, o); context.fillStyle = o.id === selected ? '#147f79' : o.color; context.globalAlpha = ['aisle', 'safety'].includes(o.type) ? .3 : .8; context.fill(); } context.restore();
  }
  function syncInspector() {
    const o = layout.objects.find(o => o.id === selected); $('selectionEmpty').hidden = !!o; $('inspector').hidden = !o;
    $('multiCount').textContent = ids().length ? `${ids().length}개 선택` : 'Shift+클릭으로 여러 설비 선택';
    if (!o) return;
    $('objectName').value = o.name; $('objectColor').value = o.color; $('ol').checked = o.locked;
    for (const [id, key] of Object.entries({ox: 'x', oy: 'y', oz: 'z', ow: 'width', od: 'depth', oh: 'height', or: 'rotation'})) $(id).value = o[key];
    $('rackConfig').hidden = !['rack', 'boxrack', 'shelf'].includes(o.type); $('rackBays').value = o.config?.bays || 4; $('rackLevels').value = o.config?.levels || 4;
    $('oneWay').value = o.config?.oneWay || ''; $('allowedResource').value = o.config?.allowed?.[0] || '';
  }
  function sync() {
    if (!layout.objects.some(o => o.id === selected)) selected = null;
    for (const id of selectedIds) if (!layout.objects.some(o => o.id === id)) selectedIds.delete(id);
    $('projectName').value = layout.projectName; $('warehouseW').value = layout.warehouse.width; $('warehouseD').value = layout.warehouse.depth; $('warehouseH').value = layout.warehouse.height;
    const issues = layout.objects.filter(o => placementError(o, layout));
    [['바닥 면적', layout.warehouse.width * layout.warehouse.depth, '㎡'], ['배치 설비', layout.objects.length, '개'], ['팔레트 보관 위치', capacity(layout.objects).palletPositions, '위치'], ['배치 검토', issues.length, '건']].forEach(([label, value, unit], i) => { $(`s${i + 1}l`).textContent = label; $(`s${i + 1}`).textContent = value; $(`s${i + 1}u`).textContent = unit; });
    $('review').textContent = issues.length ? `배치 검토 ${issues.length}건 · 겹침과 창고 경계를 확인하세요.` : '설비 겹침·경계 검사 완료 · JSON과 GitHub에 도면을 보관할 수 있습니다.';
    $('undoBtn').disabled = history.index === 0; $('redoBtn').disabled = history.index === history.items.length - 1;
    const src = layout.background?.data || ''; if (src !== backgroundSrc) { backgroundSrc = src; backgroundImage = null; if (src) { const img = new Image(); img.onload = () => { if (backgroundSrc === src) { backgroundImage = img; draw(); } }; img.src = src; } }
    syncInspector(); draw();
  }
  function catalogue() {
    const search = $('search').value.trim().toLowerCase(), category = $('category').value; $('catalog').replaceChildren();
    for (const [type, d] of Object.entries(CATALOG)) { if (category !== '전체' && category !== d.group || search && !(`${d.name} ${type}`).toLowerCase().includes(search)) continue; const b = document.createElement('button'); b.className = 'asset' + (tool === type ? ' active' : ''); b.dataset.type = type; b.setAttribute('aria-label', d.name); const icon = document.createElement('img'); icon.src = thumbnail(type, d); icon.alt = d.name + ' 설비 개요'; const label = document.createElement('b'); label.textContent = d.name; const size = document.createElement('small'); size.textContent = `${d.width} × ${d.depth} m`; b.append(icon, label, size); b.onclick = () => { tool = type; brush = null; rotation = 0; canvas.style.cursor = 'crosshair'; catalogue(); toast(`${d.name} · 바닥을 클릭해 배치 · R 회전 · Esc 취소`); }; $('catalog').append(b); }
  }
  function modify(changes) { commit(editPlanObject(layout, selected, changes)); }
  function removeSelected() { const family = closure(layout.objects, ids()); if (family.some(o => o.locked)) throw Error('잠긴 설비를 먼저 해제하세요.'); const removed = new Set(family.map(o => o.id)); commit({...layout, objects: layout.objects.filter(o => !removed.has(o.id))}); }
  function undo() { cancelTool(); layout = history.undo(); persist(); sync(); emit('city-change'); }
  function redo() { cancelTool(); layout = history.redo(); persist(); sync(); emit('city-change'); }
  canvas.addEventListener('pointerdown', safe(e => {
    if (e.button !== 0 && e.button !== 1) return; canvas.focus(); const p = point(e);
    if (e.button === 1 || e.altKey) { drag = {pan: true, clientX: e.clientX, clientY: e.clientY, start: {...pan}}; canvas.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (tool) { const added = brush ? cloneGroup(layout.objects, [brush.id], {x: snap(p.x) - brush.x, y: snap(p.y) - brush.y, rotation: rotation - brush.rotation}) : [object(tool, snap(p.x), snap(p.y), {rotation})]; const next = brush ? pasteLayout(layout, added, {source: closure(layout.objects, [brush.id])}) : appendLayoutObjects(layout, added); commit(next); select(added[0].id); return; }
    const o = hitPlanObject(layout, p);
    if (e.shiftKey && o) { if (selected) selectedIds.add(selected); selectedIds.has(o.id) ? selectedIds.delete(o.id) : selectedIds.add(o.id); select(o.id); return; }
    selectedIds.clear(); select(o?.id); if (o && !o.locked) { drag = {id: o.id, point: p, before: copy(o), preview: copy(o), moved: false}; canvas.setPointerCapture(e.pointerId); } else if (o?.locked) toast('잠긴 설비입니다. 속성에서 잠금을 해제하세요.');
  }));
  canvas.addEventListener('pointermove', e => { const p = point(e); hover = p; if (drag?.pan) { pan = {x: drag.start.x + e.clientX - drag.clientX, y: drag.start.y + e.clientY - drag.clientY}; } else if (drag) { drag.preview.x = snap(drag.before.x + p.x - drag.point.x); drag.preview.y = snap(drag.before.y + p.y - drag.point.y); drag.moved ||= drag.preview.x !== drag.before.x || drag.preview.y !== drag.before.y; } if (tool || drag) draw(); });
  canvas.addEventListener('pointerup', safe(e => { const pending = drag; drag = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); if (pending?.moved) { try { commit(editPlanObject(layout, pending.id, {x: pending.preview.x, y: pending.preview.y})); } finally { draw(); } } else draw(); }));
  canvas.addEventListener('pointercancel', () => { drag = null; draw(); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); const before = point(e), r = canvas.getBoundingClientRect(); zoom = Math.max(.35, Math.min(6, zoom * (e.deltaY > 0 ? .9 : 1.1))); updateView(); pan.x += e.clientX - r.left - (view.x + before.x * view.scale); pan.y += e.clientY - r.top - (view.y + before.y * view.scale); draw(); }, {passive: false});
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (tool) { rotation = (rotation + 90) % 360; draw(); } });
  bind('applyObject', () => { const current = layout.objects.find(o => o.id === selected); if (!current) return; const changes = {name: $('objectName').value.trim() || current.name, color: $('objectColor').value, locked: $('ol').checked, config: {...current.config}}; for (const [id, key] of Object.entries({ox: 'x', oy: 'y', oz: 'z', ow: 'width', od: 'depth', oh: 'height', or: 'rotation'})) { if ($(id).value === '') throw Error('숫자 입력을 확인하세요.'); changes[key] = Number($(id).value); } if (!$('rackConfig').hidden) { const bays = Number($('rackBays').value), levels = Number($('rackLevels').value); if (![bays, levels].every(v => Number.isInteger(v) && v >= 1 && v <= 1000)) throw Error('랙 칸 수와 단수는 1~1000 정수로 입력하세요.'); Object.assign(changes.config, {bays, levels}); } if (current.type === 'aisle') changes.config.oneWay = $('oneWay').value; if (current.type === 'safety') changes.config.allowed = $('allowedResource').value ? [$('allowedResource').value] : []; modify(changes); });
  bind('resizeBtn', () => { commit(resizePlan(layout, {width: Number($('warehouseW').value), depth: Number($('warehouseD').value), height: Number($('warehouseH').value)})); fit(); });
  $('projectName').onchange = safe(() => commit({...layout, projectName: $('projectName').value.trim() || '나의 물류센터'}));
  bind('rotateBtn', () => { const o = layout.objects.find(o => o.id === selected); if (o) modify({rotation: (o.rotation + 90) % 360}); });
  bind('deleteBtn', removeSelected); bind('duplicateBtn', () => { const source = layout.objects.find(o => o.id === selected); if (!source) return; brush = copy(source); tool = brush.type; rotation = brush.rotation; toast('바닥을 클릭해 선택 설비와 적재 묶음을 복제하세요.'); });
  bind('undoBtn', undo); bind('redoBtn', redo); bind('topBtn', fit); bind('isoBtn', unavailable);
  $('search').oninput = catalogue; $('category').onchange = catalogue;
  bind('demoBtn', () => { if (confirm('현재 도면을 표준 물류센터로 바꿀까요? 실행 취소로 복구할 수 있습니다.')) replace(demo()); });
  bind('qualityDemo', async () => { if (confirm('작은 창고 템플릿을 열까요? 실행 취소로 복구할 수 있습니다.')) { const {qualityDemo} = await import('./city-logistics.mjs'); replace(qualityDemo()); } });
  bind('blankBtn', () => { if (confirm('빈 창고를 만들까요? 실행 취소로 복구할 수 있습니다.')) replace({...demo(), projectName: '새 물류센터', objects: []}); });
  const filename = () => layout.projectName.replace(/[\\/:*?"<>|]/g, '_');
  const exportJSON = () => download(JSON.stringify(layout, null, 2), filename() + '.json', 'application/json');
  ['exportBtn', 'backupBtn', 'ghBackup'].forEach(id => bind(id, exportJSON));
  bind('importBtn', () => $('importFile').click());
  $('importFile').onchange = safe(async e => { try { const file = e.target.files[0]; if (!file) return; if (file.size > 5_000_000) throw Error('5MB 이하 JSON만 불러올 수 있습니다.'); const next = normalize(JSON.parse(await file.text())); if (confirm('선택한 도면을 열까요? 실행 취소로 복구할 수 있습니다.')) replace(next); } finally { e.target.value = ''; } });
  bind('legacyImport', () => { const saved = localStorage.getItem('warehouse-studio-project-v1'); if (!saved) throw Error('이 기기에 기존 도면이 없습니다. JSON으로 불러오세요.'); const raw = JSON.parse(saved), next = normalize(raw.project || raw); if (confirm('기존 도면을 가져올까요?')) replace(next); });
  bind('multiAll', () => { selectedIds.clear(); layout.objects.forEach(o => selectedIds.add(o.id)); select(layout.objects[0]?.id); }); bind('multiClear', () => { selectedIds.clear(); select(null); });
  document.querySelectorAll('[data-batch]').forEach(b => b.onclick = safe(() => { const action = b.dataset.batch, chosen = ids(); if (!chosen.length) throw Error('설비를 먼저 선택하세요.'); if (action === 'delete') return removeSelected(); const family = closure(layout.objects, chosen); if (action === 'duplicate') { const added = cloneGroup(layout.objects, chosen, {x: Number($('multiX').value), y: Number($('multiY').value)}); return commit(pasteLayout(layout, added, {source: family})); } if (family.some(o => o.locked)) throw Error('잠긴 설비를 먼저 해제하세요.'); const n = copy(layout), rootIds = chosen.filter(id => !family.some(o => o.id === id && chosen.includes(o.supportId))), roots = rootIds.map(id => n.objects.find(o => o.id === id)); const dx = Number($('multiX').value), dy = Number($('multiY').value); if (![dx, dy].every(Number.isFinite)) throw Error('이동량을 확인하세요.'); roots.sort((a, b) => a.x - b.x); const min = roots[0].x, max = roots.at(-1).x; roots.forEach((o, i) => { const before = copy(o); if (action === 'move') { o.x += dx; o.y += dy; } if (action === 'alignX') o.x = min; if (action === 'alignY') o.y = roots[0].y; if (action === 'spaceX') o.x = min + (max - min) * i / Math.max(1, roots.length - 1); transformSupported(n.objects, before, o); }); for (const o of n.objects.filter(o => family.some(f => f.id === o.id))) { const error = placementError(o, n); if (error) throw Error(error); } commit(n); }));
  function rackPlan() { return planRacks(layout, {x: Number($('rowX').value), y: Number($('rowY').value), columns: Number($('rowCount').value), gap: Number($('rowGap').value), rows: Number($('rackRows').value), width: Number($('rowWidth').value), depth: Number($('rowDepth').value), height: Number($('rowHeight').value), bays: Number($('rowBays').value), levels: Number($('rowLevels').value), aisle: Number($('rowAisle').value), wall: Number($('rowWall').value), doubleSided: $('rowDouble').checked}); }
  bind('rowBtn', () => $('rowDialog').showModal()); bind('rowClose', () => $('rowDialog').close());
  bind('rowPreview', () => { const plan = rackPlan(); $('rowSummary').textContent = `${plan.added.length}개 · 팔레트 ${plan.capacity.palletPositions}위치 · ${plan.errors.length ? plan.errors[0].error : '배치 가능'}`; const c = $('rowMap'), context = c.getContext('2d'), scale = Math.min(c.width / layout.warehouse.width, c.height / layout.warehouse.depth); context.clearRect(0, 0, c.width, c.height); context.save(); context.scale(scale, scale); for (const o of [...layout.objects, ...plan.added]) drawEquipment(context, o, scale, plan.added.includes(o)); context.restore(); });
  bind('rowApply', () => { const plan = rackPlan(); if (plan.errors.length) throw Error(plan.errors[0].error + ' · 전체 배치를 취소했습니다.'); commit(plan.next); $('rowDialog').close(); });
  // Preserve GitHub JSON workflows even without a 3D rendering context.
  let ghBusy = false; const known = new Map();
  function ghSettings() { const owner = $('ghOwner').value.trim(), repo = $('ghRepo').value.trim(), path = $('ghPath').value.trim(), branch = $('ghBranch').value.trim(); if (!branch || branch.length > 200) throw Error('브랜치를 확인하세요.'); return {owner, repo, path, branch, url: repoPath(owner, repo, path), key: [owner, repo, branch, path].join('/')}; }
  const request = (url, opts = {}) => githubRequest(url, {...opts, token: $('ghToken').value.trim()});
  const github = fn => async () => { if (ghBusy) return; ghBusy = true; const fields = ['ghSave', 'ghLoad', 'ghList', 'ghCompare', 'ghClose', 'ghOwner', 'ghRepo', 'ghBranch', 'ghPath', 'ghToken', 'ghFiles', 'ghConsent']; fields.forEach(id => $(id).disabled = true); $('ghStatus').textContent = 'GitHub 요청 중…'; try { await fn(); } catch (e) { $('ghStatus').textContent = e.message; } finally { ghBusy = false; fields.forEach(id => $(id).disabled = false); } };
  bind('githubBtn', () => $('githubDialog').showModal()); bind('ghClose', () => $('githubDialog').close()); $('githubDialog').addEventListener('cancel', e => { if (ghBusy) e.preventDefault(); }); $('githubDialog').addEventListener('close', () => { $('ghToken').value = ''; $('ghConsent').checked = false; });
  $('ghList').onclick = github(async () => { const s = ghSettings(), items = await request(`https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/contents/layouts?ref=${encodeURIComponent(s.branch)}`, {allow404: true}); $('ghFiles').replaceChildren(new Option('도면을 선택하세요', '')); for (const f of Array.isArray(items) ? items : []) if (f.type === 'file' && f.name.endsWith('.json') && f.name !== 'index.json') $('ghFiles').append(new Option(f.name, f.path)); $('ghStatus').textContent = `도면 ${$('ghFiles').options.length - 1}개`; });
  $('ghFiles').onchange = () => { if ($('ghFiles').value) $('ghPath').value = $('ghFiles').value; };
  $('ghLoad').onclick = github(async () => { const s = ghSettings(), file = await request(s.url + '?ref=' + encodeURIComponent(s.branch)); if (!file.content) throw Error('JSON 파일을 확인하세요.'); const next = normalize(JSON.parse(fromBase64(file.content))); if (confirm('GitHub 도면을 열까요? 실행 취소로 복구할 수 있습니다.')) { replace(next); known.set(s.key, file.sha); $('ghStatus').textContent = '불러오기 완료 · ' + file.sha.slice(0, 7); } });
  $('ghCompare').onclick = github(async () => { const s = ghSettings(), file = await request(s.url + '?ref=' + encodeURIComponent(s.branch)), diff = compareLayouts(layout, normalize(JSON.parse(fromBase64(file.content)))); $('ghStatus').textContent = `로컬에만 ${diff.localOnly.length}개 · 원격에만 ${diff.remoteOnly.length}개 · 변경 ${diff.changed.length}개 · 원격 ${file.sha.slice(0, 7)}`; });
  $('ghSave').onclick = github(async () => { if (!$('ghToken').value.trim()) throw Error('저장소 Contents 쓰기 권한 토큰이 필요합니다.'); if (!$('ghConsent').checked) throw Error('도면 공개 범위를 확인하고 확인란을 선택하세요.'); const s = ghSettings(), current = await request(s.url + '?ref=' + encodeURIComponent(s.branch), {allow404: true}), expected = known.get(s.key); if (current && current.type !== 'file') throw Error('파일 경로를 확인하세요.'); if (expected && current?.sha !== expected) throw Error('원격 도면이 변경되었습니다. JSON 백업 후 최신 도면과 비교하세요.'); if (current && !expected && !confirm('같은 이름의 도면을 현재 도면으로 덮어쓸까요?')) { $('ghStatus').textContent = '저장 취소'; return; } const serialized = JSON.stringify(layout, null, 2); if (new TextEncoder().encode(serialized).length > 950000) throw Error('950KB를 초과했습니다. JSON 내보내기를 이용하세요.'); const body = {message: `layout: ${layout.projectName}`, branch: s.branch, content: utf8base64(serialized)}; if (current) body.sha = current.sha; const result = await request(s.url, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); known.set(s.key, result.content.sha); $('ghStatus').textContent = '커밋 완료 · ' + result.commit.sha.slice(0, 7); toast('GitHub에 도면을 저장했습니다.'); });
  // Renderer-independent drawing and theme controls share the main editor IDs.
  const toolbar = document.createElement('div'); toolbar.id = 'practicalToolbar'; toolbar.innerHTML = '<button id="downloadDrawing">도면 다운로드</button><button id="dimensionButton" aria-pressed="true">치수</button><button id="toolsButton">도구</button><select id="themeSelect" aria-label="테마"><option value="light">Light</option><option value="dark">Dark</option><option value="blueprint">Blueprint</option></select>'; document.querySelector('header').after(toolbar);
  function dialog(id, title, content) { const d = document.createElement('dialog'); d.id = id; d.innerHTML = `<h2>${title}</h2>${content}<div class="modalfoot"><button data-dismiss>닫기</button></div>`; document.body.append(d); d.querySelector('[data-dismiss]').onclick = () => d.close(); return d; }
  const drawing = dialog('drawingDialog', '도면 다운로드', '<p>설비 외곽과 치수를 포함합니다. CAD 좌표는 mm 단위입니다.</p><div class="toolrow"><button id="fallbackSVG">SVG 도면</button><button id="fallbackDXF">CAD · DXF</button><button id="fallbackPNG">PNG 이미지</button><button id="fallbackPDF">PDF 보고서</button></div>');
  bind('downloadDrawing', () => drawing.showModal()); bind('fallbackSVG', () => download(exportSVG(layout), filename() + '.svg', 'image/svg+xml')); bind('fallbackDXF', () => download(exportDXF(layout), filename() + '.dxf', 'application/dxf')); bind('fallbackPNG', async () => { const c = await imageCanvas(exportSVG(layout)); const blob = await new Promise(resolve => c.toBlob(resolve)); if (!blob) throw Error('이미지를 만들지 못했습니다.'); download(blob, filename() + '.png'); }); bind('fallbackPDF', async () => download(await reportPDF(layout, {scale: Math.max(100, Math.ceil(Math.max((layout.warehouse.width + 4) * 1000 / 400, (layout.warehouse.depth + 4) * 1000 / 233) / 50) * 50)}), filename() + '.pdf', 'application/pdf'));
  bind('dimensionButton', () => { showDimensions = !showDimensions; $('dimensionButton').setAttribute('aria-pressed', String(showDimensions)); draw(); });
  const tools = dialog('practicalTools', '평면 설계 도구', '<label class="field">배치 스냅<select id="snapStep"><option value="0">끄기</option><option value=".1">0.1 m</option><option value=".5" selected>0.5 m</option><option value="1">1 m</option></select></label><label class="field"><input id="gridVisible" type="checkbox" checked>격자 표시</label><p>휠 확대 · Alt+드래그 화면 이동 · Shift+클릭 다중 선택 · R 회전 · Delete 삭제 · Ctrl+Z 실행 취소</p><p>현재 평면 설계 모드입니다. 3D와 운영 시뮬레이션은 WebGL 2 지원 환경에서 이용하세요.</p>');
  bind('toolsButton', () => tools.showModal()); $('gridVisible').onchange = () => { showGrid = $('gridVisible').checked; draw(); };
  function setTheme(theme) { document.documentElement.dataset.theme = theme; try { localStorage.setItem('warehouse-city-theme', theme); } catch {} draw(); }
  let theme = 'light'; try { theme = localStorage.getItem('warehouse-city-theme') || 'light'; } catch {} $('themeSelect').value = ['light', 'dark', 'blueprint'].includes(theme) ? theme : 'light'; setTheme($('themeSelect').value); $('themeSelect').onchange = () => setTheme($('themeSelect').value);
  // Never expose dead 3D buttons as working controls.
  for (const el of document.querySelectorAll('[data-mode="sim"], [data-mode="walk"], #isoBtn, #qualityPreset')) { el.disabled = true; el.title = 'WebGL 2 지원 환경에서 이용할 수 있습니다'; }
  ['backgroundBtn', 'backgroundPosition', 'backgroundOpacity', 'backgroundLocked', 'backgroundX', 'backgroundY'].forEach(id => { if ($(id)) { $(id).disabled = true; $(id).title = '배경 편집은 3D 지원 환경에서 이용하세요. 기존 배경은 유지됩니다.'; } });
  $('sceneMode').textContent = '2D 평면 설계'; $('sceneDetail').textContent = '· WebGL 미지원 · 도면 편집·저장 가능'; $('modeDesc').textContent = '설비를 고르고 바닥을 클릭하세요. R 회전 · Esc 취소'; $('bottomhint').textContent = '휠 확대 · Alt+드래그 화면 이동 · Shift 다중 선택 · 평면 설계';
  bind('focusBtn', () => { document.body.classList.toggle('immersive'); setTimeout(resize, 40); });
  bind('leftToggle', () => $('left').classList.toggle('open')); bind('rightToggle', () => $('right').classList.toggle('open')); document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).classList.remove('open'));
  window.addEventListener('keydown', safe(e => { if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === 'Escape') { cancelTool(); selectedIds.clear(); select(null); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); } if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); } if (e.key.toLowerCase() === 'r') { if (tool) { rotation = (rotation + 90) % 360; draw(); } else $('rotateBtn').click(); } }));
  const api = {fallback: true, get: () => layout, selected: () => selected, ids, select, focus, commit, replace, mode: () => 'edit', setMode, top: fit, iso: unavailable, cancelTool, toast, canvas, point: e => { const p = point(e); return {x: p.x, z: p.y}; }, setIds: values => { selectedIds.clear(); values.forEach(id => selectedIds.add(id)); select(values[0]); }, setTheme, grid: value => { showGrid = value; draw(); }};
  window.__warehouseCity = {version: '10.0.0', renderer: 'canvas2d', getLayout: () => copy(layout), getMode: () => 'edit', screenPoint, setMode, getPlaying: () => false, getSimulation: () => null, getLogistics: () => null};
  sync(); catalogue(); new ResizeObserver(resize).observe($('stage')); resize();
  const {installWorkbench} = await import('./city-workbench.mjs'); installWorkbench(api);
  document.documentElement.dataset.ready = 'true'; if (loadWarning) toast(loadWarning);
  return api;
}

if (typeof document !== 'undefined') await startFallback();
