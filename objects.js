import * as THREE from "three";

export const ASSET_DEFINITIONS = {
  rack: {
    label: "팔레트 랙",
    english: "PALLET RACK",
    icon: "▦",
    width: 8,
    depth: 1.1,
    height: 6,
    color: "#24c98a",
    config: { bays: 4, levels: 4, palletsPerLevel: 2 },
  },
  boxrack: {
    label: "박스랙",
    english: "CARTON RACK",
    icon: "▥",
    width: 3.6,
    depth: 0.72,
    height: 2.4,
    color: "#d7a14b",
    config: { bays: 4, levels: 5, boxesPerCell: 3 },
  },
  shelf: {
    label: "선반",
    english: "SHELVING",
    icon: "▤",
    width: 3,
    depth: 0.7,
    height: 2.4,
    color: "#e0a94e",
    config: { levels: 5 },
  },
  conveyor: {
    label: "컨베이어",
    english: "CONVEYOR",
    icon: "≋",
    width: 6,
    depth: 0.9,
    height: 0.8,
    color: "#589dea",
  },
  pallet: {
    label: "팔레트",
    english: "PALLET",
    icon: "▰",
    width: 1.2,
    depth: 1,
    height: 0.14,
    color: "#a97a4c",
    config: {
      boxWidth: 0.4,
      boxDepth: 0.3,
      boxHeight: 0.25,
      maxStackHeight: 1.8,
    },
  },
  box: {
    label: "박스",
    english: "CARTON BOX",
    icon: "■",
    width: 0.4,
    depth: 0.3,
    height: 0.25,
    color: "#d6a45d",
  },
  forklift: {
    label: "지게차",
    english: "FORKLIFT",
    icon: "◫",
    width: 1.2,
    depth: 2.4,
    height: 2.2,
    color: "#f2b84f",
  },
  dock: {
    label: "도크",
    english: "LOADING DOCK",
    icon: "⊓",
    width: 3,
    depth: 2.5,
    height: 3.4,
    color: "#66807a",
  },
  worktable: {
    label: "작업대",
    english: "WORK TABLE",
    icon: "⌸",
    width: 2,
    depth: 0.9,
    height: 0.9,
    color: "#8f79d6",
  },
  cleanbooth: {
    label: "클린부스",
    english: "CLEAN BOOTH",
    icon: "▦",
    width: 4,
    depth: 3,
    height: 2.7,
    color: "#55b8b1",
  },
  chair: {
    label: "의자",
    english: "WORK CHAIR",
    icon: "◒",
    width: 0.58,
    depth: 0.58,
    height: 0.92,
    color: "#657b91",
  },
  tapingmachine: {
    label: "테이핑기",
    english: "CARTON SEALER",
    icon: "≡",
    width: 1.2,
    depth: 1.8,
    height: 1.55,
    color: "#4f91c8",
  },
  volumechecker: {
    label: "볼륨체크기",
    english: "VOLUME CHECKER",
    icon: "⌗",
    width: 1.35,
    depth: 1.7,
    height: 1.9,
    color: "#6c79d8",
  },
  ers: {
    label: "ERS 촬영 설비",
    english: "EVIDENCE RECORD SYSTEM",
    icon: "◎",
    width: 1.4,
    depth: 1.5,
    height: 2.15,
    color: "#8b6dd1",
  },
  heavyscale: {
    label: "고중량 전자저울",
    english: "HEAVY-DUTY SCALE",
    icon: "▰",
    width: 1.5,
    depth: 1.5,
    height: 1.35,
    color: "#5e8192",
  },
  barcodescanner: {
    label: "무선 바코드 스캐너",
    english: "WIRELESS BARCODE SCANNER",
    icon: "⌁",
    width: 0.32,
    depth: 0.3,
    height: 0.48,
    color: "#466c82",
    elevation: 0.9,
  },
  breakroom: {
    label: "휴게실",
    english: "BREAK ROOM",
    icon: "☕",
    width: 4.8,
    depth: 3.8,
    height: 2.7,
    color: "#d39a55",
  },
  office: {
    label: "사무실",
    english: "OFFICE",
    icon: "▣",
    width: 5,
    depth: 4,
    height: 2.7,
    color: "#4f87b7",
  },
  lockerroom: {
    label: "탈의실",
    english: "LOCKER ROOM",
    icon: "▥",
    width: 4.2,
    depth: 3.5,
    height: 2.7,
    color: "#7a74bc",
  },
  partition: {
    label: "파티션",
    english: "SPACE PARTITION",
    icon: "╫",
    width: 3,
    depth: 0.12,
    height: 1.8,
    color: "#708f86",
  },
  textlabel: {
    label: "일반 텍스트",
    english: "FREE TEXT LABEL",
    icon: "T",
    width: 2.4,
    depth: 0.05,
    height: 0.55,
    color: "#e8f2ec",
    elevation: 1.6,
    config: { text: "텍스트 입력" },
  },
  person: {
    label: "작업자",
    english: "WAREHOUSE WORKER",
    icon: "●",
    width: 0.55,
    depth: 0.45,
    height: 1.72,
    color: "#52a7ef",
  },
  computer: {
    label: "컴퓨터",
    english: "COMPUTER",
    icon: "▣",
    width: 0.68,
    depth: 0.52,
    height: 0.62,
    color: "#54758b",
    elevation: 0.9,
  },
  cctv: {
    label: "CCTV",
    english: "SECURITY CAMERA",
    icon: "◉",
    width: 0.5,
    depth: 0.34,
    height: 0.3,
    color: "#d7e1dc",
    elevation: 2.7,
  },
  extinguisher: {
    label: "소화기",
    english: "FIRE EXTINGUISHER",
    icon: "!",
    width: 0.32,
    depth: 0.32,
    height: 0.72,
    color: "#e34f49",
  },
  cone: {
    label: "안전콘",
    english: "SAFETY CONE",
    icon: "▲",
    width: 0.38,
    depth: 0.38,
    height: 0.68,
    color: "#f4893d",
  },
  barrier: {
    label: "안전 펜스",
    english: "SAFETY BARRIER",
    icon: "╫",
    width: 2,
    depth: 0.34,
    height: 1.08,
    color: "#f0c84b",
  },
  firstaid: {
    label: "구급함",
    english: "FIRST AID",
    icon: "+",
    width: 0.48,
    depth: 0.2,
    height: 0.58,
    color: "#35bd77",
    elevation: 1.15,
  },
  electrical: {
    label: "분전반",
    english: "ELECTRICAL PANEL",
    icon: "ϟ",
    width: 0.82,
    depth: 0.28,
    height: 1.42,
    color: "#71847c",
  },
  trashbin: {
    label: "폐기물함",
    english: "WASTE BIN",
    icon: "▧",
    width: 0.72,
    depth: 0.62,
    height: 0.92,
    color: "#4f7a65",
  },
  handtruck: {
    label: "핸드 팔레트",
    english: "PALLET JACK",
    icon: "⌁",
    width: 0.76,
    depth: 1.72,
    height: 1.18,
    color: "#e2aa3d",
  },
  printer: {
    label: "라벨 프린터",
    english: "LABEL PRINTER",
    icon: "▱",
    width: 0.52,
    depth: 0.5,
    height: 0.4,
    color: "#76858c",
    elevation: 0.9,
  },
  officeprinter: {
    label: "일반 프린터",
    english: "OFFICE PRINTER",
    icon: "▱",
    width: 0.66,
    depth: 0.62,
    height: 0.52,
    color: "#7d858b",
    elevation: 0.82,
  },
  door: {
    label: "사람 출입문",
    english: "PEDESTRIAN DOOR",
    icon: "▯",
    width: 1,
    depth: 0.2,
    height: 2.15,
    color: "#4b7164",
  },
  sign: {
    label: "안내 표지판",
    english: "INFORMATION SIGN",
    icon: "i",
    width: 1.2,
    depth: 0.12,
    height: 0.7,
    color: "#258bd2",
    elevation: 1.55,
    config: { text: "출입구", tone: "info" },
  },
  warning: {
    label: "경고 표지판",
    english: "WARNING SIGN",
    icon: "!",
    width: 1.2,
    depth: 0.12,
    height: 0.7,
    color: "#e7a62f",
    elevation: 1.55,
    config: { text: "지게차 주의", tone: "warning" },
  },
  safety: {
    label: "안전 구역",
    english: "FLOOR ZONE",
    icon: "◇",
    width: 5,
    depth: 3,
    height: 0.025,
    color: "#e9aa36",
  },
  stack: {
    label: "박스 적재",
    english: "PALLET LOAD",
    icon: "▩",
    width: 1.2,
    depth: 1,
    height: 1.14,
    color: "#d6a45d",
  },
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.68,
    metalness: options.metalness ?? 0.08,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

function lineMaterial(color, opacity = 0.38) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function addEdges(mesh, color = "#07100c", opacity = 0.24) {
  if (!mesh.geometry) return;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    lineMaterial(color, opacity),
  );
  mesh.add(edges);
}

function addBox(parent, size, position, color, options = {}) {
  const geometry = new THREE.BoxGeometry(
    Math.max(0.005, size[0]),
    Math.max(0.005, size[1]),
    Math.max(0.005, size[2]),
  );
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  if (options.edges !== false) addEdges(mesh, options.edgeColor, options.edgeOpacity);
  return mesh;
}

function addCylinder(parent, radius, length, position, color, rotation = [0, 0, 0], segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments),
    material(color, { metalness: 0.18, roughness: 0.5 }),
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.01, radius), 20, 14),
    material(color, options),
  );
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  return mesh;
}

function makeTextTexture(text, background, foreground = "#ffffff", accent = null) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (accent) {
    context.fillStyle = accent;
    context.fillRect(0, 0, canvas.width, 58);
    context.fillRect(0, canvas.height - 58, canvas.width, 58);
  }
  context.strokeStyle = foreground;
  context.lineWidth = 20;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.fillStyle = foreground;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const value = String(text || "표지판").slice(0, 24);
  const fontSize = value.length > 12 ? 88 : value.length > 7 ? 112 : 142;
  context.font = `900 ${fontSize}px "Pretendard", "Noto Sans KR", sans-serif`;
  context.fillText(value, canvas.width / 2, canvas.height / 2 + 4, canvas.width - 100);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeFreeTextTexture(text, foreground = "#e8f2ec") {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  const value = String(text || "텍스트 입력").slice(0, 40);
  const fontSize = value.length > 24 ? 112 : value.length > 14 ? 142 : 178;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${fontSize}px "Pretendard", "Noto Sans KR", sans-serif`;
  context.lineJoin = "round";
  context.lineWidth = 26;
  context.strokeStyle = "rgba(7, 16, 12, 0.88)";
  context.strokeText(value, canvas.width / 2, canvas.height / 2 + 4, canvas.width - 80);
  context.fillStyle = foreground;
  context.fillText(value, canvas.width / 2, canvas.height / 2 + 4, canvas.width - 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function darker(hex, factor = 0.72) {
  return `#${new THREE.Color(hex).multiplyScalar(factor).getHexString()}`;
}

function lighter(hex, factor = 1.2) {
  const value = new THREE.Color(hex);
  value.r = Math.min(1, value.r * factor);
  value.g = Math.min(1, value.g * factor);
  value.b = Math.min(1, value.b * factor);
  return `#${value.getHexString()}`;
}

function buildRack(root, data) {
  const { width: w, depth: d, height: h } = data;
  const bays = Math.max(1, Math.round(data.config?.bays ?? 4));
  const levels = Math.max(1, Math.round(data.config?.levels ?? 4));
  const post = Math.min(0.09, Math.max(0.045, w / 100));
  const beam = Math.min(0.11, Math.max(0.055, h / 80));
  const frameColor = data.color;
  const braceColor = darker(data.color, 0.64);
  const bayWidth = w / bays;

  for (let bay = 0; bay <= bays; bay += 1) {
    const x = -w / 2 + bay * bayWidth;
    addBox(root, [post, h, post], [x, h / 2, -d / 2], frameColor, { edgeOpacity: 0.16 });
    addBox(root, [post, h, post], [x, h / 2, d / 2], frameColor, { edgeOpacity: 0.16 });

    if (bay < bays + 1) {
      for (let brace = 0; brace < Math.max(2, levels); brace += 1) {
        const braceHeight = h / Math.max(2, levels);
        const y = braceHeight * (brace + 0.5);
        const diagonalLength = Math.sqrt(d * d + braceHeight * braceHeight);
        const diagonal = addBox(root, [post * 0.55, diagonalLength, post * 0.55], [x, y, 0], braceColor, {
          edges: false,
          castShadow: false,
        });
        diagonal.rotation.x = Math.atan2(d, braceHeight) * (brace % 2 ? -1 : 1);
      }
    }
  }

  for (let level = 1; level <= levels; level += 1) {
    const y = (h / levels) * level - beam / 2;
    for (let bay = 0; bay < bays; bay += 1) {
      const x = -w / 2 + bayWidth * (bay + 0.5);
      addBox(root, [bayWidth - post, beam, beam], [x, y, -d / 2], frameColor, { edgeOpacity: 0.14 });
      addBox(root, [bayWidth - post, beam, beam], [x, y, d / 2], frameColor, { edgeOpacity: 0.14 });
      const shelf = addBox(root, [bayWidth - post * 1.5, 0.025, d - post], [x, y + beam / 2, 0], "#84938b", {
        transparent: true,
        opacity: 0.38,
        edges: false,
        castShadow: false,
      });
      shelf.receiveShadow = true;
    }
  }

  addBox(root, [w + post, 0.04, d + post], [0, 0.02, 0], darker(frameColor, 0.55), { edges: false });
}

function buildBoxRack(root, data) {
  const { width: w, depth: d, height: h } = data;
  const bays = Math.max(1, Math.round(data.config?.bays ?? 4));
  const levels = Math.max(1, Math.round(data.config?.levels ?? 5));
  const boxesPerCell = Math.max(1, Math.round(data.config?.boxesPerCell ?? 3));
  const post = Math.min(0.06, Math.max(0.032, w / 90));
  const shelfThickness = Math.min(0.055, h / 45);
  const frame = darker(data.color, 0.72);
  const shelf = lighter(data.color, 1.12);
  const bayWidth = w / bays;
  const levelHeight = h / levels;

  for (let bay = 0; bay <= bays; bay += 1) {
    const x = -w / 2 + bay * bayWidth;
    [-d / 2, d / 2].forEach((z) => addBox(root, [post, h, post], [x, h / 2, z], frame, { edgeOpacity: 0.13 }));
  }
  for (let level = 0; level <= levels; level += 1) {
    const y = Math.min(h - shelfThickness / 2, level * levelHeight + shelfThickness / 2);
    addBox(root, [w + post, shelfThickness, d + post], [0, y, 0], shelf, { edgeOpacity: 0.14 });
  }
  addBox(root, [w, h, 0.025], [0, h / 2, d / 2 + 0.01], darker(data.color, 0.58), {
    transparent: true,
    opacity: 0.32,
    edges: false,
    castShadow: false,
  });

  const visibleBoxes = Math.min(3, boxesPerCell);
  const cartonColor = "#c99554";
  let previewCount = 0;
  const maxPreviewBoxes = 180;
  for (let level = 0; level < levels; level += 1) {
    for (let bay = 0; bay < bays; bay += 1) {
      for (let index = 0; index < visibleBoxes; index += 1) {
        if (previewCount >= maxPreviewBoxes) continue;
        const cellPadding = Math.min(0.06, bayWidth * 0.08);
        const boxWidth = Math.max(0.05, (bayWidth - cellPadding * (visibleBoxes + 1)) / visibleBoxes);
        const boxHeight = Math.max(0.04, levelHeight * 0.58);
        const x = -w / 2 + bayWidth * bay + cellPadding + boxWidth / 2 + index * (boxWidth + cellPadding);
        const y = level * levelHeight + shelfThickness + boxHeight / 2;
        addBox(root, [boxWidth, boxHeight, d * 0.7], [x, y, -d * 0.03], cartonColor, { edgeOpacity: 0.18 });
        previewCount += 1;
      }
    }
  }
}

function buildShelf(root, data) {
  const { width: w, depth: d, height: h } = data;
  const levels = Math.max(1, Math.round(data.config?.levels ?? 5));
  const post = Math.min(0.055, Math.max(0.03, w / 100));
  const frame = data.color;
  const shelfColor = lighter(data.color, 1.18);
  const xs = [-w / 2, w / 2];
  const zs = [-d / 2, d / 2];

  xs.forEach((x) => zs.forEach((z) => addBox(root, [post, h, post], [x, h / 2, z], frame, { edgeOpacity: 0.15 })));
  for (let level = 0; level < levels; level += 1) {
    const y = 0.08 + (h - 0.1) * (level / Math.max(1, levels - 1));
    addBox(root, [w + post, 0.045, d + post], [0, y, 0], shelfColor, { edgeOpacity: 0.15 });
  }
  addBox(root, [post, h * 1.02, post], [0, h / 2, -d / 2], darker(frame, 0.66), { edges: false });
}

function buildConveyor(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frameColor = darker(data.color, 0.63);
  const rollerColor = lighter(data.color, 1.24);
  const rail = Math.min(0.09, d * 0.12);
  const rollerRadius = Math.min(0.055, h * 0.07);
  const rollerCount = Math.max(4, Math.min(80, Math.floor(w / 0.24)));

  addBox(root, [w, rail, rail], [0, h, -d / 2], frameColor, { edgeOpacity: 0.16 });
  addBox(root, [w, rail, rail], [0, h, d / 2], frameColor, { edgeOpacity: 0.16 });
  for (let i = 0; i < rollerCount; i += 1) {
    const x = -w / 2 + ((i + 0.5) * w) / rollerCount;
    addCylinder(root, rollerRadius, Math.max(0.05, d - rail * 1.1), [x, h + rollerRadius * 0.35, 0], rollerColor, [Math.PI / 2, 0, 0], 12);
  }
  const legPairs = Math.max(2, Math.min(8, Math.ceil(w / 2.5)));
  for (let i = 0; i < legPairs; i += 1) {
    const x = -w / 2 + (i * w) / Math.max(1, legPairs - 1);
    addBox(root, [rail, h, rail], [x, h / 2, -d / 2 + rail], frameColor, { edges: false });
    addBox(root, [rail, h, rail], [x, h / 2, d / 2 - rail], frameColor, { edges: false });
  }
}

function buildPallet(root, data, yOffset = 0) {
  const { width: w, depth: d, height: h } = data;
  const wood = data.color;
  const darkWood = darker(wood, 0.7);
  const topHeight = h * 0.3;
  const slats = 6;

  for (let i = 0; i < slats; i += 1) {
    const z = -d / 2 + (d * (i + 0.5)) / slats;
    addBox(root, [w, topHeight, d / slats * 0.68], [0, yOffset + h - topHeight / 2, z], wood, { edgeOpacity: 0.18 });
  }
  const blockSize = Math.min(w, d) * 0.13;
  [-w / 2 + blockSize, 0, w / 2 - blockSize].forEach((x) => {
    [-d / 2 + blockSize, d / 2 - blockSize].forEach((z) => {
      addBox(root, [blockSize, h * 0.55, blockSize], [x, yOffset + h * 0.36, z], darkWood, { edgeOpacity: 0.13 });
    });
  });
  addBox(root, [w, h * 0.16, d * 0.12], [0, yOffset + h * 0.08, -d / 2 + d * 0.08], darkWood, { edges: false });
  addBox(root, [w, h * 0.16, d * 0.12], [0, yOffset + h * 0.08, d / 2 - d * 0.08], darkWood, { edges: false });
}

function buildBox(root, data) {
  const { width: w, depth: d, height: h } = data;
  const box = addBox(root, [w, h, d], [0, h / 2, 0], data.color, { roughness: 0.82, edgeOpacity: 0.34 });
  const tapeWidth = Math.min(w * 0.18, 0.08);
  addBox(box, [tapeWidth, 0.006, d * 0.92], [0, h / 2 + 0.004, 0], lighter(data.color, 1.24), {
    edges: false,
    castShadow: false,
  });
}

function buildForklift(root, data) {
  const { width: w, depth: d, height: h } = data;
  const bodyColor = data.color;
  const dark = darker(bodyColor, 0.52);
  const tire = "#151a18";
  const bodyDepth = d * 0.58;

  addBox(root, [w * 0.92, h * 0.32, bodyDepth], [0, h * 0.35, d * 0.09], bodyColor, { edgeOpacity: 0.2 });
  addBox(root, [w * 0.72, h * 0.13, d * 0.23], [0, h * 0.6, d * 0.14], darker(bodyColor, 0.82), { edgeOpacity: 0.15 });
  const roofY = h * 0.95;
  addBox(root, [w * 0.8, h * 0.06, d * 0.36], [0, roofY, d * 0.05], dark, { edges: false });
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      addBox(root, [w * 0.045, h * 0.57, w * 0.045], [sx * w * 0.35, h * 0.69, d * (0.05 + sz * 0.16)], dark, { edges: false });
    });
  });

  const wheelRadius = Math.min(w * 0.18, h * 0.12);
  [-1, 1].forEach((side) => {
    addCylinder(root, wheelRadius, w * 0.08, [side * w * 0.48, wheelRadius, d * 0.24], tire, [0, 0, Math.PI / 2], 18);
    addCylinder(root, wheelRadius * 0.78, w * 0.08, [side * w * 0.48, wheelRadius * 0.8, -d * 0.22], tire, [0, 0, Math.PI / 2], 18);
  });

  const mastZ = -d * 0.46;
  [-w * 0.32, w * 0.32].forEach((x) => addBox(root, [w * 0.055, h * 0.92, w * 0.055], [x, h * 0.52, mastZ], dark, { edges: false }));
  addBox(root, [w * 0.72, h * 0.055, w * 0.055], [0, h * 0.92, mastZ], dark, { edges: false });
  [-w * 0.25, w * 0.25].forEach((x) => addBox(root, [w * 0.11, h * 0.035, d * 0.52], [x, h * 0.12, -d * 0.66], dark, { edges: false }));
}

function buildDock(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.6);
  const platformHeight = Math.min(0.35, h * 0.16);
  addBox(root, [w, platformHeight, d], [0, platformHeight / 2, 0], dark, { edgeOpacity: 0.18 });
  addBox(root, [w, h, 0.14], [0, h / 2, d / 2], darker(frame, 0.5), { edgeOpacity: 0.15 });
  addBox(root, [w * 0.82, h * 0.82, 0.17], [0, h * 0.51, d / 2 - 0.1], frame, { edgeOpacity: 0.14 });
  addBox(root, [w * 0.67, h * 0.68, 0.2], [0, h * 0.47, d / 2 - 0.22], "#1b2621", { edgeOpacity: 0.25 });
  [-1, 1].forEach((side) => addBox(root, [w * 0.07, platformHeight * 1.4, 0.18], [side * w * 0.36, platformHeight * 0.7, -d / 2], "#d7b044", { edgeOpacity: 0.18 }));
}

function buildWorktable(root, data) {
  const { width: w, depth: d, height: h } = data;
  const top = data.color;
  const frame = darker(top, 0.55);
  addBox(root, [w, h * 0.12, d], [0, h - h * 0.06, 0], top, { edgeOpacity: 0.2 });
  const post = Math.min(0.07, w * 0.05);
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    addBox(root, [post, h * 0.88, post], [xSide * (w / 2 - post), h * 0.44, zSide * (d / 2 - post)], frame, { edges: false });
  }));
  addBox(root, [w - post * 2, post, post], [0, h * 0.35, -d / 2 + post], frame, { edges: false });
}

function buildCleanBooth(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.58);
  const panel = lighter(frame, 1.35);
  const post = Math.max(0.055, Math.min(0.11, w * 0.025));
  const rail = post * 0.9;
  const panelHeight = h * 0.78;
  const panelY = panelHeight / 2 + h * 0.05;
  const frontZ = -d / 2;
  const backZ = d / 2;
  const doorWidth = Math.min(1.2, w * 0.34);
  const sidePanelWidth = Math.max(0.25, (w - doorWidth) / 2);

  addBox(root, [w, h * 0.022, d], [0, h * 0.011, 0], "#d9ebe8", { edgeOpacity: 0.14 });

  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    addBox(
      root,
      [post, h, post],
      [xSide * (w / 2 - post / 2), h / 2, zSide * (d / 2 - post / 2)],
      frame,
      { edges: false, metalness: 0.18 },
    );
  }));

  [-1, 1].forEach((zSide) => {
    addBox(root, [w, rail, rail], [0, h - rail / 2, zSide * (d / 2 - rail / 2)], dark, { edges: false });
  });
  [-1, 1].forEach((xSide) => {
    addBox(root, [rail, rail, d], [xSide * (w / 2 - rail / 2), h - rail / 2, 0], dark, { edges: false });
  });

  addBox(root, [w - post * 2, panelHeight, 0.025], [0, panelY, backZ - post], panel, {
    transparent: true,
    opacity: 0.24,
    doubleSide: true,
    roughness: 0.22,
    edgeColor: frame,
    edgeOpacity: 0.34,
  });
  [-1, 1].forEach((xSide) => {
    addBox(root, [0.025, panelHeight, d - post * 2], [xSide * (w / 2 - post), panelY, 0], panel, {
      transparent: true,
      opacity: 0.24,
      doubleSide: true,
      roughness: 0.22,
      edgeColor: frame,
      edgeOpacity: 0.34,
    });
    addBox(
      root,
      [sidePanelWidth, panelHeight, 0.025],
      [xSide * (doorWidth / 2 + sidePanelWidth / 2), panelY, frontZ + post],
      panel,
      {
        transparent: true,
        opacity: 0.24,
        doubleSide: true,
        roughness: 0.22,
        edgeColor: frame,
        edgeOpacity: 0.34,
      },
    );
  });

  const doorPostX = doorWidth / 2;
  [-1, 1].forEach((side) => {
    addBox(root, [post, h * 0.86, post], [side * doorPostX, h * 0.43, frontZ + post], dark, { edges: false });
  });
  addBox(root, [doorWidth + post, rail, post], [0, h * 0.86, frontZ + post], dark, { edges: false });

  const strips = 8;
  for (let index = 0; index < strips; index += 1) {
    const stripWidth = doorWidth / strips * 0.86;
    const x = -doorWidth / 2 + (index + 0.5) * doorWidth / strips;
    addBox(root, [stripWidth, h * 0.76, 0.012], [x, h * 0.48, frontZ + post * 1.35], "#9cddd8", {
      transparent: true,
      opacity: 0.3,
      doubleSide: true,
      edges: false,
      roughness: 0.18,
    });
  }

  addBox(root, [w * 0.84, h * 0.045, d * 0.74], [0, h * 0.965, 0], "#edf7f5", {
    edgeColor: frame,
    edgeOpacity: 0.2,
  });
  [-1, 0, 1].forEach((xIndex) => {
    addBox(root, [w * 0.2, h * 0.018, d * 0.12], [xIndex * w * 0.26, h * 0.938, 0], "#dffff8", {
      edges: false,
      roughness: 0.18,
    });
  });
}

function buildChair(root, data) {
  const { width: w, depth: d, height: h } = data;
  const cushion = data.color;
  const frame = darker(cushion, 0.42);
  const seatY = h * 0.49;
  addBox(root, [w * 0.78, h * 0.1, d * 0.72], [0, seatY, -d * 0.04], cushion, { edgeOpacity: 0.2 });
  const back = addBox(root, [w * 0.76, h * 0.35, d * 0.1], [0, h * 0.76, d * 0.31], cushion, { edgeOpacity: 0.2 });
  back.rotation.x = -0.08;
  addBox(root, [w * 0.08, h * 0.27, d * 0.08], [0, h * 0.59, d * 0.27], frame, { edges: false });
  addCylinder(root, w * 0.055, h * 0.36, [0, h * 0.28, 0], frame, [0, 0, 0], 16);
  addCylinder(root, w * 0.1, h * 0.08, [0, h * 0.12, 0], frame, [0, 0, 0], 16);

  const baseY = h * 0.08;
  const legLength = w * 0.46;
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5;
    const leg = addBox(root, [w * 0.075, h * 0.045, legLength], [Math.sin(angle) * legLength * 0.24, baseY, Math.cos(angle) * legLength * 0.24], frame, { edges: false });
    leg.rotation.y = angle;
    addSphere(root, w * 0.045, [Math.sin(angle) * legLength * 0.52, h * 0.045, Math.cos(angle) * legLength * 0.52], "#20292e", { roughness: 0.85 });
  }

  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.06, h * 0.17, d * 0.06], [side * w * 0.42, h * 0.59, 0], frame, { edges: false });
    addBox(root, [w * 0.22, h * 0.045, d * 0.08], [side * w * 0.34, h * 0.68, -d * 0.02], frame, { edges: false });
  });
}

function addRollerBed(root, width, depth, height, frameColor) {
  const dark = darker(frameColor, 0.5);
  const bedY = height * 0.34;
  const railWidth = Math.max(0.045, width * 0.065);
  addBox(root, [railWidth, height * 0.1, depth], [-width * 0.46, bedY, 0], dark, { edges: false });
  addBox(root, [railWidth, height * 0.1, depth], [width * 0.46, bedY, 0], dark, { edges: false });
  const rollers = 9;
  for (let index = 0; index < rollers; index += 1) {
    const z = -depth * 0.43 + index * depth * 0.86 / (rollers - 1);
    addCylinder(root, Math.max(0.018, depth * 0.022), width * 0.82, [0, bedY + height * 0.055, z], "#a9b7bd", [0, 0, Math.PI / 2], 14);
  }
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    addBox(root, [width * 0.06, bedY, width * 0.06], [xSide * width * 0.43, bedY / 2, zSide * depth * 0.4], dark, { edges: false });
  }));
  return bedY;
}

function buildTapingMachine(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.48);
  const bedY = addRollerBed(root, w, d, h, frame);
  const postHeight = h * 0.58;
  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.075, postHeight, d * 0.06], [side * w * 0.43, bedY + postHeight / 2, 0], frame, { edges: false });
  });
  addBox(root, [w * 0.94, h * 0.08, d * 0.12], [0, h * 0.91, 0], frame, { edgeOpacity: 0.14 });
  addBox(root, [w * 0.2, h * 0.32, d * 0.14], [0, h * 0.73, 0], dark, { edgeOpacity: 0.18 });
  addBox(root, [w * 0.1, h * 0.25, d * 0.3], [0, h * 0.53, -d * 0.04], "#dbe5e8", { edgeOpacity: 0.14 });
  addCylinder(root, w * 0.12, w * 0.08, [0, h * 0.79, -d * 0.16], "#e7bd3f", [0, 0, Math.PI / 2], 24);
  addCylinder(root, w * 0.047, w * 0.085, [0, h * 0.79, -d * 0.16], dark, [0, 0, Math.PI / 2], 18);
  addBox(root, [w * 0.22, h * 0.2, d * 0.13], [w * 0.54, h * 0.76, -d * 0.14], "#273943", { edgeOpacity: 0.22 });
  addBox(root, [w * 0.16, h * 0.11, 0.012], [w * 0.54, h * 0.78, -d * 0.208], "#63d6c8", { edges: false, roughness: 0.26 });
  addBox(root, [w * 0.72, h * 0.018, d * 0.03], [0, bedY + h * 0.1, 0], "#e7bd3f", { edges: false });
}

function buildVolumeChecker(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.46);
  const bedY = addRollerBed(root, w, d, h, frame);
  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.075, h * 0.65, d * 0.075], [side * w * 0.45, bedY + h * 0.325, 0], frame, { edges: false });
  });
  addBox(root, [w * 0.98, h * 0.085, d * 0.12], [0, h * 0.94, 0], frame, { edgeOpacity: 0.14 });
  addBox(root, [w * 0.62, h * 0.055, d * 0.34], [0, h * 0.88, 0], dark, { edgeOpacity: 0.18 });
  addBox(root, [w * 0.36, h * 0.025, d * 0.22], [0, h * 0.845, 0], "#61d7e9", {
    transparent: true,
    opacity: 0.82,
    edges: false,
    roughness: 0.2,
  });
  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.018, h * 0.48, d * 0.025], [side * w * 0.39, h * 0.63, 0], "#ec5d65", { edges: false, roughness: 0.2 });
  });
  addBox(root, [w * 0.24, h * 0.2, d * 0.13], [w * 0.56, h * 0.72, -d * 0.22], "#26343f", { edgeOpacity: 0.2 });
  addBox(root, [w * 0.18, h * 0.12, 0.012], [w * 0.56, h * 0.73, -d * 0.287], "#6ad6df", { edges: false, roughness: 0.22 });
  addSphere(root, w * 0.026, [w * 0.5, h * 0.61, -d * 0.29], "#4ee38e", { roughness: 0.28 });
  addSphere(root, w * 0.026, [w * 0.58, h * 0.61, -d * 0.29], "#efcc4d", { roughness: 0.28 });
}

function buildErs(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.43);
  const bedY = addRollerBed(root, w, d, h, frame);
  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.075, h * 0.66, d * 0.075], [side * w * 0.44, bedY + h * 0.33, d * 0.05], frame, { edges: false });
  });
  addBox(root, [w * 0.96, h * 0.085, d * 0.12], [0, h * 0.93, d * 0.05], frame, { edgeOpacity: 0.15 });
  addBox(root, [w * 0.2, h * 0.08, d * 0.25], [0, h * 0.83, d * 0.02], dark, { edgeOpacity: 0.2 });
  addCylinder(root, w * 0.055, h * 0.06, [0, h * 0.765, d * 0.02], "#141b22", [0, 0, 0], 20);
  addCylinder(root, w * 0.025, h * 0.063, [0, h * 0.73, d * 0.02], "#69d8ee", [0, 0, 0], 20);

  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.22, h * 0.025, d * 0.09], [side * w * 0.26, h * 0.82, -d * 0.02], "#eef9ff", { edges: false, roughness: 0.16 });
    addBox(root, [w * 0.11, h * 0.09, d * 0.13], [side * w * 0.48, h * 0.63, 0], dark, { edgeOpacity: 0.18 });
    addCylinder(root, w * 0.026, w * 0.055, [side * w * 0.415, h * 0.63, 0], "#161d25", [0, 0, Math.PI / 2], 18);
  });

  addBox(root, [w * 0.25, h * 0.23, d * 0.13], [w * 0.55, h * 0.71, -d * 0.22], "#25333e", { edgeOpacity: 0.2 });
  addBox(root, [w * 0.19, h * 0.14, 0.012], [w * 0.55, h * 0.72, -d * 0.287], "#78c9ea", { edges: false, roughness: 0.22 });

  const labelTexture = makeTextTexture("ERS", dark, "#ffffff", "#69d8ee");
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.42, h * 0.18),
    new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide }),
  );
  label.position.set(0, h * 0.94, -d * 0.065);
  label.rotation.y = Math.PI;
  root.add(label);

  addCylinder(root, w * 0.035, h * 0.14, [-w * 0.55, h * 0.91, d * 0.22], "#27333a", [0, 0, 0], 14);
  addSphere(root, w * 0.052, [-w * 0.55, h * 0.995, d * 0.22], "#48df8d", { roughness: 0.24 });
  addBox(root, [w * 0.78, h * 0.018, d * 0.03], [0, bedY + h * 0.1, 0], "#69d8ee", { edges: false });
}

function buildHeavyScale(root, data) {
  const { width: w, depth: d, height: h } = data;
  const frame = darker(data.color, 0.48);
  const steel = lighter(data.color, 1.45);
  const platformHeight = Math.min(h * 0.13, 0.17);
  addBox(root, [w, platformHeight, d], [0, platformHeight / 2, 0], frame, { edgeOpacity: 0.3, metalness: 0.48 });
  addBox(root, [w * 0.92, platformHeight * 0.28, d * 0.91], [0, platformHeight * 1.06, 0], steel, {
    edgeOpacity: 0.22,
    metalness: 0.58,
    roughness: 0.34,
  });
  for (let index = -3; index <= 3; index += 1) {
    addBox(root, [w * 0.008, platformHeight * 0.08, d * 0.78], [index * w * 0.11, platformHeight * 1.24, 0], frame, { edges: false, castShadow: false });
  }
  const poleX = w * 0.38;
  const poleZ = d * 0.37;
  const poleHeight = h - platformHeight;
  addBox(root, [w * 0.055, poleHeight, d * 0.055], [poleX, platformHeight + poleHeight / 2, poleZ], frame, { edges: false, metalness: 0.35 });
  addBox(root, [w * 0.36, h * 0.22, d * 0.15], [poleX - w * 0.13, h * 0.86, poleZ], "#263840", { edgeOpacity: 0.2 });
  addBox(root, [w * 0.25, h * 0.105, 0.012], [poleX - w * 0.13, h * 0.89, poleZ - d * 0.079], "#6fe0d0", { edges: false, roughness: 0.2 });
  [0, 1, 2].forEach((index) => addSphere(root, w * 0.018, [poleX - w * 0.22 + index * w * 0.07, h * 0.79, poleZ - d * 0.085], index === 2 ? "#ef6a62" : "#e8d15d", { castShadow: false }));
  addBox(root, [w * 0.72, platformHeight * 0.42, d * 0.12], [0, platformHeight * 0.34, -d * 0.53], steel, { edgeOpacity: 0.14, metalness: 0.42 });
}

function buildBarcodeScanner(root, data) {
  const { width: w, depth: d, height: h } = data;
  const dark = darker(data.color, 0.42);
  addBox(root, [w * 0.92, h * 0.12, d * 0.88], [0, h * 0.06, 0], dark, { edgeOpacity: 0.18 });
  addBox(root, [w * 0.58, h * 0.12, d * 0.42], [0, h * 0.16, d * 0.11], lighter(data.color, 1.18), { edgeOpacity: 0.16 });
  const handle = addBox(root, [w * 0.28, h * 0.58, d * 0.26], [0, h * 0.47, d * 0.04], data.color, { edgeOpacity: 0.22 });
  handle.rotation.x = -0.25;
  const head = addBox(root, [w * 0.72, h * 0.27, d * 0.48], [0, h * 0.79, -d * 0.02], data.color, { edgeOpacity: 0.24 });
  head.rotation.x = -0.12;
  addBox(root, [w * 0.5, h * 0.12, 0.012], [0, h * 0.82, -d * 0.27], "#c63743", { edges: false, roughness: 0.24 });
  addBox(root, [w * 0.18, h * 0.08, d * 0.05], [0, h * 0.47, -d * 0.12], "#202a2d", { edges: false });
  addSphere(root, w * 0.025, [w * 0.2, h * 0.16, -d * 0.25], "#4ee38e", { castShadow: false });
}

function addRoomLabel(root, text, data) {
  const { width: w, depth: d, height: h } = data;
  const texture = makeTextTexture(text, darker(data.color, 0.48), "#ffffff", lighter(data.color, 1.35));
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(w * 0.5, 2.2), h * 0.17),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  label.position.set(0, h * 0.9, -d / 2 - 0.061);
  label.rotation.y = Math.PI;
  root.add(label);
}

function buildRoomShell(root, data, labelText) {
  const { width: w, depth: d, height: h } = data;
  const frame = data.color;
  const dark = darker(frame, 0.54);
  const panelColor = lighter(frame, 1.5);
  const wall = Math.max(0.07, Math.min(0.12, w * 0.022));
  const doorWidth = Math.min(1.1, w * 0.26);
  const doorHeight = h * 0.78;
  const frontSegment = Math.max(0.2, (w - doorWidth) / 2);
  const panelOptions = {
    transparent: true,
    opacity: 0.28,
    doubleSide: true,
    roughness: 0.28,
    edgeColor: frame,
    edgeOpacity: 0.35,
  };

  addBox(root, [w, h * 0.025, d], [0, h * 0.0125, 0], "#d9dedb", { edgeColor: dark, edgeOpacity: 0.18 });
  addBox(root, [w, h * 0.88, wall], [0, h * 0.44, d / 2 - wall / 2], panelColor, panelOptions);
  [-1, 1].forEach((side) => {
    addBox(root, [wall, h * 0.88, d - wall * 2], [side * (w / 2 - wall / 2), h * 0.44, 0], panelColor, panelOptions);
    addBox(
      root,
      [frontSegment, h * 0.88, wall],
      [side * (doorWidth / 2 + frontSegment / 2), h * 0.44, -d / 2 + wall / 2],
      panelColor,
      panelOptions,
    );
    addBox(root, [wall, doorHeight, wall], [side * doorWidth / 2, doorHeight / 2, -d / 2], dark, { edges: false });
  });
  addBox(root, [doorWidth + wall, wall, wall], [0, doorHeight, -d / 2], dark, { edges: false });
  addBox(root, [doorWidth * 0.92, doorHeight * 0.92, wall * 0.35], [0, doorHeight * 0.46, -d / 2 - wall * 0.18], "#a8cfcc", {
    transparent: true,
    opacity: 0.34,
    doubleSide: true,
    edgeColor: dark,
    edgeOpacity: 0.42,
  });
  addSphere(root, wall * 0.5, [doorWidth * 0.34, doorHeight * 0.48, -d / 2 - wall * 0.45], "#d9b35d", { roughness: 0.34 });

  [-1, 1].forEach((zSide) => addBox(root, [w, wall, wall], [0, h - wall / 2, zSide * (d / 2 - wall / 2)], dark, { edges: false }));
  [-1, 1].forEach((xSide) => addBox(root, [wall, wall, d], [xSide * (w / 2 - wall / 2), h - wall / 2, 0], dark, { edges: false }));
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    addBox(root, [wall, h, wall], [xSide * (w / 2 - wall / 2), h / 2, zSide * (d / 2 - wall / 2)], dark, { edges: false });
  }));

  [-1, 1].forEach((side) => {
    addBox(root, [w * 0.22, h * 0.018, d * 0.08], [side * w * 0.25, h * 0.94, 0], "#f1fff9", { edges: false, roughness: 0.12 });
  });
  addRoomLabel(root, labelText, data);
}

function addRoomChair(root, position, rotation = 0, color = "#627888") {
  const chair = new THREE.Group();
  buildChair(chair, { width: 0.52, depth: 0.52, height: 0.84, color });
  chair.position.set(...position);
  chair.rotation.y = rotation;
  root.add(chair);
}

function addRoomDesk(root, position, width = 1.45, depth = 0.72, color = "#8b765f") {
  const [x, y, z] = position;
  const topY = y + 0.74;
  addBox(root, [width, 0.07, depth], [x, topY, z], color, { edgeOpacity: 0.18 });
  const frame = darker(color, 0.5);
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    addBox(root, [0.055, 0.72, 0.055], [x + xSide * (width / 2 - 0.08), y + 0.36, z + zSide * (depth / 2 - 0.08)], frame, { edges: false });
  }));
}

function addRoomComputer(root, position, rotation = 0) {
  const computer = new THREE.Group();
  buildComputer(computer, { width: 0.58, depth: 0.44, height: 0.48, color: "#536d7d" });
  computer.position.set(...position);
  computer.rotation.y = rotation;
  root.add(computer);
}

function buildBreakRoom(root, data) {
  const { width: w, depth: d, height: h } = data;
  buildRoomShell(root, data, "휴게실 · BREAK ROOM");
  const wood = "#9f7752";
  const dark = darker(data.color, 0.46);
  const counterZ = d * 0.34;
  addBox(root, [w * 0.58, h * 0.07, d * 0.18], [-w * 0.07, h * 0.33, counterZ], wood, { edgeOpacity: 0.18 });
  [-1, 1].forEach((side) => addBox(root, [w * 0.05, h * 0.3, d * 0.15], [-w * 0.07 + side * w * 0.25, h * 0.165, counterZ], dark, { edges: false }));
  addBox(root, [w * 0.17, h * 0.64, d * 0.21], [-w * 0.37, h * 0.33, counterZ], "#708386", { edgeOpacity: 0.2 });
  addBox(root, [w * 0.13, h * 0.13, 0.018], [-w * 0.37, h * 0.42, counterZ - d * 0.108], "#9fdbe2", { edges: false, roughness: 0.24 });
  addBox(root, [w * 0.16, h * 0.7, d * 0.21], [w * 0.38, h * 0.36, counterZ], "#566b73", { edgeOpacity: 0.2 });
  addBox(root, [w * 0.1, h * 0.17, 0.018], [w * 0.38, h * 0.48, counterZ - d * 0.108], "#6ed3cf", { edges: false, roughness: 0.2 });
  addBox(root, [w * 0.08, h * 0.14, d * 0.1], [w * 0.08, h * 0.43, counterZ - d * 0.02], "#303b3e", { edgeOpacity: 0.18 });

  addRoomDesk(root, [0, 0, -d * 0.04], w * 0.42, d * 0.3, wood);
  addRoomChair(root, [-w * 0.28, 0, -d * 0.04], Math.PI / 2, "#6f8c82");
  addRoomChair(root, [w * 0.28, 0, -d * 0.04], -Math.PI / 2, "#6f8c82");
  addRoomChair(root, [0, 0, -d * 0.27], 0, "#6f8c82");
  addRoomChair(root, [0, 0, d * 0.18], Math.PI, "#6f8c82");
}

function buildOffice(root, data) {
  const { width: w, depth: d, height: h } = data;
  buildRoomShell(root, data, "사무실 · OFFICE");
  const deskColor = "#8b765f";
  [-1, 1].forEach((side) => {
    const x = side * w * 0.23;
    const z = d * 0.14;
    addRoomDesk(root, [x, 0, z], w * 0.32, d * 0.2, deskColor);
    addRoomComputer(root, [x, h * 0.3, z - d * 0.025], 0);
    addRoomChair(root, [x, 0, z - d * 0.25], Math.PI, side < 0 ? "#507ba0" : "#5f78a1");
  });
  addBox(root, [w * 0.18, h * 0.62, d * 0.18], [-w * 0.37, h * 0.32, d * 0.35], "#71818a", { edgeOpacity: 0.2 });
  for (let index = 1; index < 4; index += 1) {
    addBox(root, [w * 0.15, h * 0.012, d * 0.19], [-w * 0.37, h * (0.16 * index), d * 0.35], "#40545d", { edges: false });
  }
  addRoomDesk(root, [0, 0, -d * 0.2], w * 0.36, d * 0.18, "#85725e");
  addRoomChair(root, [-w * 0.22, 0, -d * 0.2], Math.PI / 2, "#6d7d8c");
  addRoomChair(root, [w * 0.22, 0, -d * 0.2], -Math.PI / 2, "#6d7d8c");
}

function buildLockerRoom(root, data) {
  const { width: w, depth: d, height: h } = data;
  buildRoomShell(root, data, "탈의실 · LOCKER ROOM");
  const lockerColor = "#677b85";
  const lockerDepth = d * 0.18;
  const lockerHeight = h * 0.67;
  const lockerWidth = w * 0.115;
  const startX = -lockerWidth * 2.5;
  for (let index = 0; index < 6; index += 1) {
    const x = startX + index * lockerWidth;
    const z = d / 2 - lockerDepth / 2 - 0.12;
    addBox(root, [lockerWidth * 0.92, lockerHeight, lockerDepth], [x, lockerHeight / 2 + h * 0.035, z], lockerColor, { edgeOpacity: 0.2 });
    addBox(root, [lockerWidth * 0.78, lockerHeight * 0.92, 0.015], [x, lockerHeight / 2 + h * 0.035, z - lockerDepth / 2 - 0.008], lighter(lockerColor, 1.13), { edgeOpacity: 0.28 });
    addBox(root, [lockerWidth * 0.08, h * 0.05, 0.02], [x + lockerWidth * 0.27, lockerHeight * 0.54, z - lockerDepth / 2 - 0.02], "#d8b65e", { edges: false });
    [-1, 1].forEach((slot) => addBox(root, [lockerWidth * 0.36, h * 0.009, 0.02], [x, lockerHeight * (0.67 + slot * 0.04), z - lockerDepth / 2 - 0.021], "#34464d", { edges: false }));
  }

  addBox(root, [w * 0.58, h * 0.07, d * 0.18], [0, h * 0.2, -d * 0.05], "#9a7550", { edgeOpacity: 0.18 });
  [-1, 