import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('scene');
const statusEl = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101722);
scene.fog = new THREE.Fog(0x101722, 5, 20);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.02, 50);
camera.position.set(2.6, 2.2, 2.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.35, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1;
controls.maxDistance = 8;

const hemi = new THREE.HemisphereLight(0xdfecff, 0x1d2936, 0.7);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.05);
dir.position.set(1.8, 3.8, 1.3);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.left = -4;
dir.shadow.camera.right = 4;
dir.shadow.camera.top = 4;
dir.shadow.camera.bottom = -4;
scene.add(dir);

const roomSize = 3.8; // meters, keep 1 world unit = 1 meter
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, roomSize),
  new THREE.MeshStandardMaterial({ color: 0x2f4057, roughness: 0.95, metalness: 0.04 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function buildWall(width, height, x, z, rotY = 0) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x4c8e72, roughness: 0.75, metalness: 0.08 })
  );
  wall.position.set(x, height / 2, z);
  wall.rotation.y = rotY;
  wall.userData.isWall = true;
  scene.add(wall);
  return wall;
}

const walls = [
  buildWall(roomSize, 1.7, 0, -roomSize / 2),
  buildWall(roomSize, 1.7, 0, roomSize / 2),
  buildWall(roomSize, 1.7, -roomSize / 2, 0, Math.PI / 2),
  buildWall(roomSize, 1.7, roomSize / 2, 0, Math.PI / 2),
  buildWall(1.3, 1.45, 0.45, 0.45, Math.PI / 2), // interior divider wall for alignment + collisions
];

// Surfaces discovered by "plane detection".
const detectedSurfaces = [
  { center: new THREE.Vector2(0, -0.2), size: new THREE.Vector2(2.2, 1.6), blocked: false },
  { center: new THREE.Vector2(-0.95, 0.95), size: new THREE.Vector2(1.1, 1.1), blocked: false },
  { center: new THREE.Vector2(1.1, 0.85), size: new THREE.Vector2(0.9, 0.8), blocked: true },
];

const surfaceGroup = new THREE.Group();
for (const surface of detectedSurfaces) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(surface.size.x, surface.size.y),
    new THREE.MeshStandardMaterial({
      color: surface.blocked ? 0xff4e4e : 0x5f8dff,
      opacity: surface.blocked ? 0.28 : 0.18,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(surface.center.x, 0.002, surface.center.y);
  surfaceGroup.add(mesh);
}
scene.add(surfaceGroup);

// Depth-only occlusion object that mimics a real world object passing in front.
const occluder = new THREE.Mesh(
  new THREE.BoxGeometry(0.48, 0.72, 0.48),
  new THREE.MeshStandardMaterial({ color: 0xffffff, colorWrite: false })
);
occluder.position.set(-0.2, 0.36, -0.35);
occluder.renderOrder = -10;
scene.add(occluder);

const occluderHint = new THREE.Mesh(
  new THREE.BoxGeometry(0.48, 0.72, 0.48),
  new THREE.MeshStandardMaterial({ color: 0x9fd6ff, opacity: 0.13, transparent: true })
);
occluderHint.position.copy(occluder.position);
scene.add(occluderHint);

const furniture = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.5, 0.55),
  new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.88, metalness: 0.05 })
);
body.position.y = 0.25;
body.castShadow = true;
body.receiveShadow = true;

const legs = new THREE.Group();
const legGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 14);
const legMat = new THREE.MeshStandardMaterial({ color: 0x6f5545, roughness: 0.8 });
for (const [x, z] of [[0.34, 0.22], [0.34, -0.22], [-0.34, 0.22], [-0.34, -0.22]]) {
  const leg = new THREE.Mesh(legGeom, legMat);
  leg.position.set(x, 0.05, z);
  leg.castShadow = true;
  legs.add(leg);
}

const contactShadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.47, 36),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = 0.005;

furniture.add(contactShadow, body, legs);
furniture.position.set(0.1, 0, -0.25);
scene.add(furniture);

const placedBoxes = [
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-1.15, 0.2, 1.06), new THREE.Vector3(0.45, 0.4, 0.45)),
];

const occupiedHint = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 0.4, 0.45),
  new THREE.MeshStandardMaterial({ color: 0xff6969, transparent: true, opacity: 0.2 })
);
occupiedHint.position.set(-1.15, 0.2, 1.06);
scene.add(occupiedHint);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();
let dragging = false;
let orbitEnabled = true;

const FURNITURE_SIZE = new THREE.Vector3(0.8, 0.5, 0.55);
const WALL_SNAP_DISTANCE = 0.1;

function toRect(surface) {
  return {
    minX: surface.center.x - surface.size.x / 2,
    maxX: surface.center.x + surface.size.x / 2,
    minZ: surface.center.y - surface.size.y / 2,
    maxZ: surface.center.y + surface.size.y / 2,
    blocked: surface.blocked,
  };
}

const surfaceRects = detectedSurfaces.map(toRect);

function furnitureBounds(position = furniture.position, yaw = furniture.rotation.y) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const halfX = (FURNITURE_SIZE.x * c + FURNITURE_SIZE.z * s) / 2;
  const halfZ = (FURNITURE_SIZE.x * s + FURNITURE_SIZE.z * c) / 2;

  return {
    minX: position.x - halfX,
    maxX: position.x + halfX,
    minZ: position.z - halfZ,
    maxZ: position.z + halfZ,
    halfX,
    halfZ,
  };
}

function intersects2D(a, b) {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxZ <= b.minZ || a.minZ >= b.maxZ);
}

function surfaceCoverage(bounds, rect) {
  const overlapX = Math.max(0, Math.min(bounds.maxX, rect.maxX) - Math.max(bounds.minX, rect.minX));
  const overlapZ = Math.max(0, Math.min(bounds.maxZ, rect.maxZ) - Math.max(bounds.minZ, rect.minZ));
  return overlapX * overlapZ;
}

function nearestWallSnap(position, bounds) {
  let best = null;

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);

    const nearX = Math.min(Math.abs(bounds.minX - wallBox.max.x), Math.abs(bounds.maxX - wallBox.min.x));
    const nearZ = Math.min(Math.abs(bounds.minZ - wallBox.max.z), Math.abs(bounds.maxZ - wallBox.min.z));

    const wallLongX = (wallBox.max.x - wallBox.min.x) > (wallBox.max.z - wallBox.min.z);

    const candidate = wallLongX
      ? {
          dist: nearZ,
          axis: 'z',
          value: Math.abs(bounds.minZ - wallBox.max.z) < Math.abs(bounds.maxZ - wallBox.min.z)
            ? wallBox.max.z + bounds.halfZ
            : wallBox.min.z - bounds.halfZ,
          yaw: 0,
        }
      : {
          dist: nearX,
          axis: 'x',
          value: Math.abs(bounds.minX - wallBox.max.x) < Math.abs(bounds.maxX - wallBox.min.x)
            ? wallBox.max.x + bounds.halfX
            : wallBox.min.x - bounds.halfX,
          yaw: Math.PI / 2,
        };

    if (candidate.dist <= WALL_SNAP_DISTANCE && (!best || candidate.dist < best.dist)) {
      best = candidate;
    }
  }

  if (!best) {
    return null;
  }

  const snapped = position.clone();
  snapped[best.axis] = best.value;
  return { snapped, yaw: best.yaw };
}

function validatePlacement(position, yaw) {
  const bounds = furnitureBounds(position, yaw);

  let supportedArea = 0;
  const furnitureArea = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);

  for (const surface of surfaceRects) {
    const overlapArea = surfaceCoverage(bounds, surface);
    if (surface.blocked && overlapArea > 0.0001) {
      return { ok: false, message: 'Blocked detected surface in placement zone.' };
    }

    if (!surface.blocked) {
      supportedArea += overlapArea;
    }
  }

  if (supportedArea < furnitureArea * 0.85) {
    return { ok: false, message: 'Furniture must remain on detected horizontal surfaces.' };
  }

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    const wallRect = { minX: wallBox.min.x, maxX: wallBox.max.x, minZ: wallBox.min.z, maxZ: wallBox.max.z };
    if (intersects2D(bounds, wallRect)) {
      return { ok: false, message: 'Collision with wall detected.' };
    }
  }

  for (const occupied of placedBoxes) {
    const rect = { minX: occupied.min.x, maxX: occupied.max.x, minZ: occupied.min.z, maxZ: occupied.max.z };
    if (intersects2D(bounds, rect)) {
      return { ok: false, message: 'Overlap with existing detected surface/object.' };
    }
  }

  return { ok: true, message: 'Placement valid.' };
}

function updatePlacement(worldPoint) {
  const candidate = new THREE.Vector3(worldPoint.x, 0, worldPoint.z);
  let yaw = furniture.rotation.y;
  const preSnapBounds = furnitureBounds(candidate, yaw);
  const snap = nearestWallSnap(candidate, preSnapBounds);
  if (snap) {
    candidate.copy(snap.snapped);
    yaw = snap.yaw;
  }

  const validation = validatePlacement(candidate, yaw);
  if (validation.ok) {
    furniture.position.copy(candidate);
    furniture.rotation.y = yaw;
    body.material.color.setHex(0xe7e1d3);
    statusEl.textContent = `${validation.message}${snap ? ' Auto-aligned to nearby wall (≤10cm).' : ''}`;
  } else {
    body.material.color.setHex(0xff8f8f);
    statusEl.textContent = validation.message;
  }
}

function pointerToWorld(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(dragPlane, dragPoint);
}

window.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }
  dragging = true;
  controls.enabled = !orbitEnabled;
  const hit = pointerToWorld(event);
  if (hit) {
    updatePlacement(hit.clone());
  }
});

window.addEventListener('pointermove', (event) => {
  if (!dragging) {
    return;
  }
  const hit = pointerToWorld(event);
  if (hit) {
    updatePlacement(hit.clone());
  }
});

window.addEventListener('pointerup', () => {
  dragging = false;
  controls.enabled = orbitEnabled;
});

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') {
    furniture.rotation.y += Math.PI / 12;
    const validation = validatePlacement(furniture.position, furniture.rotation.y);
    statusEl.textContent = validation.message;
  }

  if (event.key.toLowerCase() === 'c') {
    orbitEnabled = !orbitEnabled;
    controls.enabled = orbitEnabled;
    statusEl.textContent = orbitEnabled
      ? 'Camera orbit enabled; placement adapts in real-time as view changes.'
      : 'Camera orbit locked. Drag furniture for placement.';
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  occluderHint.material.opacity = 0.11 + (Math.sin(t * 1.7) * 0.025 + 0.025);

  // Subtle dynamic contact shadow response to camera movement.
  const cameraDistance = camera.position.distanceTo(furniture.position);
  contactShadow.scale.setScalar(1 + Math.min(0.2, cameraDistance * 0.02));
  contactShadow.material.opacity = 0.13 + Math.min(0.08, cameraDistance * 0.015);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

statusEl.textContent = 'Ready. Drag furniture to test snapping, collisions, occlusion, and wall alignment.';
animate();
