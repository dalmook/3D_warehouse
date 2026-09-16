import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import {
  ASSET_DEFINITIONS,
  calculateStackLayout,
  disposeObject3D,
  rebuildObjectVisual,
} from "./objects.js";

const STORAGE_KEY = "warehouse-studio-project-v1";
const THEME_KEY = "warehouse-studio-theme";
const DIMENSIONS_KEY = "warehouse-studio-dimensions-visible";
const LAYOUTS_MANIFEST_URL = "./layouts/index.json";
const MAX_HISTORY = 60;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const deepCopy = (value) => JSON.parse(JSON.stringify(value));
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const dom = {
  canvas: $("#three-canvas"),
  viewport: $("#viewport"),
  toast: $("#toast"),
  projectName: $("#project-name"),
  saveState: $("#save-state"),
  warehouseWidth: $("#warehouse-width"),
  warehouseDepth: $("#warehouse-depth"),
  warehouseHeight: $("#warehouse-height"),
  assetCategoryFilter: $("#asset-category-filter"),
  assetSearch: $("#asset-search"),
  assetFilterCount: $("#asset-filter-count"),
  selectionChip: $("#selection-chip"),
  selectionLabel: $("#selection-label"),
  selectionPosition: $("#selection-position"),
  selectionDot: $("#selection-dot"),
  canvasHint: $("#canvas-hint"),
  noSelection: $("#no-selection"),
  selectionInspector: $("#selection-inspector"),
  inspectorType: $("#inspector-type"),
  objectLockBtn: $("#object-lock-btn"),
  groundObjectBtn: $("#ground-object-btn"),
  objectName: $("#object-name"),
  positionX: $("#position-x"),
  positionY: $("#position-y"),
  positionZ: $("#position-z"),
  rotationY: $("#rotation-y"),
  objectWidth: $("#object-width"),
  objectDepth: $("#object-depth"),
  objectHeight: $("#object-height"),
  objectColor: $("#object-color"),
  colorValue: $("#color-value"),
  collisionAlert: $("#collision-alert"),
  rackFields: $("#rack-fields"),
  rackBays: $("#rack-bays"),
  rackLevels: $("#rack-levels"),
  rackPallets: $("#rack-pallets"),
  rackCapacity: $("#rack-capacity"),
  rackConfigTitle: $("#rack-config-title"),
  rackPalletsLabel: $("#rack-pallets-label"),
  rackCapacityLabel: $("#rack-capacity-label"),
  stackFields: $("#stack-fields"),
  stackPerLayer: $("#stack-per-layer"),
  stackLayers: $("#stack-layers"),
  stackTotal: $("#stack-total"),
  palletCapacityFields: $("#pallet-capacity-fields"),
  palletBoxWidth: $("#pallet-box-width"),
  palletBoxDepth: $("#pallet-box-depth"),
  palletBoxHeight: $("#pallet-box-height"),
  palletMaxHeight: $("#pallet-max-height"),
  palletCapacityDetail: $("#pallet-capacity-detail"),
  palletCapacityTotal: $("#pallet-capacity-total"),
  manualStackFields: $("#manual-stack-fields"),
  boxSupportName: $("#box-support-name"),
  boxElevation: $("#box-elevation"),
  unstackBtn: $("#unstack-btn"),
  signFields: $("#sign-fields"),
  signText: $("#sign-text"),
  signPreset: $("#sign-preset"),
  signPresetRow: $("#sign-preset-row"),
  textConfigTitle: $("#text-config-title"),
  textLimitLabel: $("#text-limit-label"),
  stackDropHint: $("#stack-drop-hint"),
  stackDropLabel: $("#stack-drop-label"),
  stackDropHeight: $("#stack-drop-height"),
  sceneList: $("#scene-object-list"),
  objectCountChip: $("#object-count-chip"),
  metricLocations: $("#metric-locations"),
  metricPallets: $("#metric-pallets"),
  metricBoxes: $("#metric-boxes"),
  metricCapacityDetail: $("#metric-capacity-detail"),
  metricObjects: $("#metric-objects"),
  metricUtilization: $("#metric-utilization"),
  metricArea: $("#metric-area"),
  metricProgress: $("#metric-progress"),
  undoBtn: $("#undo-btn"),
  redoBtn: $("#redo-btn"),
  view3dBtn: $("#view-3d-btn"),
  viewTopBtn: $("#view-top-btn"),
  gridBtn: $("#grid-btn"),
  selectionLockBtn: $("#selection-lock-btn"),
  dimensionBtn: $("#dimension-btn"),
  snapSelect: $("#snap-select"),
  stackDialog: $("#stack-dialog"),
  layoutsDialog: $("#layouts-dialog"),
  layoutSearch: $("#layout-search"),
  layoutCount: $("#layout-count"),
  layoutStatus: $("#layout-status"),
  layoutList: $("#layout-list"),
  layoutRefreshBtn: $("#layout-refresh-btn"),
  stackForm: $("#stack-form"),
  stackPalletWidth: $("#stack-pallet-width"),
  stackPalletDepth: $("#stack-pallet-depth"),
  stackMaxHeight: $("#stack-max-height"),
  stackBoxWidth: $("#stack-box-width"),
  stackBoxDepth: $("#stack-box-depth"),
  stackBoxHeight: $("#stack-box-height"),
  stackBoxCount: $("#stack-box-count"),
  stackPreviewTitle: $("#stack-preview-title"),
  stackPreviewDetail: $("#stack-preview-detail"),
  replacePalletRow: $("#replace-pallet-row"),
  replacePalletCheck: $("#replace-pallet-check"),
};

const state = {
  warehouse: { width: 36, depth: 24, height: 9 },
  objects: [],
  selected: null,
  snap: 0.5,
  gridVisible: true,
  dirty: false,
  drag: null,
  restoring: false,
  history: [],
  historyIndex: -1,
  view: "3d",
  referenceLayouts: [],
  layoutsLoaded: false,
  selectionLocked: false,
  dimensionsVisible: false,
};

let renderer;
let scene;
let camera;
let controls;
let objectLayer;
let dimensionLayer;
let warehouseLayer;
let gridHelper;
let selectionHelper;
let stackTargetHelper;
let toastTimer;
let fallback2D = false;
let fallbackContext = null;
const dimensionLabels = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function initScene() {
  const probe = document.createElement("canvas");
  const hasWebGL = Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  if (hasWebGL) {
    renderer = new THREE.WebGLRenderer({
      canvas: dom.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
  } else {
    fallback2D = true;
    fallbackContext = dom.canvas.getContext("2d");
    renderer = createFallbackRenderer();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#111a15");
  scene.fog = new THREE.Fog("#111a15", 44, 105);

  camera = new THREE.PerspectiveCamera(43, 1, 0.05, 500);
  camera.position.set(26, 22, 31);

  controls = new OrbitControls(camera, dom.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 4;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI / 2 - 0.015;
  controls.screenSpacePanning = false;
  controls.target.set(0, 0.5, 0);
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

  const hemisphere = new THREE.HemisphereLight("#d8f3e4", "#26362e", 2.2);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight("#effff6", 3.2);
  keyLight.position.set(24, 35, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 120;
  keyLight.shadow.camera.left = -45;
  keyLight.shadow.camera.right = 45;
  keyLight.shadow.camera.top = 45;
  keyLight.shadow.camera.bottom = -45;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight("#91b7ff", 0.62);
  fillLight.position.set(-20, 13, -16);
  scene.add(fillLight);

  warehouseLayer = new THREE.Group();
  warehouseLayer.name = "Warehouse";
  scene.add(warehouseLayer);
  objectLayer = new THREE.Group();
  objectLayer.name = "Objects";
  scene.add(objectLayer);
  dimensionLayer = new THREE.Group();
  dimensionLayer.name = "Dimension labels";
  scene.add(dimensionLayer);

  createWarehouseVisual();
  resizeRenderer();
  new ResizeObserver(resizeRenderer).observe(dom.viewport);
  renderer.setAnimationLoop(renderFrame);
}

function createFallbackRenderer() {
  let animationId = null;
  return {
    domElement: dom.canvas,
    shadowMap: { enabled: false, type: null },
    setPixelRatio() {},
    setSize(width, height) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      dom.canvas.width = Math.floor(width * ratio);
      dom.canvas.height = Math.floor(height * ratio);
      fallbackContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    },
    setAnimationLoop(callback) {
      if (animationId) cancelAnimationFrame(animationId);
      const loop = () => {
        callback();
        animationId = requestAnimationFrame(loop);
      };
      loop();
    },
    render() {
      drawFallbackPlan();
    },
  };
}

function fallbackLayout() {
  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  const padding = Math.max(36, Math.min(width, height) * 0.07);
  const scale = Math.max(0.1, Math.min(
    (width - padding * 2) / state.warehouse.width,
    (height - padding * 2) / state.warehouse.depth,
  ));
  return {
    width,
    height,
    scale,
    left: (width - state.warehouse.width * scale) / 2,
    top: (height - state.warehouse.depth * scale) / 2,
  };
}

function drawFallbackPlan() {
  if (!fallbackContext) return;
  const ctx = fallbackContext;
  const layout = fallbackLayout();
  const light = document.documentElement.dataset.theme === "light";
  ctx.save();
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = light ? "#d5dfd9" : "#111a15";
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.fillStyle = light ? "#eef3f0" : "#16211b";
  ctx.strokeStyle = light ? "#7d9086" : "#456051";
  ctx.lineWidth = 1;
  ctx.fillRect(layout.left, layout.top, state.warehouse.width * layout.scale, state.warehouse.depth * layout.scale);
  ctx.strokeRect(layout.left, layout.top, state.warehouse.width * layout.scale, state.warehouse.depth * layout.scale);

  if (state.gridVisible && layout.scale > 5) {
    ctx.beginPath();
    ctx.strokeStyle = light ? "rgba(74,100,86,.13)" : "rgba(125,165,144,.12)";
    ctx.lineWidth = 1;
    for (let x = 1; x < state.warehouse.width; x += 1) {
      const sx = layout.left + x * layout.scale;
      ctx.moveTo(sx, layout.top);
      ctx.lineTo(sx, layout.top + state.warehouse.depth * layout.scale);
    }
    for (let y = 1; y < state.warehouse.depth; y += 1) {
      const sy = layout.top + y * layout.scale;
      ctx.moveTo(layout.left, sy);
      ctx.lineTo(layout.left + state.warehouse.width * layout.scale, sy);
    }
    ctx.stroke();
  }

  const ordered = [...state.objects].sort((a, b) => {
    const safetyOrder = Number(b.userData.data.type === "safety") - Number(a.userData.data.type === "safety");
    return safetyOrder || a.position.y - b.position.y;
  });
  ordered.forEach((root) => drawFallbackObject(ctx, root, layout));

  ctx.fillStyle = light ? "rgba(45,66,55,.65)" : "rgba(218,235,225,.55)";
  ctx.font = "700 9px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`TOP PLAN · ${state.warehouse.width} × ${state.warehouse.depth}m`, layout.left, Math.max(18, layout.top - 12));
  ctx.textAlign = "right";
  ctx.fillStyle = light ? "#087f58" : "#24d59a";
  ctx.fillText("2D COMPATIBILITY MODE", layout.left + state.warehouse.width * layout.scale, Math.max(18, layout.top - 12));
  ctx.restore();
}

function drawFallbackObject(ctx, root, layout) {
  const data = root.userData.data;
  const position = logicalPosition(root);
  const x = layout.left + position.x * layout.scale;
  const y = layout.top + position.y * layout.scale;
  const width = data.width * layout.scale;
  const depth = data.depth * layout.scale;
  const angle = -root.rotation.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = data.type === "safety" ? 0.32 : 0.82;
  ctx.fillStyle = data.color;
  ctx.strokeStyle = data.color;
  ctx.lineWidth = root === state.selected ? 2.2 : 1;
  if (data.type === "safety") {
    ctx.setLineDash([6, 4]);
    ctx.fillRect(-width / 2, -depth / 2, width, depth);
    ctx.strokeRect(-width / 2, -depth / 2, width, depth);
  } else {
    ctx.fillStyle = `${data.color}33`;
    ctx.fillRect(-width / 2, -depth / 2, width, depth);
    ctx.strokeRect(-width / 2, -depth / 2, width, depth);
    if (data.type === "rack" || data.type === "boxrack") {
      const bays = Math.max(1, data.config?.bays ?? 1);
      ctx.beginPath();
      for (let bay = 1; bay < bays; bay += 1) {
        const bx = -width / 2 + (width * bay) / bays;
        ctx.moveTo(bx, -depth / 2);
        ctx.lineTo(bx, depth / 2);
      }
      ctx.stroke();
    } else if (data.type === "conveyor") {
      ctx.beginPath();
      const rollers = Math.max(3, Math.min(24, Math.floor(width / 10)));
      for (let index = 1; index < rollers; index += 1) {
        const rx = -width / 2 + (width * index) / rollers;
        ctx.moveTo(rx, -depth / 2);
        ctx.lineTo(rx, depth / 2);
      }
      ctx.stroke();
    } else if (data.type === "stack") {
      ctx.fillStyle = `${data.color}66`;
      ctx.fillRect(-width * 0.42, -depth * 0.38, width * 0.84, depth * 0.76);
    }
  }
  if (root === state.selected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = objectCollision(root).length ? "#ff6b65" : "#24d59a";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.strokeRect(-width / 2 - 3, -depth / 2 - 3, width + 6, depth + 6);
  }
  if (layout.scale > 12 && data.type !== "safety") {
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = document.documentElement.dataset.theme === "light" ? "#17231d" : "#edf5f0";
    ctx.font = "700 8px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayName = ["sign", "warning", "textlabel"].includes(data.type) ? data.config?.text || data.name : data.name;
    const elevated = root.position.y > 0.005;
    const hasBoxAbove = data.type === "box" && supportedChildren(root).length > 0;
    if (!hasBoxAbove) {
      const labelY = elevated ? -depth / 2 - 6 : 0;
      ctx.fillText(displayName.length > 14 ? `${displayName.slice(0, 13)}…` : displayName, 0, labelY);
    }
    if (data.type === "box" && elevated && !hasBoxAbove) {
      ctx.fillStyle = "#f6bb52";
      ctx.font = "900 7px Segoe UI, sans-serif";
      ctx.fillText(`Z ${round(root.position.y, 2)}m`, 0, Math.max(5, depth / 2 - 4));
    }
    if (state.dimensionsVisible) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = document.documentElement.dataset.theme === "light" ? "#087f58" : "#52e1ae";
      ctx.font = "900 7px Segoe UI, sans-serif";
      ctx.fillText(dimensionText(data).replace(" m", "m"), 0, depth / 2 + 8);
    }
  }
  ctx.restore();
}

function fallbackPoint(event) {
  const rect = dom.canvas.getBoundingClientRect();
  const layout = fallbackLayout();
  return {
    x: (event.clientX - rect.left - layout.left) / layout.scale,
    y: (event.clientY - rect.top - layout.top) / layout.scale,
  };
}

function fallbackHitTest(point) {
  const candidates = [...state.objects].reverse();
  return candidates.find((root) => {
    const data = root.userData.data;
    const position = logicalPosition(root);
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const cos = Math.cos(root.rotation.y);
    const sin = Math.sin(root.rotation.y);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return Math.abs(localX) <= data.width / 2 && Math.abs(localY) <= data.depth / 2;
  }) ?? null;
}

function dimensionText(data) {
  return `W ${round(data.width, 2)} · D ${round(data.depth, 2)} · H ${round(data.height, 2)} m`;
}

function disposeDimensionSprite(sprite) {
  sprite?.material?.map?.dispose?.();
  sprite?.material?.dispose?.();
}

function removeDimensionLabel(root) {
  const sprite = dimensionLabels.get(root);
  if (!sprite) return;
  dimensionLayer?.remove(sprite);
  dimensionLabels.delete(root);
  disposeDimensionSprite(sprite);
}

function createDimensionLabel(root) {
  if (!state.dimensionsVisible || fallback2D || !dimensionLayer) return;
  const data = root.userData.data;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  const light = document.documentElement.dataset.theme === "light";
  context.fillStyle = light ? "rgba(255,255,255,0.94)" : "rgba(10,17,13,0.92)";
  context.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.strokeStyle = light ? "rgba(12,127,88,0.8)" : "rgba(36,213,154,0.8)";
  context.lineWidth = 8;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = light ? "#173126" : "#ecf8f1";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '900 64px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText(dimensionText(data), canvas.width / 2, canvas.height / 2 + 2, canvas.width - 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  const labelWidth = clamp(Math.max(data.width, data.depth) * 0.72 + 1.25, 1.8, 4.8);
  sprite.scale.set(labelWidth, labelWidth * 0.15625, 1);
  sprite.renderOrder = 1100;
  sprite.userData.dimensionRoot = root;
  dimensionLayer.add(sprite);
  dimensionLabels.set(root, sprite);
}

function updateDimensionLabel(root) {
  removeDimensionLabel(root);
  createDimensionLabel(root);
}

function clearDimensionLabels() {
  [...dimensionLabels.keys()].forEach(removeDimensionLabel);
}

function syncDimensionLabels() {
  clearDimensionLabels();
  if (state.dimensionsVisible) state.objects.forEach(createDimensionLabel);
}

function updateDimensionLabelPositions() {
  dimensionLabels.forEach((sprite, root) => {
    const data = root.userData.data;
    sprite.position.set(root.position.x, root.position.y + data.height + 0.28, root.position.z);
  });
}

function renderFrame() {
  controls.update();
  if (selectionHelper && state.selected) selectionHelper.update();
  if (state.dimensionsVisible) updateDimensionLabelPositions();
  renderer.render(scene, camera);
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function clearGroup(group) {
  [...group.children].forEach((child) => {
    group.remove(child);
    disposeObject3D(child);
  });
}

function createWarehouseVisual() {
  clearGroup(warehouseLayer);
  const { width, depth, height } = state.warehouse;
  const lightTheme = document.documentElement.dataset.theme === "light";

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color: lightTheme ? "#dce5df" : "#152019",
      roughness: 0.92,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "Warehouse floor";
  warehouseLayer.add(floor);

  const pad = 0.12;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width + pad, 0.08, depth + pad),
    new THREE.MeshStandardMaterial({ color: lightTheme ? "#bac8c0" : "#0b120e", roughness: 1 }),
  );
  base.position.y = -0.05;
  base.receiveShadow = true;
  warehouseLayer.add(base);

  const divisions = Math.min(120, Math.max(10, Math.round(Math.max(width, depth) * 2)));
  gridHelper = new THREE.GridHelper(Math.max(width, depth), divisions, lightTheme ? "#759084" : "#315344", lightTheme ? "#aebdb5" : "#22352b");
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = lightTheme ? 0.42 : 0.55;
  gridHelper.position.y = 0.008;
  gridHelper.visible = state.gridVisible;
  warehouseLayer.add(gridHelper);

  const boundsGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
  const bounds = new THREE.LineSegments(
    boundsGeometry,
    new THREE.LineBasicMaterial({ color: lightTheme ? "#698075" : "#5b7e6c", transparent: true, opacity: 0.35 }),
  );
  bounds.position.y = height / 2;
  warehouseLayer.add(bounds);

  const cornerColor = lightTheme ? "#6b8176" : "#40594c";
  const cornerMaterial = new THREE.MeshStandardMaterial({ color: cornerColor, roughness: 0.8 });
  const postGeometry = new THREE.BoxGeometry(0.08, height, 0.08);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const post = new THREE.Mesh(postGeometry, cornerMaterial);
    post.position.set(sx * width / 2, height / 2, sz * depth / 2);
    post.castShadow = true;
    warehouseLayer.add(post);
  }));
}

function updateSceneTheme() {
  const light = document.documentElement.dataset.theme === "light";
  scene.background.set(light ? "#d5dfd9" : "#111a15");
  scene.fog.color.set(light ? "#d5dfd9" : "#111a15");
  scene.fog.near = light ? 52 : 44;
  createWarehouseVisual();
  syncDimensionLabels();
}

function assetDefaults(type) {
  const definition = ASSET_DEFINITIONS[type] ?? ASSET_DEFINITIONS.box;
  return {
    type,
    name: nextObjectName(type),
    width: definition.width,
    depth: definition.depth,
    height: definition.height,
    color: definition.color,
    locked: false,
    config: definition.config ? deepCopy(definition.config) : undefined,
  };
}

function nextObjectName(type) {
  const definition = ASSET_DEFINITIONS[type] ?? ASSET_DEFINITIONS.box;
  const number = state.objects.filter((root) => root.userData.data.type === type).length + 1;
  return `${definition.label} ${String(number).padStart(2, "0")}`;
}

function createObject(type, values = {}, options = {}) {
  const definition = ASSET_DEFINITIONS[type] ?? ASSET_DEFINITIONS.box;
  const defaults = assetDefaults(type);
  const data = {
    ...defaults,
    ...deepCopy(values),
    id: values.id || makeId(),
    type,
  };
  if (defaults.config || values.config) data.config = { ...(defaults.config ?? {}), ...(deepCopy(values.config ?? {})) };
  data.width = Math.max(0.02, Number(data.width));
  data.depth = Math.max(0.02, Number(data.depth));
  data.height = Math.max(0.01, Number(data.height));
  data.color = data.color || definition.color;
  data.locked = Boolean(data.locked);

  const root = new THREE.Group();
  root.name = data.name;
  root.userData.selectable = true;
  root.userData.data = data;
  const logicalX = Number.isFinite(Number(values.x)) ? Number(values.x) : state.warehouse.width / 2;
  const logicalY = Number.isFinite(Number(values.y)) ? Number(values.y) : state.warehouse.depth / 2;
  const elevation = Number.isFinite(Number(values.z)) ? Number(values.z) : Number(definition.elevation ?? 0);
  root.position.set(logicalX - state.warehouse.width / 2, clamp(elevation, 0, state.warehouse.height - data.height), logicalY - state.warehouse.depth / 2);
  root.rotation.y = THREE.MathUtils.degToRad(Number(values.rotation ?? 0));
  rebuildObjectVisual(root);
  objectLayer.add(root);
  state.objects.push(root);
  constrainObject(root);
  updateDimensionLabel(root);

  if (options.select !== false) selectObject(root);
  updateWorkspaceUI();
  if (options.commit !== false) commitHistory();
  return root;
}

function removeObject(root, options = {}) {
  if (!root) return;
  detachSupportedChildren(root);
  if (state.selected === root) selectObject(null);
  removeDimensionLabel(root);
  objectLayer.remove(root);
  state.objects = state.objects.filter((item) => item !== root);
  disposeObject3D(root);
  updateWorkspaceUI();
  if (options.commit !== false) commitHistory();
}

function clearObjects() {
  selectObject(null);
  clearDimensionLabels();
  [...state.objects].forEach((root) => {
    objectLayer.remove(root);
    disposeObject3D(root);
  });
  state.objects = [];
  updateWorkspaceUI();
}

function duplicateSelected() {
  if (!guardEditable("복제")) return;
  const source = serializeObject(state.selected);
  source.id = makeId();
  source.name = `${source.name} 복사본`;
  source.x = clamp(source.x + 0.7, 0, state.warehouse.width);
  source.y = clamp(source.y + 0.7, 0, state.warehouse.depth);
  source.supportId = null;
  source.locked = false;
  if (source.type === "box") source.z = 0;
  createObject(source.type, source);
  toast("선택한 객체를 복제했습니다.");
}

function deleteSelected() {
  if (!guardEditable("삭제")) return;
  removeObject(state.selected);
  toast("선택한 객체를 삭제했습니다.");
}

function selectObject(root) {
  if (selectionHelper) {
    scene.remove(selectionHelper);
    selectionHelper.geometry?.dispose?.();
    selectionHelper.material?.dispose?.();
    selectionHelper = null;
  }
  state.selected = root ?? null;
  if (root) {
    selectionHelper = new THREE.BoxHelper(root, "#24d59a");
    selectionHelper.material.depthTest = false;
    selectionHelper.material.transparent = true;
    selectionHelper.material.opacity = 0.95;
    selectionHelper.renderOrder = 999;
    scene.add(selectionHelper);
  }
  updateInspector();
  renderSceneList();
}

function logicalPosition(root) {
  return {
    x: root.position.x + state.warehouse.width / 2,
    y: root.position.z + state.warehouse.depth / 2,
    z: root.position.y,
  };
}

function constrainObject(root) {
  const data = root.userData.data;
  const angle = Math.abs(Math.sin(root.rotation.y));
  const cosine = Math.abs(Math.cos(root.rotation.y));
  const halfX = (data.width * cosine + data.depth * angle) / 2;
  const halfZ = (data.width * angle + data.depth * cosine) / 2;
  root.position.x = clamp(root.position.x, -state.warehouse.width / 2 + halfX, state.warehouse.width / 2 - halfX);
  root.position.z = clamp(root.position.z, -state.warehouse.depth / 2 + halfZ, state.warehouse.depth / 2 - halfZ);
  root.position.y = clamp(root.position.y, 0, Math.max(0, state.warehouse.height - data.height));
}

function objectById(id) {
  return id ? state.objects.find((root) => root.userData.data.id === id) ?? null : null;
}

function supportedChildren(root) {
  const id = root?.userData.data.id;
  return id ? state.objects.filter((item) => item.userData.data.supportId === id) : [];
}

function supportedDescendants(root) {
  const descendants = [];
  const queue = [...supportedChildren(root)];
  const visited = new Set();
  while (queue.length) {
    const child = queue.shift();
    const id = child.userData.data.id;
    if (visited.has(id)) continue;
    visited.add(id);
    descendants.push(child);
    queue.push(...supportedChildren(child));
  }
  return descendants;
}

function isSupportedBy(root, possibleBase) {
  const baseId = possibleBase?.userData.data.id;
  let current = root;
  const visited = new Set();
  while (current?.userData.data.supportId) {
    const supportId = current.userData.data.supportId;
    if (supportId === baseId) return true;
    if (visited.has(supportId)) return false;
    visited.add(supportId);
    current = objectById(supportId);
  }
  return false;
}

function topOf(root) {
  return root.position.y + root.userData.data.height;
}

function calculatePalletBoxCapacity(data) {
  const config = data.config ?? {};
  const boxWidth = Math.max(0.02, Number(config.boxWidth) || 0.4);
  const boxDepth = Math.max(0.02, Number(config.boxDepth) || 0.3);
  const boxHeight = Math.max(0.02, Number(config.boxHeight) || 0.25);
  const maxStackHeight = Math.max(data.height, Number(config.maxStackHeight) || 1.8);
  const normal = Math.floor(data.width / boxWidth + 1e-7) * Math.floor(data.depth / boxDepth + 1e-7);
  const rotated = Math.floor(data.width / boxDepth + 1e-7) * Math.floor(data.depth / boxWidth + 1e-7);
  const perLayer = Math.max(normal, rotated);
  const layers = Math.max(0, Math.floor((maxStackHeight - data.height) / boxHeight + 1e-7));
  return {
    boxWidth,
    boxDepth,
    boxHeight,
    maxStackHeight,
    perLayer,
    layers,
    total: perLayer * layers,
    rotated: rotated > normal,
  };
}

function palletAncestorForBox(box) {
  let current = box;
  const visited = new Set();
  while (current?.userData.data.supportId) {
    const supportId = current.userData.data.supportId;
    if (visited.has(supportId)) return null;
    visited.add(supportId);
    const support = objectById(supportId);
    if (!support) return null;
    if (support.userData.data.type === "pallet") return support;
    current = support;
  }
  return null;
}

function storageCapacitySummary() {
  let boxRackCapacity = 0;
  let palletCapacity = 0;
  let looseBoxes = 0;
  let actualBoxes = 0;
  const assignedToPallet = new Map();

  state.objects.forEach((root) => {
    const data = root.userData.data;
    if (data.type === "boxrack") {
      const bays = Math.max(1, Math.round(Number(data.config?.bays) || 1));
      const levels = Math.max(1, Math.round(Number(data.config?.levels) || 1));
      const boxesPerCell = Math.max(1, Math.round(Number(data.config?.boxesPerCell) || 1));
      boxRackCapacity += bays * levels * boxesPerCell;
    }
    if (data.type === "box") {
      actualBoxes += 1;
      const pallet = palletAncestorForBox(root);
      if (pallet) {
        const id = pallet.userData.data.id;
        assignedToPallet.set(id, (assignedToPallet.get(id) ?? 0) + 1);
      } else {
        looseBoxes += 1;
      }
    }
    if (data.type === "stack") actualBoxes += data.stack?.count ?? 0;
  });

  state.objects.forEach((root) => {
    const data = root.userData.data;
    if (data.type === "pallet") {
      const theoretical = calculatePalletBoxCapacity(data).total;
      const placed = assignedToPallet.get(data.id) ?? 0;
      palletCapacity += Math.max(theoretical, placed);
    }
    if (data.type === "stack") {
      const theoretical = (data.stack?.perLayer ?? 0) * (data.stack?.maxLayers ?? data.stack?.layers ?? 0);
      palletCapacity += Math.max(theoretical, data.stack?.count ?? 0);
    }
  });

  return {
    boxRackCapacity,
    palletCapacity,
    looseBoxes,
    actualBoxes,
    total: boxRackCapacity + palletCapacity + looseBoxes,
  };
}

function boxFitsSupport(box, support) {
  if (!box || !support) return false;
  const boxData = box.userData.data;
  const supportData = support.userData.data;
  const delta = new THREE.Vector3(
    box.position.x - support.position.x,
    0,
    box.position.z - support.position.z,
  ).applyAxisAngle(new THREE.Vector3(0, 1, 0), -support.rotation.y);
  const relativeAngle = box.rotation.y - support.rotation.y;
  const cosine = Math.abs(Math.cos(relativeAngle));
  const sine = Math.abs(Math.sin(relativeAngle));
  const halfWidth = (boxData.width * cosine + boxData.depth * sine) / 2;
  const halfDepth = (boxData.width * sine + boxData.depth * cosine) / 2;
  const tolerance = supportData.type === "box" ? 0.08 : 0.015;
  return Math.abs(delta.x) + halfWidth <= supportData.width / 2 + tolerance
    && Math.abs(delta.z) + halfDepth <= supportData.depth / 2 + tolerance;
}

function findStackSupport(box) {
  if (box?.userData.data.type !== "box") return null;
  return state.objects
    .filter((candidate) => {
      const type = candidate.userData.data.type;
      if (candidate === box || !["pallet", "box"].includes(type)) return false;
      if (isSupportedBy(candidate, box)) return false;
      if (topOf(candidate) + box.userData.data.height > state.warehouse.height + 1e-6) return false;
      return boxFitsSupport(box, candidate);
    })
    .sort((a, b) => topOf(b) - topOf(a))[0] ?? null;
}

function reflowSupportTree(root, visited = new Set()) {
  const id = root?.userData.data.id;
  if (!id || visited.has(id)) return;
  visited.add(id);
  supportedChildren(root).forEach((child) => {
    child.position.y = clamp(topOf(root), 0, Math.max(0, state.warehouse.height - child.userData.data.height));
    reflowSupportTree(child, visited);
  });
}

function reflowAllSupports() {
  state.objects.forEach((root) => {
    const data = root.userData.data;
    if (data.type !== "box" || !data.supportId) return;
    const support = objectById(data.supportId);
    if (!support || !["pallet", "box"].includes(support.userData.data.type) || isSupportedBy(support, root)) {
      data.supportId = null;
      root.position.y = 0;
    }
  });
  state.objects.filter((root) => !root.userData.data.supportId).forEach((root) => reflowSupportTree(root));
}

function detachSupportedChildren(root) {
  supportedChildren(root).forEach((child) => {
    child.userData.data.supportId = null;
    child.position.y = 0;
    reflowSupportTree(child);
  });
}

function moveSupportedDescendants(root, previousPosition, previousRotation = root.rotation.y) {
  const deltaRotation = root.rotation.y - previousRotation;
  const cosine = Math.cos(deltaRotation);
  const sine = Math.sin(deltaRotation);
  supportedDescendants(root).forEach((child) => {
    const dx = child.position.x - previousPosition.x;
    const dz = child.position.z - previousPosition.z;
    child.position.x = root.position.x + dx * cosine + dz * sine;
    child.position.z = root.position.z - dx * sine + dz * cosine;
    child.position.y += root.position.y - previousPosition.y;
    child.rotation.y += deltaRotation;
  });
}

function snapBoxToBestSupport(box) {
  const support = findStackSupport(box);
  if (support?.userData.data.type === "box") {
    box.position.x = support.position.x;
    box.position.z = support.position.z;
  }
  box.userData.data.supportId = support?.userData.data.id ?? null;
  box.position.y = support ? topOf(support) : 0;
  return support;
}

function showStackDropTarget(support) {
  const existing = state.drag?.previewSupport ?? null;
  if (existing !== support) {
    if (stackTargetHelper) {
      scene.remove(stackTargetHelper);
      stackTargetHelper.geometry?.dispose?.();
      stackTargetHelper.material?.dispose?.();
      stackTargetHelper = null;
    }
    if (support && !fallback2D) {
      stackTargetHelper = new THREE.BoxHelper(support, "#f6bb52");
      stackTargetHelper.material.depthTest = false;
      stackTargetHelper.material.transparent = true;
      stackTargetHelper.material.opacity = 0.96;
      stackTargetHelper.renderOrder = 1000;
      scene.add(stackTargetHelper);
    }
  }
  if (state.drag) state.drag.previewSupport = support;
  dom.stackDropHint.hidden = false;
  dom.stackDropHint.classList.toggle("floor", !support);
  dom.stackDropLabel.textContent = support ? `${support.userData.data.name} 위에 놓기` : "바닥에 놓기";
  dom.stackDropHeight.textContent = `Z ${round(support ? topOf(support) : 0, 2)}m`;
}

function clearStackDropTarget() {
  if (stackTargetHelper) {
    scene.remove(stackTargetHelper);
    stackTargetHelper.geometry?.dispose?.();
    stackTargetHelper.material?.dispose?.();
    stackTargetHelper = null;
  }
  dom.stackDropHint.hidden = true;
  dom.stackDropHint.classList.remove("floor");
}

function unstackSelectedBox() {
  const root = state.selected;
  if (!root || root.userData.data.type !== "box" || !guardEditable("이동", root)) return;
  const previous = root.position.clone();
  root.userData.data.supportId = null;
  root.position.y = 0;
  moveSupportedDescendants(root, previous, root.rotation.y);
  reflowSupportTree(root);
  updateWorkspaceUI();
  commitHistory();
  toast("박스 적재 묶음을 바닥으로 내렸습니다.");
}

function snapValue(value) {
  return state.snap > 0 ? Math.round(value / state.snap) * state.snap : value;
}

function objectCollision(root) {
  if (!root || root.userData.data.type === "safety") return [];
  const box = new THREE.Box3().setFromObject(root);
  box.expandByScalar(-0.025);
  return state.objects.filter((other) => {
    if (other === root || other.userData.data.type === "safety") return false;
    const otherBox = new THREE.Box3().setFromObject(other);
    otherBox.expandByScalar(-0.025);
    return box.intersectsBox(otherBox);
  });
}

function refreshSelectionHelper() {
  if (!state.selected || !selectionHelper) return;
  selectionHelper.update();
  const colliding = objectCollision(state.selected).length > 0;
  selectionHelper.material.color.set(colliding ? "#ff6b65" : "#24d59a");
  dom.collisionAlert.hidden = !colliding;
}

function serializeObject(root) {
  const data = deepCopy(root.userData.data);
  const position = logicalPosition(root);
  return {
    ...data,
    x: round(position.x, 4),
    y: round(position.y, 4),
    z: round(position.z, 4),
    rotation: round(THREE.MathUtils.radToDeg(root.rotation.y), 3),
  };
}

function projectData() {
  return {
    schemaVersion: 7,
    app: "Warehouse Studio 3D",
    projectName: dom.projectName.value.trim() || "My Warehouse",
    warehouse: deepCopy(state.warehouse),
    objects: state.objects.map(serializeObject),
  };
}

function projectSnapshot() {
  return JSON.stringify(projectData());
}

function loadProject(project, options = {}) {
  if (!project || !project.warehouse || !Array.isArray(project.objects)) {
    throw new Error("지원하지 않는 프로젝트 파일입니다.");
  }
  state.restoring = true;
  clearObjects();
  state.warehouse = {
    width: clamp(Number(project.warehouse.width) || 36, 5, 300),
    depth: clamp(Number(project.warehouse.depth) || 24, 5, 300),
    height: clamp(Number(project.warehouse.height) || 9, 2, 50),
  };
  dom.projectName.value = project.projectName || "My Warehouse";
  syncWarehouseInputs();
  createWarehouseVisual();
  project.objects.forEach((item) => {
    if (!ASSET_DEFINITIONS[item.type]) return;
    createObject(item.type, item, { select: false, commit: false });
  });
  reflowAllSupports();
  selectObject(null);
  state.restoring = false;
  updateWorkspaceUI();
  if (options.fit !== false) fitWarehouseView();
  if (options.commit) commitHistory();
}

function resetHistory(markDirty = false) {
  state.history = [projectSnapshot()];
  state.historyIndex = 0;
  updateHistoryButtons();
  setDirty(markDirty);
}

function commitHistory() {
  if (state.restoring) return;
  const snapshot = projectSnapshot();
  if (state.history[state.historyIndex] === snapshot) return;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
  setDirty(true);
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex -= 1;
  loadProject(JSON.parse(state.history[state.historyIndex]), { fit: false });
  updateHistoryButtons();
  setDirty(true);
  toast("이전 상태로 되돌렸습니다.");
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex += 1;
  loadProject(JSON.parse(state.history[state.historyIndex]), { fit: false });
  updateHistoryButtons();
  setDirty(true);
  toast("다음 상태를 다시 적용했습니다.");
}

function updateHistoryButtons() {
  dom.undoBtn.disabled = state.historyIndex <= 0;
  dom.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function setDirty(dirty) {
  state.dirty = dirty;
  dom.saveState.classList.toggle("dirty", dirty);
  dom.saveState.lastChild.textContent = dirty ? " 변경사항 있음" : " 저장됨";
}

function syncWarehouseInputs() {
  dom.warehouseWidth.value = state.warehouse.width;
  dom.warehouseDepth.value = state.warehouse.depth;
  dom.warehouseHeight.value = state.warehouse.height;
}

function applyWarehouseDimensions() {
  if (state.selectionLocked) {
    toast("전체 잠금을 해제한 뒤 창고 규격을 변경해 주세요.", "error");
    return;
  }
  if (state.objects.some((root) => root.userData.data.locked)) {
    toast("창고 규격을 바꾸기 전에 개별 객체 잠금을 모두 해제해 주세요.", "error");
    return;
  }
  const oldWarehouse = { ...state.warehouse };
  const positions = state.objects.map((root) => ({
    root,
    x: root.position.x + oldWarehouse.width / 2,
    y: root.position.z + oldWarehouse.depth / 2,
  }));
  state.warehouse = {
    width: clamp(Number(dom.warehouseWidth.value) || oldWarehouse.width, 5, 300),
    depth: clamp(Number(dom.warehouseDepth.value) || oldWarehouse.depth, 5, 300),
    height: clamp(Number(dom.warehouseHeight.value) || oldWarehouse.height, 2, 50),
  };
  syncWarehouseInputs();
  positions.forEach(({ root, x, y }) => {
    root.position.x = x - state.warehouse.width / 2;
    root.position.z = y - state.warehouse.depth / 2;
    constrainObject(root);
  });
  reflowAllSupports();
  createWarehouseVisual();
  updateWorkspaceUI();
  commitHistory();
  fitWarehouseView();
  toast(`창고 규격을 ${state.warehouse.width} × ${state.warehouse.depth} × ${state.warehouse.height}m로 적용했습니다.`);
}

function fitWarehouseView() {
  const { width, depth, height } = state.warehouse;
  const extent = Math.max(width, depth, height * 2);
  camera.position.set(width * 0.58, Math.max(11, extent * 0.62), depth * 0.73);
  controls.target.set(0, Math.min(1.2, height * 0.15), 0);
  controls.update();
  state.view = "3d";
  updateViewButtons();
}

function setTopView() {
  const extent = Math.max(state.warehouse.width, state.warehouse.depth);
  camera.position.set(0, extent * 1.22, 0.001);
  controls.target.set(0, 0, 0);
  controls.update();
  state.view = "top";
  updateViewButtons();
}

function updateViewButtons() {
  dom.view3dBtn.classList.toggle("active", state.view === "3d");
  dom.viewTopBtn.classList.toggle("active", state.view === "top");
}

function hasLockedObjectTree(root) {
  return Boolean(root?.userData.data.locked) || supportedDescendants(root).some((child) => child.userData.data.locked);
}

function isEditLocked(root = state.selected) {
  return state.selectionLocked || hasLockedObjectTree(root);
}

function guardEditable(action = "편집", root = state.selected) {
  if (!root) return false;
  if (state.selectionLocked) {
    toast(`전체 잠금을 해제한 뒤 ${action}해 주세요.`, "error");
    return false;
  }
  if (root.userData.data.locked) {
    toast(`잠긴 객체입니다. 객체 잠금을 해제한 뒤 ${action}해 주세요.`, "error");
    return false;
  }
  if (supportedDescendants(root).some((child) => child.userData.data.locked)) {
    toast(`위에 쌓인 잠긴 객체를 먼저 해제한 뒤 ${action}해 주세요.`, "error");
    return false;
  }
  return true;
}

function setSelectionLock(locked) {
  if (state.drag) endCanvasDrag();
  state.selectionLocked = Boolean(locked);
  controls.mouseButtons.LEFT = state.selectionLocked ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  dom.canvas.classList.toggle("selection-locked", state.selectionLocked);
  dom.selectionLockBtn.classList.toggle("active", state.selectionLocked);
  dom.selectionLockBtn.setAttribute("aria-pressed", String(state.selectionLocked));
  dom.selectionLockBtn.textContent = state.selectionLocked ? "🔒 전체 잠금" : "🔓 전체 잠금";
  dom.canvasHint.innerHTML = state.selectionLocked
    ? '<span>마우스 왼쪽·오른쪽</span> 시점 회전 <i></i><span>휠</span> 확대·축소 <i></i><span>객체 선택</span> 잠김'
    : '<span>마우스 왼쪽</span> 선택·이동 <i></i><span>마우스 오른쪽</span> 시점 회전 <i></i><span>휠</span> 확대·축소';
  if (state.selectionLocked) selectObject(null);
  else updateInspector();
  toast(state.selectionLocked ? "전체 잠금: 객체는 선택되지 않고 카메라만 조작됩니다." : "전체 잠금을 해제했습니다.");
}

function toggleObjectLock(root = state.selected) {
  if (!root) return;
  root.userData.data.locked = !root.userData.data.locked;
  if (state.drag?.root === root) endCanvasDrag();
  updateWorkspaceUI();
  commitHistory();
  toast(root.userData.data.locked ? `${root.userData.data.name} 객체를 잠갔습니다.` : `${root.userData.data.name} 객체 잠금을 해제했습니다.`);
}

function moveSelectedToGround() {
  if (!guardEditable("이동")) return;
  const root = state.selected;
  if (root.position.y <= 0.005 && !root.userData.data.supportId) {
    toast("이미 바닥에 놓여 있습니다.");
    return;
  }
  const previous = root.position.clone();
  root.userData.data.supportId = null;
  root.position.y = 0;
  moveSupportedDescendants(root, previous, root.rotation.y);
  reflowSupportTree(root);
  updateWorkspaceUI();
  commitHistory();
  toast(`${root.userData.data.name} 객체를 바닥으로 내렸습니다.`);
}

function toggleDimensions() {
  state.dimensionsVisible = !state.dimensionsVisible;
  localStorage.setItem(DIMENSIONS_KEY, String(state.dimensionsVisible));
  dom.dimensionBtn.classList.toggle("active", state.dimensionsVisible);
  dom.dimensionBtn.setAttribute("aria-pressed", String(state.dimensionsVisible));
  syncDimensionLabels();
  toast(state.dimensionsVisible ? "모든 객체의 치수를 표시합니다." : "객체 치수 표시를 껐습니다.");
}

function setPointerFromEvent(event) {
  const rect = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function rootFromHit(object) {
  let current = object;
  while (current && current.parent !== objectLayer) current = current.parent;
  return current?.parent === objectLayer ? current : null;
}

function pointOnGround(event) {
  if (fallback2D) {
    const point = fallbackPoint(event);
    return new THREE.Vector3(point.x - state.warehouse.width / 2, 0, point.y - state.warehouse.depth / 2);
  }
  setPointerFromEvent(event);
  const target = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, target) ? target : null;
}

function onCanvasPointerDown(event) {
  if (event.button !== 0) return;
  if (state.selectionLocked) return;
  let root;
  let point;
  if (fallback2D) {
    const logical = fallbackPoint(event);
    root = fallbackHitTest(logical);
    point = new THREE.Vector3(logical.x - state.warehouse.width / 2, 0, logical.y - state.warehouse.depth / 2);
  } else {
    setPointerFromEvent(event);
    const hits = raycaster.intersectObjects(objectLayer.children, true);
    root = hits.length ? rootFromHit(hits[0].object) : null;
    point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, point)) point = null;
  }
  if (!root) {
    selectObject(null);
    return;
  }
  if (hasLockedObjectTree(root)) {
    selectObject(null);
    toast("이 객체 또는 위에 쌓인 객체가 잠겨 있습니다. 왼쪽 객체 목록에서 잠금을 해제할 수 있습니다.");
    return;
  }
  selectObject(root);
  if (!point) return;
  state.drag = {
    root,
    offsetX: root.position.x - point.x,
    offsetZ: root.position.z - point.z,
    startX: root.position.x,
    startY: root.position.y,
    startZ: root.position.z,
    descendants: supportedDescendants(root).map((child) => ({
      root: child,
      x: child.position.x,
      y: child.position.y,
      z: child.position.z,
    })),
    previewSupport: root.userData.data.type === "box" ? objectById(root.userData.data.supportId) : null,
    moved: false,
    pointerId: event.pointerId,
  };
  controls.enabled = false;
  dom.canvas.classList.add("dragging");
  dom.canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function onCanvasPointerMove(event) {
  if (!state.drag) return;
  const point = pointOnGround(event);
  if (!point) return;
  const root = state.drag.root;
  const rawX = point.x + state.drag.offsetX;
  const rawZ = point.z + state.drag.offsetZ;
  if (root.userData.data.type === "box") {
    root.position.x = rawX;
    root.position.z = rawZ;
    constrainObject(root);
    let support = findStackSupport(root);
    if (support?.userData.data.type === "box") {
      root.position.x = support.position.x;
      root.position.z = support.position.z;
    } else if (support) {
      const unsnappedX = root.position.x;
      const unsnappedZ = root.position.z;
      root.position.x = snapValue(root.position.x);
      root.position.z = snapValue(root.position.z);
      constrainObject(root);
      if (!boxFitsSupport(root, support)) {
        root.position.x = unsnappedX;
        root.position.z = unsnappedZ;
      }
    } else {
      root.position.x = snapValue(root.position.x);
      root.position.z = snapValue(root.position.z);
      constrainObject(root);
      support = findStackSupport(root);
      if (support?.userData.data.type === "box") {
        root.position.x = support.position.x;
        root.position.z = support.position.z;
      }
    }
    root.position.y = support ? topOf(support) : 0;
    showStackDropTarget(support);
  } else {
    root.position.x = snapValue(rawX);
    root.position.z = snapValue(rawZ);
    constrainObject(root);
  }
  const dx = root.position.x - state.drag.startX;
  const dy = root.position.y - state.drag.startY;
  const dz = root.position.z - state.drag.startZ;
  state.drag.descendants.forEach((item) => {
    item.root.position.set(item.x + dx, item.y + dy, item.z + dz);
  });
  state.drag.moved ||= Math.hypot(dx, dy, dz) > 0.01;
  updateInspectorValuesOnly();
  refreshSelectionHelper();
  updateMetrics();
}

function endCanvasDrag(event) {
  if (!state.drag) return;
  const { root, moved, previewSupport } = state.drag;
  if (moved && root.userData.data.type === "box") {
    root.userData.data.supportId = previewSupport?.userData.data.id ?? null;
    root.position.y = previewSupport ? topOf(previewSupport) : 0;
    reflowSupportTree(root);
  }
  try { dom.canvas.releasePointerCapture?.(state.drag.pointerId); } catch { /* no-op */ }
  state.drag = null;
  clearStackDropTarget();
  controls.enabled = true;
  dom.canvas.classList.remove("dragging");
  updateWorkspaceUI();
  if (moved) {
    commitHistory();
    if (root.userData.data.type === "box") {
      toast(previewSupport ? `${previewSupport.userData.data.name} 위에 적재했습니다.` : "박스를 바닥에 놓았습니다.");
    }
  }
  event?.preventDefault?.();
}

function floatingSpawnElevation(type) {
  if (type === "safety") return 0;
  const definition = ASSET_DEFINITIONS[type] ?? ASSET_DEFINITIONS.box;
  const maxElevation = Math.max(0, state.warehouse.height - definition.height);
  if (maxElevation < 0.25) return 0;
  const preferred = Math.max(Number(definition.elevation ?? 0), clamp(state.warehouse.height * 0.18, 1.15, 2.2));
  return round(Math.min(maxElevation, preferred), 2);
}

function addObjectAt(type, x, y, options = {}) {
  if (state.selectionLocked) {
    toast("전체 잠금을 해제한 뒤 설비를 추가해 주세요.", "error");
    return null;
  }
  const offset = state.objects.length % 6;
  const spawnZ = floatingSpawnElevation(type);
  const root = createObject(type, {
    x: Number.isFinite(x) ? x : state.warehouse.width / 2 + offset * 0.35,
    y: Number.isFinite(y) ? y : state.warehouse.depth / 2 + offset * 0.35,
    z: spawnZ,
  }, { commit: false });
  let support = null;
  if (type === "box" && options.stackOnDrop) {
    support = findStackSupport(root);
    if (support) {
      if (support.userData.data.type === "box") {
        root.position.x = support.position.x;
        root.position.z = support.position.z;
      }
      root.userData.data.supportId = support.userData.data.id;
      root.position.y = topOf(support);
      reflowSupportTree(root);
      updateWorkspaceUI();
    }
  }
  commitHistory();
  if (support) toast(`${support.userData.data.name} 위에 박스를 추가했습니다.`);
  else if (spawnZ > 0) toast(`${root.userData.data.name} 객체를 공중에 추가했습니다. 위치를 정한 뒤 바닥으로 내리세요.`);
  return root;
}

function updateInspectorValuesOnly() {
  if (!state.selected) return;
  const data = state.selected.userData.data;
  const position = logicalPosition(state.selected);
  dom.positionX.value = round(position.x, 2);
  dom.positionY.value = round(position.y, 2);
  dom.positionZ.value = round(position.z, 2);
  dom.rotationY.value = round(THREE.MathUtils.radToDeg(state.selected.rotation.y), 1);
  dom.selectionPosition.textContent = `X ${round(position.x, 1)} · Y ${round(position.y, 1)} · Z ${round(position.z, 1)}`;
  dom.selectionLabel.textContent = data.name;
}

function updateInspector() {
  const root = state.selected;
  const hasSelection = Boolean(root);
  dom.noSelection.hidden = hasSelection;
  dom.selectionInspector.hidden = !hasSelection;
  dom.selectionChip.hidden = !hasSelection;
  if (!root) return;
  const data = root.userData.data;
  const definition = ASSET_DEFINITIONS[data.type];
  dom.inspectorType.textContent = definition.english;
  dom.objectName.value = data.name;
  dom.objectWidth.value = round(data.width, 3);
  dom.objectDepth.value = round(data.depth, 3);
  dom.objectHeight.value = round(data.height, 3);
  dom.objectColor.value = data.color;
  dom.colorValue.textContent = data.color.toUpperCase();
  dom.selectionDot.style.background = data.color;
  updateInspectorValuesOnly();

  const isRack = data.type === "rack";
  const isBoxRack = data.type === "boxrack";
  dom.rackFields.hidden = !(isRack || isBoxRack);
  if (isRack || isBoxRack) {
    dom.rackConfigTitle.textContent = isBoxRack ? "박스랙 구성" : "팔레트랙 구성";
    dom.rackPalletsLabel.textContent = isBoxRack ? "칸당 BOX" : "단당 PLT";
    dom.rackCapacityLabel.textContent = isBoxRack ? "총 보관 가능 박스" : "예상 보관 로케이션";
    dom.rackBays.value = data.config.bays;
    dom.rackLevels.value = data.config.levels;
    dom.rackPallets.value = isBoxRack ? data.config.boxesPerCell : data.config.palletsPerLevel;
    updateRackCapacity();
  }

  const isStack = data.type === "stack";
  dom.stackFields.hidden = !isStack;
  [dom.objectWidth, dom.objectDepth, dom.objectHeight].forEach((input) => { input.disabled = isStack; });
  if (isStack && data.stack) {
    dom.stackPerLayer.textContent = `${data.stack.perLayer.toLocaleString()} BOX`;
    dom.stackLayers.textContent = `${data.stack.layers.toLocaleString()} LAYER`;
    dom.stackTotal.textContent = `${data.stack.count.toLocaleString()} BOX`;
  }

  const isPallet = data.type === "pallet";
  dom.palletCapacityFields.hidden = !isPallet;
  if (isPallet) {
    const config = data.config ?? (data.config = deepCopy(ASSET_DEFINITIONS.pallet.config));
    dom.palletBoxWidth.value = config.boxWidth;
    dom.palletBoxDepth.value = config.boxDepth;
    dom.palletBoxHeight.value = config.boxHeight;
    dom.palletMaxHeight.value = config.maxStackHeight;
    updatePalletCapacity();
  }

  const isManualBox = data.type === "box";
  dom.manualStackFields.hidden = !isManualBox;
  if (isManualBox) {
    const support = objectById(data.supportId);
    dom.boxSupportName.textContent = support?.userData.data.name ?? (root.position.y > 0.005 ? "사용자 지정 높이" : "바닥");
    dom.boxElevation.textContent = `Z ${round(root.position.y, 2)}m`;
    dom.unstackBtn.disabled = !support && root.position.y <= 0.005;
  }

  const isTextConfig = ["sign", "warning", "textlabel"].includes(data.type);
  const isFreeText = data.type === "textlabel";
  dom.signFields.hidden = !isTextConfig;
  if (isTextConfig) {
    dom.textConfigTitle.textContent = isFreeText ? "일반 텍스트" : "표지판 문구";
    dom.textLimitLabel.textContent = isFreeText ? "최대 40자" : "최대 24자";
    dom.signText.maxLength = isFreeText ? 40 : 24;
    dom.signText.placeholder = isFreeText ? "표시할 텍스트" : "표지판 문구";
    dom.signPresetRow.hidden = isFreeText;
    dom.signText.value = data.config?.text ?? "";
    dom.signPreset.value = [...dom.signPreset.options].some((option) => option.value === dom.signText.value) ? dom.signText.value : "";
  }
  dom.positionZ.max = Math.max(0, state.warehouse.height - data.height);
  const editLocked = isEditLocked(root);
  dom.objectLockBtn.classList.toggle("active", data.locked);
  dom.objectLockBtn.setAttribute("aria-pressed", String(data.locked));
  dom.objectLockBtn.textContent = data.locked ? "🔒 이 객체 잠금 해제" : "🔓 이 객체 잠금";
  dom.selectionInspector.classList.toggle("inspector-locked", editLocked);
  const alwaysEditable = [dom.objectLockBtn];
  const editControls = [
    dom.objectName,
    dom.positionX,
    dom.positionY,
    dom.positionZ,
    dom.rotationY,
    dom.objectColor,
    dom.rackBays,
    dom.rackLevels,
    dom.rackPallets,
    dom.palletBoxWidth,
    dom.palletBoxDepth,
    dom.palletBoxHeight,
    dom.palletMaxHeight,
    dom.signText,
    dom.signPreset,
    dom.groundObjectBtn,
    dom.unstackBtn,
    $("#duplicate-btn"),
    $("#more-btn"),
    $("#delete-btn"),
    ...$$('[data-rotation]'),
  ];
  editControls.forEach((control) => { if (control) control.disabled = editLocked; });
  alwaysEditable.forEach((control) => { control.disabled = false; });
  [dom.objectWidth, dom.objectDepth, dom.objectHeight].forEach((input) => { input.disabled = editLocked || isStack; });
  if (!editLocked) {
    dom.unstackBtn.disabled = !isManualBox || (!data.supportId && root.position.y <= 0.005);
    dom.groundObjectBtn.disabled = root.position.y <= 0.005 && !data.supportId;
  }
  refreshSelectionHelper();
}

function updateRackCapacity() {
  if (!state.selected || !["rack", "boxrack"].includes(state.selected.userData.data.type)) return;
  const data = state.selected.userData.data;
  const config = data.config;
  const isBoxRack = data.type === "boxrack";
  const capacity = config.bays * config.levels * (isBoxRack ? config.boxesPerCell : config.palletsPerLevel);
  dom.rackCapacity.textContent = `${capacity.toLocaleString()} ${isBoxRack ? "BOX" : "PLT"}`;
}

function updatePalletCapacity() {
  if (!state.selected || state.selected.userData.data.type !== "pallet") return;
  const result = calculatePalletBoxCapacity(state.selected.userData.data);
  dom.palletCapacityDetail.textContent = `층당 ${result.perLayer.toLocaleString()} × ${result.layers.toLocaleString()}층${result.rotated ? " · 회전 배치" : ""}`;
  dom.palletCapacityTotal.textContent = `${result.total.toLocaleString()} BOX`;
}

function renderSceneList() {
  dom.objectCountChip.textContent = state.objects.length;
  if (!state.objects.length) {
    dom.sceneList.innerHTML = '<div class="scene-empty">아직 배치된 객체가 없습니다.</div>';
    return;
  }
  dom.sceneList.replaceChildren(...state.objects.map((root) => {
    const data = root.userData.data;
    const definition = ASSET_DEFINITIONS[data.type];
    const position = logicalPosition(root);
    const row = document.createElement("div");
    row.className = `scene-row${root === state.selected ? " active" : ""}${data.locked ? " locked" : ""}`;
    row.dataset.objectId = data.id;
    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "scene-row-main";
    mainButton.innerHTML = `
      <span class="scene-row-icon" style="color:${data.color}">${definition.icon}</span>
      <span class="scene-row-copy"><strong></strong><small>${definition.english}</small></span>
      <small>${round(position.x, 1)}, ${round(position.y, 1)}${position.z > 0.005 ? ` · Z${round(position.z, 1)}` : ""}</small>
    `;
    mainButton.querySelector("strong").textContent = data.name;
    mainButton.addEventListener("click", () => selectObject(root));
    mainButton.addEventListener("dblclick", () => focusObject(root));
    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = `scene-lock-btn${data.locked ? " active" : ""}`;
    lockButton.textContent = data.locked ? "🔒" : "🔓";
    lockButton.title = data.locked ? "객체 잠금 해제" : "이 객체 잠금";
    lockButton.setAttribute("aria-label", `${data.name} ${data.locked ? "잠금 해제" : "잠금"}`);
    lockButton.setAttribute("aria-pressed", String(data.locked));
    lockButton.addEventListener("click", () => toggleObjectLock(root));
    row.append(mainButton, lockButton);
    return row;
  }));
}

function focusObject(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const distance = Math.max(3.5, Math.max(size.x, size.y, size.z) * 2.2);
  controls.target.copy(center);
  camera.position.copy(center.clone().add(new THREE.Vector3(distance, distance * 0.75, distance)));
  controls.update();
  state.view = "3d";
  updateViewButtons();
}

function updateMetrics() {
  let locations = 0;
  let pallets = 0;
  let occupiedArea = 0;
  state.objects.forEach((root) => {
    const data = root.userData.data;
    if (data.type === "rack") locations += data.config.bays * data.config.levels * data.config.palletsPerLevel;
    if (data.type === "boxrack") locations += data.config.bays * data.config.levels;
    if (data.type === "pallet" || data.type === "stack") pallets += 1;
    if (data.type !== "safety" && root.position.y <= 0.01) {
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      occupiedArea += size.x * size.z;
    }
  });
  const totalArea = state.warehouse.width * state.warehouse.depth;
  const utilization = totalArea ? Math.min(100, (occupiedArea / totalArea) * 100) : 0;
  const capacity = storageCapacitySummary();
  dom.metricLocations.textContent = locations.toLocaleString();
  dom.metricPallets.textContent = pallets.toLocaleString();
  dom.metricBoxes.textContent = capacity.total.toLocaleString();
  dom.metricCapacityDetail.textContent = `박스랙 ${capacity.boxRackCapacity.toLocaleString()} · 팔레트 ${capacity.palletCapacity.toLocaleString()} · 바닥 ${capacity.looseBoxes.toLocaleString()}`;
  dom.metricCapacityDetail.title = `총 ${capacity.total.toLocaleString()} BOX = 박스랙 ${capacity.boxRackCapacity.toLocaleString()} + 팔레트 ${capacity.palletCapacity.toLocaleString()} + 바닥·독립 적재 ${capacity.looseBoxes.toLocaleString()} (현재 실제 배치 ${capacity.actualBoxes.toLocaleString()} BOX)`;
  dom.metricObjects.textContent = state.objects.length.toLocaleString();
  dom.metricUtilization.textContent = `${round(utilization, 1)}%`;
  dom.metricArea.textContent = `${round(occupiedArea, 1)} / ${totalArea.toLocaleString()} m²`;
  dom.metricProgress.style.width = `${utilization}%`;
}

function updateWorkspaceUI() {
  updateInspector();
  renderSceneList();
  updateMetrics();
}

function toast(message, type = "") {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.className = `toast show${type ? ` ${type}` : ""}`;
  toastTimer = setTimeout(() => { dom.toast.className = "toast"; }, 2500);
}

function sanitizeFileName(name) {
  return (name || "warehouse-project").replace(/[\\/:*?"<>|]+/g, "-").trim().replace(/\s+/g, "-").slice(0, 60) || "warehouse-project";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProject() {
  const payload = { ...projectData(), exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFileName(payload.projectName)}.json`);
  toast("프로젝트 JSON 파일을 내보냈습니다.");
}

function exportReferenceLayoutCandidate() {
  const payload = {
    ...projectData(),
    exportedAt: new Date().toISOString(),
    reference: {
      name: dom.projectName.value.trim() || "기준 물류센터",
      description: "",
      location: "",
      tags: [],
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFileName(payload.projectName)}.json`);
  toast("기준 도면용 JSON을 저장했습니다. layouts 폴더에 업로드해 주세요.");
}

function setLayoutStatus(message, error = false) {
  dom.layoutStatus.textContent = message;
  dom.layoutStatus.classList.toggle("error", error);
}

function resolveLayoutUrl(fileName) {
  const base = new URL("./layouts/", document.baseURI);
  const url = new URL(String(fileName || ""), base);
  const isJson = url.pathname.toLowerCase().endsWith(".json");
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !isJson) {
    throw new Error("layouts 폴더 안의 JSON 파일만 불러올 수 있습니다.");
  }
  return url;
}

function normalizeReferenceLayout(entry, index) {
  if (!entry || typeof entry !== "object" || !entry.file) return null;
  try {
    resolveLayoutUrl(entry.file);
  } catch {
    return null;
  }
  const warehouse = entry.warehouse && typeof entry.warehouse === "object"
    ? {
      width: Number(entry.warehouse.width) || 0,
      depth: Number(entry.warehouse.depth) || 0,
      height: Number(entry.warehouse.height) || 0,
    }
    : null;
  return {
    id: String(entry.id || `layout-${index + 1}`),
    name: String(entry.name || entry.id || `기준 도면 ${index + 1}`),
    file: String(entry.file),
    description: String(entry.description || ""),
    location: String(entry.location || ""),
    category: String(entry.category || "기준 도면"),
    updatedAt: String(entry.updatedAt || ""),
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag)).slice(0, 12) : [],
    warehouse,
  };
}

function makeTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderReferenceLayouts() {
  const query = dom.layoutSearch.value.trim().toLocaleLowerCase("ko-KR");
  const filtered = state.referenceLayouts.filter((layout) => {
    if (!query) return true;
    return [layout.name, layout.description, layout.location, layout.category, ...layout.tags]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(query);
  });

  dom.layoutCount.textContent = query
    ? `${filtered.length}/${state.referenceLayouts.length}개`
    : `${state.referenceLayouts.length}개`;
  dom.layoutList.replaceChildren();

  if (!filtered.length) {
    const empty = makeTextElement(
      "div",
      "layout-empty",
      state.layoutsLoaded ? "조건에 맞는 기준 도면이 없습니다." : "layouts/index.json에서 기준 도면을 불러옵니다.",
    );
    dom.layoutList.append(empty);
    return;
  }

  const cards = filtered.map((layout) => {
    const card = document.createElement("article");
    card.className = "layout-card";

    const head = document.createElement("div");
    head.className = "layout-card-head";
    head.append(
      makeTextElement("strong", "", layout.name),
      makeTextElement("span", "", layout.category),
    );

    const dimensions = layout.warehouse && layout.warehouse.width && layout.warehouse.depth
      ? `${layout.warehouse.width} × ${layout.warehouse.depth} × ${layout.warehouse.height || "-"}m`
      : "규격 정보 없음";
    const metadata = [layout.location, dimensions, layout.updatedAt ? `수정 ${layout.updatedAt}` : ""]
      .filter(Boolean)
      .join(" · ");
    const meta = makeTextElement("div", "layout-card-meta", metadata);
    const description = makeTextElement("p", "", layout.description || "등록된 기준 물류센터 도면입니다.");

    const tags = document.createElement("div");
    tags.className = "layout-tags";
    (layout.tags.length ? layout.tags : ["물류센터"]).slice(0, 6)
      .forEach((tag) => tags.append(makeTextElement("span", "", tag)));

    const loadButton = makeTextElement("button", "layout-load-btn", "이 도면 불러오기");
    loadButton.type = "button";
    loadButton.addEventListener("click", () => loadReferenceLayout(layout, loadButton));
    card.append(head, meta, description, tags, loadButton);
    return card;
  });
  dom.layoutList.append(...cards);
}

async function loadReferenceLayouts(force = false) {
  if (state.layoutsLoaded && !force) {
    renderReferenceLayouts();
    return;
  }
  dom.layoutRefreshBtn.disabled = true;
  dom.layoutList.setAttribute("aria-busy", "true");
  setLayoutStatus("layouts/index.json을 읽는 중입니다.");
  try {
    const response = await fetch(LAYOUTS_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`도면 목록을 읽지 못했습니다. HTTP ${response.status}`);
    const manifest = await response.json();
    const entries = Array.isArray(manifest) ? manifest : manifest.layouts;
    if (!Array.isArray(entries)) throw new Error("layouts/index.json의 layouts 배열을 확인해 주세요.");
    state.referenceLayouts = entries
      .map(normalizeReferenceLayout)
      .filter(Boolean);
    state.layoutsLoaded = true;
    setLayoutStatus(
      state.referenceLayouts.length
        ? `기준 도면 ${state.referenceLayouts.length}개를 불러왔습니다.`
        : "등록된 기준 도면이 없습니다. layouts/index.json에 도면을 추가해 주세요.",
    );
    renderReferenceLayouts();
  } catch (error) {
    state.referenceLayouts = [];
    state.layoutsLoaded = false;
    setLayoutStatus(error.message || "기준 도면 목록을 불러오지 못했습니다.", true);
    renderReferenceLayouts();
  } finally {
    dom.layoutRefreshBtn.disabled = false;
    dom.layoutList.removeAttribute("aria-busy");
  }
}

async function openReferenceLayouts() {
  dom.layoutsDialog.showModal();
  dom.layoutSearch.value = "";
  await loadReferenceLayouts();
}

async function loadReferenceLayout(layout, button) {
  if (state.objects.length && !window.confirm(`현재 배치를 '${layout.name}' 도면으로 바꿀까요? 저장하지 않은 변경사항은 사라집니다.`)) return;
  button.disabled = true;
  button.textContent = "불러오는 중…";
  setLayoutStatus(`${layout.name} 도면을 불러오는 중입니다.`);
  try {
    const response = await fetch(resolveLayoutUrl(layout.file), { cache: "no-store" });
    if (!response.ok) throw new Error(`도면 파일을 읽지 못했습니다. HTTP ${response.status}`);
    const project = await response.json();
    loadProject(project);
    resetHistory(false);
    dom.layoutsDialog.close();
    toast(`${layout.name} 기준 도면을 불러왔습니다.`);
  } catch (error) {
    setLayoutStatus(error.message || "기준 도면을 불러오지 못했습니다.", true);
    button.disabled = false;
    button.textContent = "이 도면 불러오기";
  }
}

function saveProjectLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, projectSnapshot());
    setDirty(false);
    toast("현재 프로젝트를 이 브라우저에 저장했습니다.");
  } catch {
    toast("브라우저 저장 공간을 사용할 수 없습니다. JSON 내보내기를 이용해 주세요.", "error");
  }
}

async function importProjectFile(file) {
  try {
    const text = await file.text();
    const project = JSON.parse(text);
    loadProject(project);
    resetHistory(true);
    toast("프로젝트를 불러왔습니다.");
  } catch (error) {
    toast(error.message || "프로젝트 파일을 읽지 못했습니다.", "error");
  }
}

function saveScreenshot() {
  renderer.render(scene, camera);
  dom.canvas.toBlob((blob) => {
    if (!blob) {
      toast("이미지를 저장하지 못했습니다.", "error");
      return;
    }
    downloadBlob(blob, `${sanitizeFileName(dom.projectName.value)}-3d.png`);
    toast("현재 3D 화면을 PNG로 저장했습니다.");
  }, "image/png");
}

function newBlankProject() {
  if (state.objects.length && !window.confirm("현재 배치를 지우고 새 도면을 시작할까요? 저장하지 않은 변경사항은 사라집니다.")) return;
  clearObjects();
  state.warehouse = { width: 30, depth: 20, height: 8 };
  dom.projectName.value = "New Warehouse";
  syncWarehouseInputs();
  createWarehouseVisual();
  resetHistory(true);
  fitWarehouseView();
  toast("빈 창고 도면을 만들었습니다.");
}

function loadExample(options = {}) {
  if (!options.initial && state.objects.length && !window.confirm("현재 배치를 예제 창고로 바꿀까요?")) return;
  const project = {
    projectName: "Sample Distribution Center",
    warehouse: { width: 36, depth: 24, height: 9 },
    objects: [
      { type: "safety", name: "입고 대기 구역", width: 8, depth: 3.2, height: 0.025, color: "#e2a736", x: 7, y: 21.1, rotation: 0 },
      { type: "safety", name: "출고 대기 구역", width: 8, depth: 3.2, height: 0.025, color: "#579deb", x: 29, y: 21.1, rotation: 0 },
      { type: "rack", name: "A열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 8.2, y: 6.2, rotation: 0 },
      { type: "rack", name: "B열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 8.2, y: 10.2, rotation: 0 },
      { type: "rack", name: "C열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 8.2, y: 14.2, rotation: 0 },
      { type: "rack", name: "D열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 27.6, y: 6.2, rotation: 0 },
      { type: "rack", name: "E열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 27.6, y: 10.2, rotation: 0 },
      { type: "rack", name: "F열 랙", width: 8.4, depth: 1.1, height: 6.5, color: "#24c98a", config: { bays: 4, levels: 5, palletsPerLevel: 2 }, x: 27.6, y: 14.2, rotation: 0 },
      { type: "conveyor", name: "검수 컨베이어", width: 7.5, depth: 0.85, height: 0.82, color: "#589dea", x: 18, y: 20.6, rotation: 0 },
      { type: "worktable", name: "패킹 작업대 01", width: 2.2, depth: 0.9, height: 0.9, color: "#8f79d6", x: 14.3, y: 17.8, rotation: 0 },
      { type: "worktable", name: "패킹 작업대 02", width: 2.2, depth: 0.9, height: 0.9, color: "#8f79d6", x: 21.7, y: 17.8, rotation: 0 },
      { type: "dock", name: "입고 도크", width: 3, depth: 2.2, height: 3.4, color: "#68817a", x: 4.2, y: 1.15, rotation: 180 },
      { type: "dock", name: "출고 도크", width: 3, depth: 2.2, height: 3.4, color: "#68817a", x: 31.8, y: 1.15, rotation: 180 },
      { type: "forklift", name: "지게차 01", width: 1.2, depth: 2.4, height: 2.2, color: "#f2b84f", x: 18, y: 9.8, rotation: 90 },
      { type: "boxrack", name: "소형품 박스랙", width: 4.2, depth: 0.72, height: 2.4, color: "#d7a14b", config: { bays: 5, levels: 5, boxesPerCell: 3 }, x: 18, y: 5.4, rotation: 0 },
      { type: "person", name: "작업자 01", width: 0.55, depth: 0.45, height: 1.72, color: "#52a7ef", x: 18, y: 17.7, rotation: 20 },
      { type: "computer", name: "패킹 PC", width: 0.68, depth: 0.52, height: 0.62, color: "#54758b", x: 14.3, y: 17.8, z: 0.9, rotation: 0 },
      { type: "printer", name: "라벨 프린터", width: 0.52, depth: 0.5, height: 0.4, color: "#76858c", x: 21.7, y: 17.8, z: 0.9, rotation: 0 },
      { type: "cctv", name: "입고장 CCTV", width: 0.5, depth: 0.34, height: 0.3, color: "#d7e1dc", x: 2, y: 2, z: 3.2, rotation: 135 },
      { type: "extinguisher", name: "소화기 01", width: 0.32, depth: 0.32, height: 0.72, color: "#e34f49", x: 2.2, y: 22.8, rotation: 0 },
      { type: "firstaid", name: "구급함 01", width: 0.48, depth: 0.2, height: 0.58, color: "#35bd77", x: 3.2, y: 23.8, z: 1.2, rotation: 0 },
      { type: "door", name: "작업자 출입문", width: 1, depth: 0.2, height: 2.15, color: "#4b7164", x: 18, y: 23.85, rotation: 0 },
      { type: "sign", name: "출입구 안내", width: 1.2, depth: 0.12, height: 0.7, color: "#258bd2", config: { text: "보행자 출입구", tone: "info" }, x: 18, y: 23.75, z: 2.35, rotation: 0 },
      { type: "warning", name: "지게차 경고", width: 1.2, depth: 0.12, height: 0.7, color: "#e7a62f", config: { text: "지게차 주의", tone: "warning" }, x: 13.2, y: 15.4, z: 1.5, rotation: 0 },
      { type: "pallet", id: "sample-manual-pallet", name: "수동 적재 팔레트", width: 1.2, depth: 1, height: 0.14, color: "#a97a4c", x: 30.2, y: 21.1, rotation: 0 },
      { type: "box", id: "sample-manual-box-1", supportId: "sample-manual-pallet", name: "수동 박스 01", width: 0.4, depth: 0.3, height: 0.25, color: "#d6a45d", x: 30.2, y: 21.1, z: 0.14, rotation: 0 },
      { type: "box", id: "sample-manual-box-2", supportId: "sample-manual-box-1", name: "수동 박스 02", width: 0.4, depth: 0.3, height: 0.25, color: "#cf9554", x: 30.2, y: 21.1, z: 0.39, rotation: 0 },
      { type: "box", id: "sample-manual-box-3", supportId: "sample-manual-box-2", name: "수동 박스 03", width: 0.4, depth: 0.3, height: 0.25, color: "#dfb268", x: 30.2, y: 21.1, z: 0.64, rotation: 0 },
      {
        type: "stack",
        name: "입고 팔레트 01",
        width: 1.2,
        depth: 1,
        height: 1.14,
        color: "#d6a45d",
        x: 5.6,
        y: 21.2,
        rotation: 0,
        stack: {
          palletWidth: 1.2, palletDepth: 1, palletHeight: 0.14, maxHeight: 1.8,
          boxWidth: 0.4, boxDepth: 0.3, boxHeight: 0.25, requestedCount: 36,
          count: 36, perLayer: 9, layers: 4, maxLayers: 6, totalHeight: 1.14,
          rotated: false, utilization: 1, valid: true,
        },
      },
      {
        type: "stack",
        name: "입고 팔레트 02",
        width: 1.2,
        depth: 1,
        height: 0.89,
        color: "#c98e50",
        x: 7.2,
        y: 21.2,
        rotation: 0,
        stack: {
          palletWidth: 1.2, palletDepth: 1, palletHeight: 0.14, maxHeight: 1.8,
          boxWidth: 0.4, boxDepth: 0.3, boxHeight: 0.25, requestedCount: 27,
          count: 27, perLayer: 9, layers: 3, maxLayers: 6, totalHeight: 0.89,
          rotated: false, utilization: 1, valid: true,
        },
      },
    ],
  };
  loadProject(project);
  resetHistory(!options.initial);
  if (!options.initial) toast("예제 물류센터를 불러왔습니다.");
}

function stackInputValues() {
  return {
    palletWidth: dom.stackPalletWidth.value,
    palletDepth: dom.stackPalletDepth.value,
    maxHeight: dom.stackMaxHeight.value,
    boxWidth: dom.stackBoxWidth.value,
    boxDepth: dom.stackBoxDepth.value,
    boxHeight: dom.stackBoxHeight.value,
    count: dom.stackBoxCount.value,
  };
}

function updateStackPreview() {
  const result = calculateStackLayout(stackInputValues());
  if (!result.valid) {
    dom.stackPreviewTitle.textContent = "적재할 수 없음";
    dom.stackPreviewDetail.textContent = "박스 규격 또는 최대 높이를 확인해 주세요.";
    return result;
  }
  dom.stackPreviewTitle.textContent = `${result.perLayer.toLocaleString()} BOX × ${result.layers.toLocaleString()} LAYER`;
  const percent = Math.round(result.utilization * 100);
  dom.stackPreviewDetail.textContent = `총 ${result.count.toLocaleString()} BOX · 높이 ${round(result.totalHeight, 2)}m · 요청 충족률 ${percent}%`;
  return result;
}

function openStackDialog() {
  if (state.selectionLocked) {
    toast("전체 잠금을 해제한 뒤 적재 객체를 추가해 주세요.", "error");
    return;
  }
  const selectedPallet = state.selected?.userData.data.type === "pallet" && !state.selected.userData.data.locked ? state.selected : null;
  if (selectedPallet) {
    const data = selectedPallet.userData.data;
    dom.stackPalletWidth.value = data.width;
    dom.stackPalletDepth.value = data.depth;
    dom.replacePalletRow.hidden = false;
    dom.replacePalletCheck.checked = true;
  } else {
    dom.replacePalletRow.hidden = true;
    dom.replacePalletCheck.checked = false;
  }
  updateStackPreview();
  dom.stackDialog.showModal();
}

function createStackFromDialog(event) {
  event.preventDefault();
  if (state.selectionLocked) {
    toast("전체 잠금을 해제한 뒤 적재 객체를 추가해 주세요.", "error");
    return;
  }
  const result = updateStackPreview();
  if (!result.valid) {
    toast("현재 규격으로는 팔레트에 박스를 적재할 수 없습니다.", "error");
    return;
  }
  const selectedPallet = state.selected?.userData.data.type === "pallet" && !state.selected.userData.data.locked ? state.selected : null;
  let x = state.warehouse.width / 2;
  let y = state.warehouse.depth / 2;
  let rotation = 0;
  if (selectedPallet && dom.replacePalletCheck.checked) {
    const position = logicalPosition(selectedPallet);
    x = position.x;
    y = position.y;
    rotation = THREE.MathUtils.radToDeg(selectedPallet.rotation.y);
    removeObject(selectedPallet, { commit: false });
  }
  createObject("stack", {
    name: nextObjectName("stack"),
    width: result.palletWidth,
    depth: result.palletDepth,
    height: result.totalHeight,
    color: "#d6a45d",
    x,
    y,
    rotation,
    stack: result,
  }, { commit: false });
  commitHistory();
  dom.stackDialog.close();
  const shortfall = result.count < result.requestedCount;
  toast(shortfall
    ? `${result.count.toLocaleString()} BOX만 최대 높이 내에 적재했습니다.`
    : `${result.count.toLocaleString()} BOX 적재 팔레트를 생성했습니다.`, shortfall ? "error" : "");
}

function updateAssetFilter() {
  const category = dom.assetCategoryFilter.value;
  const query = dom.assetSearch.value.trim().toLocaleLowerCase("ko-KR");
  const cards = $$("#asset-grid .asset-card");
  const visibleCategories = new Set();
  let visibleCount = 0;
  cards.forEach((card) => {
    const categoryMatch = category === "all" || card.dataset.category === category;
    const queryMatch = !query || card.textContent.toLocaleLowerCase("ko-KR").includes(query);
    const visible = categoryMatch && queryMatch;
    card.hidden = !visible;
    if (visible) {
      visibleCount += 1;
      visibleCategories.add(card.dataset.category);
    }
  });
  $$("#asset-grid .asset-group-title").forEach((heading) => {
    heading.hidden = !visibleCategories.has(heading.dataset.category);
  });
  dom.assetFilterCount.textContent = `${visibleCount}/${cards.length}개 설비`;
}

function setupAssetFilters() {
  let category = "logistics";
  [...$("#asset-grid").children].forEach((element) => {
    if (element.classList.contains("asset-group-title")) category = element.dataset.category || category;
    else if (element.classList.contains("asset-card")) element.dataset.category = category;
  });
  dom.assetCategoryFilter.addEventListener("change", updateAssetFilter);
  dom.assetSearch.addEventListener("input", updateAssetFilter);
  updateAssetFilter();
}

function bindInspectorInputs() {
  dom.objectName.addEventListener("input", () => {
    if (!state.selected || isEditLocked()) return;
    const name = dom.objectName.value.trim() || ASSET_DEFINITIONS[state.selected.userData.data.type].label;
    state.selected.userData.data.name = name;
    state.selected.name = name;
    updateInspectorValuesOnly();
    renderSceneList();
  });
  dom.objectName.addEventListener("change", () => { if (!isEditLocked()) commitHistory(); });

  const updatePlanarTransform = () => {
    if (!state.selected || isEditLocked()) return;
    const root = state.selected;
    const previousPosition = root.position.clone();
    const previousRotation = root.rotation.y;
    root.position.x = Number(dom.positionX.value) - state.warehouse.width / 2;
    root.position.z = Number(dom.positionY.value) - state.warehouse.depth / 2;
    root.rotation.y = THREE.MathUtils.degToRad(Number(dom.rotationY.value) || 0);
    constrainObject(root);
    if (root.userData.data.type === "box") snapBoxToBestSupport(root);
    moveSupportedDescendants(root, previousPosition, previousRotation);
    reflowSupportTree(root);
    refreshSelectionHelper();
    updateInspectorValuesOnly();
    updateMetrics();
  };
  [dom.positionX, dom.positionY, dom.rotationY].forEach((input) => {
    input.addEventListener("input", updatePlanarTransform);
    input.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });
  });

  const updateVerticalTransform = () => {
    if (!state.selected || isEditLocked()) return;
    const root = state.selected;
    const previousPosition = root.position.clone();
    root.position.y = Number(dom.positionZ.value) || 0;
    if (root.userData.data.type === "box") root.userData.data.supportId = null;
    constrainObject(root);
    moveSupportedDescendants(root, previousPosition, root.rotation.y);
    reflowSupportTree(root);
    refreshSelectionHelper();
    updateInspectorValuesOnly();
    updateMetrics();
  };
  dom.positionZ.addEventListener("input", updateVerticalTransform);
  dom.positionZ.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });

  const updateDimensions = () => {
    if (!state.selected || isEditLocked() || state.selected.userData.data.type === "stack") return;
    const data = state.selected.userData.data;
    data.width = Math.max(0.02, Number(dom.objectWidth.value) || data.width);
    data.depth = Math.max(0.02, Number(dom.objectDepth.value) || data.depth);
    data.height = Math.max(0.01, Number(dom.objectHeight.value) || data.height);
    if (data.type === "safety") data.height = Math.min(0.1, data.height);
    rebuildObjectVisual(state.selected);
    updateDimensionLabel(state.selected);
    constrainObject(state.selected);
    if (data.type === "box") snapBoxToBestSupport(state.selected);
    if (data.type === "pallet") {
      data.config.maxStackHeight = Math.max(data.height, Number(data.config.maxStackHeight) || data.height);
      dom.palletMaxHeight.value = data.config.maxStackHeight;
      updatePalletCapacity();
    }
    reflowSupportTree(state.selected);
    refreshSelectionHelper();
    updateInspectorValuesOnly();
    updateMetrics();
  };
  [dom.objectWidth, dom.objectDepth, dom.objectHeight].forEach((input) => {
    input.addEventListener("input", updateDimensions);
    input.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });
  });

  dom.objectColor.addEventListener("input", () => {
    if (!state.selected || isEditLocked()) return;
    state.selected.userData.data.color = dom.objectColor.value;
    dom.colorValue.textContent = dom.objectColor.value.toUpperCase();
    dom.selectionDot.style.background = dom.objectColor.value;
    rebuildObjectVisual(state.selected);
    refreshSelectionHelper();
    renderSceneList();
  });
  dom.objectColor.addEventListener("change", () => { if (!isEditLocked()) commitHistory(); });

  const updatePalletSettings = () => {
    if (!state.selected || isEditLocked() || state.selected.userData.data.type !== "pallet") return;
    const data = state.selected.userData.data;
    const config = data.config ?? (data.config = deepCopy(ASSET_DEFINITIONS.pallet.config));
    config.boxWidth = Math.max(0.02, Number(dom.palletBoxWidth.value) || config.boxWidth);
    config.boxDepth = Math.max(0.02, Number(dom.palletBoxDepth.value) || config.boxDepth);
    config.boxHeight = Math.max(0.02, Number(dom.palletBoxHeight.value) || config.boxHeight);
    config.maxStackHeight = Math.max(data.height, Number(dom.palletMaxHeight.value) || config.maxStackHeight);
    updatePalletCapacity();
    updateMetrics();
  };
  [dom.palletBoxWidth, dom.palletBoxDepth, dom.palletBoxHeight, dom.palletMaxHeight].forEach((input) => {
    input.addEventListener("input", updatePalletSettings);
    input.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });
  });

  const updateRack = () => {
    if (!state.selected || isEditLocked() || !["rack", "boxrack"].includes(state.selected.userData.data.type)) return;
    const data = state.selected.userData.data;
    const config = data.config;
    config.bays = clamp(Math.round(Number(dom.rackBays.value) || config.bays), 1, 30);
    config.levels = clamp(Math.round(Number(dom.rackLevels.value) || config.levels), 1, 12);
    if (data.type === "boxrack") {
      config.boxesPerCell = clamp(Math.round(Number(dom.rackPallets.value) || config.boxesPerCell), 1, 20);
    } else {
      config.palletsPerLevel = clamp(Math.round(Number(dom.rackPallets.value) || config.palletsPerLevel), 1, 6);
    }
    rebuildObjectVisual(state.selected);
    updateRackCapacity();
    refreshSelectionHelper();
    updateMetrics();
  };
  [dom.rackBays, dom.rackLevels, dom.rackPallets].forEach((input) => {
    input.addEventListener("input", updateRack);
    input.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });
  });

  const updateSignText = (value) => {
    if (!state.selected || isEditLocked() || !["sign", "warning", "textlabel"].includes(state.selected.userData.data.type)) return;
    const data = state.selected.userData.data;
    const isFreeText = data.type === "textlabel";
    data.config = { ...(data.config ?? {}), text: String(value || (isFreeText ? "텍스트 입력" : "표지판")).slice(0, isFreeText ? 40 : 24) };
    rebuildObjectVisual(state.selected);
    refreshSelectionHelper();
    renderSceneList();
  };
  dom.signText.addEventListener("input", () => updateSignText(dom.signText.value));
  dom.signText.addEventListener("change", () => { if (!isEditLocked()) { updateWorkspaceUI(); commitHistory(); } });
  dom.signPreset.addEventListener("change", () => {
    if (!dom.signPreset.value || isEditLocked()) return;
    dom.signText.value = dom.signPreset.value;
    updateSignText(dom.signPreset.value);
    updateWorkspaceUI();
    commitHistory();
  });

  $$("[data-rotation]").forEach((button) => button.addEventListener("click", () => {
    if (!state.selected || isEditLocked()) return;
    const root = state.selected;
    const previousPosition = root.position.clone();
    const previousRotation = root.rotation.y;
    dom.rotationY.value = button.dataset.rotation;
    root.rotation.y = THREE.MathUtils.degToRad(Number(button.dataset.rotation));
    constrainObject(root);
    if (root.userData.data.type === "box") snapBoxToBestSupport(root);
    moveSupportedDescendants(root, previousPosition, previousRotation);
    reflowSupportTree(root);
    updateWorkspaceUI();
    commitHistory();
  }));
}

function bindEvents() {
  dom.canvas.addEventListener("pointerdown", onCanvasPointerDown);
  dom.canvas.addEventListener("pointermove", onCanvasPointerMove);
  dom.canvas.addEventListener("pointerup", endCanvasDrag);
  dom.canvas.addEventListener("pointercancel", endCanvasDrag);
  dom.canvas.addEventListener("dblclick", () => { if (!state.selectionLocked && state.selected && !state.selected.userData.data.locked) focusObject(state.selected); });

  $$(".asset-card").forEach((card) => {
    card.addEventListener("click", () => addObjectAt(card.dataset.objectType));
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-warehouse-object", card.dataset.objectType);
    });
  });
  dom.viewport.addEventListener("dragover", (event) => {
    if (!event.dataTransfer.types.includes("application/x-warehouse-object")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dom.viewport.classList.add("drag-over");
  });
  dom.viewport.addEventListener("dragleave", (event) => {
    if (!dom.viewport.contains(event.relatedTarget)) dom.viewport.classList.remove("drag-over");
  });
  dom.viewport.addEventListener("drop", (event) => {
    event.preventDefault();
    dom.viewport.classList.remove("drag-over");
    const type = event.dataTransfer.getData("application/x-warehouse-object");
    if (!ASSET_DEFINITIONS[type]) return;
    const point = pointOnGround(event);
    addObjectAt(
      type,
      point ? point.x + state.warehouse.width / 2 : undefined,
      point ? point.z + state.warehouse.depth / 2 : undefined,
      { stackOnDrop: type === "box" },
    );
  });

  $("#apply-warehouse-btn").addEventListener("click", applyWarehouseDimensions);
  $("#new-btn").addEventListener("click", newBlankProject);
  $("#layouts-btn").addEventListener("click", openReferenceLayouts);
  dom.layoutSearch.addEventListener("input", renderReferenceLayouts);
  dom.layoutRefreshBtn.addEventListener("click", () => loadReferenceLayouts(true));
  $("#layout-export-btn").addEventListener("click", exportReferenceLayoutCandidate);
  $("#layout-example-btn").addEventListener("click", () => {
    dom.layoutsDialog.close();
    loadExample();
  });
  $("#save-btn").addEventListener("click", saveProjectLocal);
  $("#export-btn").addEventListener("click", exportProject);
  $("#import-btn").addEventListener("click", () => $("#file-input").click());
  $("#file-input").addEventListener("change", (event) => {
    if (event.target.files?.[0]) importProjectFile(event.target.files[0]);
    event.target.value = "";
  });
  $("#screenshot-btn").addEventListener("click", saveScreenshot);
  $("#fit-btn").addEventListener("click", fitWarehouseView);
  dom.selectionLockBtn.addEventListener("click", () => setSelectionLock(!state.selectionLocked));
  dom.dimensionBtn.addEventListener("click", toggleDimensions);
  dom.view3dBtn.addEventListener("click", fitWarehouseView);
  dom.viewTopBtn.addEventListener("click", setTopView);
  dom.gridBtn.addEventListener("click", () => {
    state.gridVisible = !state.gridVisible;
    if (gridHelper) gridHelper.visible = state.gridVisible;
    dom.gridBtn.classList.toggle("active", state.gridVisible);
  });
  dom.snapSelect.addEventListener("change", () => { state.snap = Number(dom.snapSelect.value); });
  dom.undoBtn.addEventListener("click", undo);
  dom.redoBtn.addEventListener("click", redo);
  $("#delete-btn").addEventListener("click", deleteSelected);
  $("#duplicate-btn").addEventListener("click", duplicateSelected);
  $("#more-btn").addEventListener("click", duplicateSelected);
  dom.objectLockBtn.addEventListener("click", () => toggleObjectLock());
  dom.groundObjectBtn.addEventListener("click", moveSelectedToGround);
  dom.unstackBtn.addEventListener("click", unstackSelectedBox);

  dom.projectName.addEventListener("input", () => setDirty(true));
  dom.projectName.addEventListener("change", commitHistory);

  $("#stack-open-btn").addEventListener("click", openStackDialog);
  dom.stackForm.addEventListener("submit", createStackFromDialog);
  [dom.stackPalletWidth, dom.stackPalletDepth, dom.stackMaxHeight, dom.stackBoxWidth, dom.stackBoxDepth, dom.stackBoxHeight, dom.stackBoxCount]
    .forEach((input) => input.addEventListener("input", updateStackPreview));

  $("#help-btn").addEventListener("click", () => $("#help-dialog").showModal());
  $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog)?.close();
  }));
  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  $("#theme-btn").addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    updateSceneTheme();
  });
  $("#mobile-continue").addEventListener("click", () => $("#mobile-notice").classList.add("dismissed"));

  window.addEventListener("keydown", (event) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault(); redo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault(); duplicateSelected();
    } else if ((event.key === "Delete" || event.key === "Backspace") && state.selected && !typing) {
      event.preventDefault(); deleteSelected();
    } else if (event.key.toLowerCase() === "l" && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); setSelectionLock(!state.selectionLocked);
    } else if (event.key === "Escape") {
      if (document.querySelector("dialog[open]")) document.querySelector("dialog[open]").close();
      else selectObject(null);
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function startApp() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") document.documentElement.dataset.theme = storedTheme;
  state.dimensionsVisible = localStorage.getItem(DIMENSIONS_KEY) === "true";
  initScene();
  dom.dimensionBtn.classList.toggle("active", state.dimensionsVisible);
  dom.dimensionBtn.setAttribute("aria-pressed", String(state.dimensionsVisible));
  setupAssetFilters();
  bindInspectorInputs();
  bindEvents();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      loadProject(JSON.parse(saved));
      resetHistory(false);
      toast("브라우저에 저장된 프로젝트를 복원했습니다.");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      loadExample({ initial: true });
    }
  } else {
    loadExample({ initial: true });
  }
  updateStackPreview();
}

startApp();
