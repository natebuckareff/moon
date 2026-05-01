import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing scene canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setScissorTest(true);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const EARTH_RADIUS = 1.4;
const MOON_RADIUS = EARTH_RADIUS * 0.273;
const BASE_SYSTEM_MOON_DISTANCE = 30;
const SYSTEM_MOON_DISTANCE = 5;
const SKY_MOON_DISTANCE = 24;
const SKY_MOON_SIZE = 0.5;
const HORIZON_Y = -2.5;

const systemCamera = new THREE.PerspectiveCamera(55, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
systemCamera.position.set(0, 10, 18);

const skyCamera = new THREE.PerspectiveCamera(55, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
skyCamera.position.set(0, 0, 0);

const orbit = new OrbitControls(systemCamera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, 0, 0);

const ui = {
  caption: document.querySelector<HTMLParagraphElement>("#caption")!,
  latitude: document.querySelector<HTMLSelectElement>("#latitude")!,
  moonTime: document.querySelector<HTMLInputElement>("#moonTime")!,
  phase: document.querySelector<HTMLInputElement>("#phase")!,
  latReadout: document.querySelector<HTMLElement>("#latReadout")!,
  phaseReadout: document.querySelector<HTMLElement>("#phaseReadout")!,
  altReadout: document.querySelector<HTMLElement>("#altReadout")!,
  orientReadout: document.querySelector<HTMLElement>("#orientReadout")!,
};

const state = {
  latitude: 50,
  moonTime: 20,
  phase: 0.18,
};

const root = new THREE.Group();
scene.add(root);

const skyGroup = new THREE.Group();
const systemGroup = new THREE.Group();
root.add(skyGroup, systemGroup);

const starGeometry = new THREE.BufferGeometry();
const starPositions: number[] = [];
for (let i = 0; i < 1200; i++) {
  const radius = 120;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(THREE.MathUtils.randFloatSpread(1));
  starPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}
starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.85 }),
);
skyGroup.add(stars);

const horizon = new THREE.GridHelper(24, 24, 0x33506a, 0x1f3144);
horizon.position.y = HORIZON_Y;
skyGroup.add(horizon);

const horizonRing = new THREE.Mesh(
  new THREE.TorusGeometry(12, 0.018, 8, 160),
  new THREE.MeshBasicMaterial({ color: 0x6f8ca8 }),
);
horizonRing.rotation.x = Math.PI / 2;
horizonRing.position.y = HORIZON_Y;
skyGroup.add(horizonRing);

const directionLabels = new THREE.Group();
skyGroup.add(directionLabels);

function makeLabel(text: string): THREE.Sprite {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 160;
  labelCanvas.height = 80;
  const context = labelCanvas.getContext("2d")!;
  context.fillStyle = "rgba(9, 14, 24, 0.75)";
  context.fillRect(36, 16, 88, 42);
  context.font = "600 28px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#dce8f5";
  context.fillText(text, 80, 38);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.4, 0.7, 1);
  return sprite;
}

[
  ["N", 0],
  ["E", 90],
  ["S", 180],
  ["W", 270],
].forEach(([label, degrees]) => {
  const sprite = makeLabel(String(label));
  const angle = THREE.MathUtils.degToRad(Number(degrees));
  sprite.position.set(Math.sin(angle) * 10.8, -2.0, Math.cos(angle) * -10.8);
  directionLabels.add(sprite);
});

const moonCanvas = document.createElement("canvas");
moonCanvas.width = 768;
moonCanvas.height = 768;
const moonTexture = new THREE.CanvasTexture(moonCanvas);
moonTexture.colorSpace = THREE.SRGBColorSpace;

const moon = new THREE.Mesh(
  new THREE.PlaneGeometry(SKY_MOON_SIZE, SKY_MOON_SIZE),
  new THREE.MeshBasicMaterial({ map: moonTexture, transparent: true, depthWrite: false }),
);
skyGroup.add(moon);

const altitudeArc = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0x70b7ff, transparent: true, opacity: 0.5 }),
);
skyGroup.add(altitudeArc);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 64, 32),
  new THREE.MeshStandardMaterial({ color: 0x2f7dd3, roughness: 0.7, metalness: 0.05 }),
);
systemGroup.add(earth);

const earthClouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 48, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, wireframe: true }),
);
systemGroup.add(earthClouds);

const systemMoon = new THREE.Mesh(
  new THREE.SphereGeometry(MOON_RADIUS, 48, 24),
  new THREE.MeshStandardMaterial({ color: 0xbfc3c8, roughness: 0.9 }),
);
systemGroup.add(systemMoon);

const observerMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 24, 12),
  new THREE.MeshBasicMaterial({ color: 0xffd166 }),
);
systemGroup.add(observerMarker);

const orbitLine = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 192 }, (_, i) => {
      const a = (i / 192) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * SYSTEM_MOON_DISTANCE, 0, Math.sin(a) * SYSTEM_MOON_DISTANCE);
    }),
  ),
  new THREE.LineBasicMaterial({ color: 0x6d7d90, transparent: true, opacity: 0.5 }),
);
systemGroup.add(orbitLine);

const sunlight = new THREE.DirectionalLight(0xffffff, 3.2);
sunlight.position.set(-8, 2, 3);
scene.add(sunlight);
scene.add(new THREE.AmbientLight(0x506070, 0.8));

function drawMoonTexture(lightVector: THREE.Vector3, orientationRadians: number) {
  const ctx = moonCanvas.getContext("2d")!;
  const size = moonCanvas.width;
  const center = size / 2;
  const radius = size * 0.43;
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const rotate = -orientationRadians;
  const cr = Math.cos(rotate);
  const sr = Math.sin(rotate);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / radius;
      const dy = (y - center) / radius;
      const distanceSq = dx * dx + dy * dy;
      const offset = (y * size + x) * 4;
      if (distanceSq > 1) {
        data[offset + 3] = 0;
        continue;
      }

      const rx = dx * cr - dy * sr;
      const ry = dx * sr + dy * cr;
      const z = Math.sqrt(Math.max(0, 1 - rx * rx - ry * ry));
      const normal = new THREE.Vector3(rx, ry, z);
      const illumination = THREE.MathUtils.clamp(normal.dot(lightVector) * 1.9 + 0.08, 0, 1);
      const crater = Math.sin(rx * 42) * Math.sin(ry * 31) * 0.045 + Math.sin((rx + ry) * 74) * 0.025;
      const limb = THREE.MathUtils.smoothstep(z, 0.02, 0.22);
      const shade = (0.12 + illumination * 0.88 + crater) * limb;
      data[offset] = Math.floor(205 * shade);
      data[offset + 1] = Math.floor(211 * shade);
      data[offset + 2] = Math.floor(220 * shade);
      data[offset + 3] = Math.floor(255 * limb);
    }
  }
  ctx.putImageData(image, 0, 0);
  moonTexture.needsUpdate = true;
}

function phaseName(phase: number): string {
  const names = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  return names[Math.round(phase * 8) % 8];
}

function systemPositions() {
  const phaseAngle = state.phase * Math.PI * 2;
  const observerLongitude = ((state.moonTime - 12) / 24) * Math.PI * 2;
  const latitude = THREE.MathUtils.degToRad(state.latitude);

  return {
    moonPosition: new THREE.Vector3(
      Math.cos(phaseAngle) * SYSTEM_MOON_DISTANCE,
      0,
      Math.sin(phaseAngle) * SYSTEM_MOON_DISTANCE,
    ),
    observerPosition: new THREE.Vector3(
      Math.cos(latitude) * Math.cos(observerLongitude) * EARTH_RADIUS * 1.09,
      Math.sin(latitude) * EARTH_RADIUS * 1.09,
      Math.cos(latitude) * Math.sin(observerLongitude) * EARTH_RADIUS * 1.09,
    ),
  };
}

function moonTextureLightVector() {
  const { moonPosition, observerPosition } = systemPositions();
  const viewerDirection = observerPosition.clone().sub(moonPosition).normalize();
  const sunDirection = sunlight.position.clone().normalize();
  const facingLight = THREE.MathUtils.clamp(sunDirection.dot(viewerDirection), -1, 1);
  const sideLight = Math.sqrt(Math.max(0, 1 - facingLight * facingLight));
  const sideSign = sunDirection.cross(viewerDirection).y >= 0 ? 1 : -1;

  return new THREE.Vector3(sideLight * sideSign, 0, facingLight).normalize();
}

function moonHorizontalPosition() {
  const { moonPosition, observerPosition } = systemPositions();
  const localUp = observerPosition.clone().normalize();
  const axisNorth = new THREE.Vector3(0, 1, 0);
  let localNorth = axisNorth.clone().sub(localUp.clone().multiplyScalar(axisNorth.dot(localUp))).normalize();
  if (localNorth.lengthSq() < 0.001) {
    localNorth = new THREE.Vector3(0, 0, 1);
  }
  const localEast = localNorth.clone().cross(localUp).normalize();
  const moonDirection = moonPosition.clone().sub(observerPosition).normalize();
  const east = moonDirection.dot(localEast);
  const north = moonDirection.dot(localNorth);
  const up = moonDirection.dot(localUp);
  const altitude = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(up, -1, 1)));
  const azimuth = Math.atan2(east, north);
  const horizontal = Math.max(0.001, Math.sqrt(Math.max(0, 1 - up * up)));

  return {
    altitude,
    azimuth,
    position: new THREE.Vector3(
      (east / horizontal) * Math.cos(Math.asin(up)) * SKY_MOON_DISTANCE,
      HORIZON_Y + up * SKY_MOON_DISTANCE,
      -(north / horizontal) * Math.cos(Math.asin(up)) * SKY_MOON_DISTANCE,
    ),
  };
}

function parallacticOrientation(altitude: number, azimuth: number) {
  const base = THREE.MathUtils.degToRad(-state.latitude * 0.9);
  const horizonTurn = THREE.MathUtils.degToRad(Math.sin(azimuth) * (90 - altitude) * 0.3);
  return base + horizonTurn;
}

function updateAltitudeArc(position: THREE.Vector3) {
  const points: THREE.Vector3[] = [];
  const moonPosition = moonHorizontalPosition();
  const azimuth = moonPosition.azimuth;
  const maxAlt = Math.max(0, THREE.MathUtils.degToRad(moonPosition.altitude));
  for (let i = 0; i <= 48; i++) {
    const altitude = (i / 48) * maxAlt;
    points.push(
      new THREE.Vector3(
        Math.sin(azimuth) * Math.cos(altitude) * SKY_MOON_DISTANCE,
        HORIZON_Y + Math.sin(altitude) * SKY_MOON_DISTANCE,
        -Math.cos(azimuth) * Math.cos(altitude) * SKY_MOON_DISTANCE,
      ),
    );
  }
  points.push(position);
  altitudeArc.geometry.dispose();
  altitudeArc.geometry = new THREE.BufferGeometry().setFromPoints(points);
}

function updateSky() {
  const { altitude, azimuth, position } = moonHorizontalPosition();
  moon.position.copy(position);
  moon.scale.setScalar(BASE_SYSTEM_MOON_DISTANCE / SYSTEM_MOON_DISTANCE);
  moon.lookAt(skyCamera.position);

  const viewAltitude = THREE.MathUtils.degToRad(18);
  skyCamera.lookAt(
    Math.sin(azimuth) * Math.cos(viewAltitude) * SKY_MOON_DISTANCE,
    HORIZON_Y + Math.sin(viewAltitude) * SKY_MOON_DISTANCE,
    -Math.cos(azimuth) * Math.cos(viewAltitude) * SKY_MOON_DISTANCE,
  );

  const orientation = parallacticOrientation(altitude, azimuth);
  moon.rotation.z = orientation;
  drawMoonTexture(moonTextureLightVector(), orientation);
  updateAltitudeArc(position);

  const latLabel = state.latitude > 0 ? `${state.latitude}° N` : state.latitude < 0 ? `${Math.abs(state.latitude)}° S` : "0°";
  const phase = phaseName(state.phase);
  ui.latReadout.textContent = latLabel;
  ui.phaseReadout.textContent = phase;
  ui.altReadout.textContent = `${altitude.toFixed(0)}°`;
  ui.orientReadout.textContent = `${THREE.MathUtils.radToDeg(orientation).toFixed(0)}°`;
  ui.caption.textContent = `${latLabel} sky view, ${phase.toLowerCase()}.`;
}

function updateSystem() {
  const { moonPosition, observerPosition } = systemPositions();
  systemMoon.position.copy(moonPosition);
  observerMarker.position.copy(observerPosition);
  earth.rotation.y += 0.002;
  earthClouds.rotation.y -= 0.0015;
}

function syncFromControls() {
  state.latitude = Number(ui.latitude.value);
  state.moonTime = Number(ui.moonTime.value);
  state.phase = Number(ui.phase.value);
  updateSky();
  updateSystem();
}

[ui.latitude, ui.moonTime, ui.phase].forEach((control) => {
  control.addEventListener("input", syncFromControls);
});

window.addEventListener("resize", () => {
  const halfWidth = Math.max(1, window.innerWidth / 2);
  systemCamera.aspect = halfWidth / window.innerHeight;
  skyCamera.aspect = halfWidth / window.innerHeight;
  systemCamera.updateProjectionMatrix();
  skyCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncFromControls();

function renderSplitView() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const leftWidth = Math.floor(width / 2);
  const rightWidth = width - leftWidth;

  systemGroup.visible = true;
  skyGroup.visible = false;
  renderer.setViewport(0, 0, leftWidth, height);
  renderer.setScissor(0, 0, leftWidth, height);
  renderer.render(scene, systemCamera);

  systemGroup.visible = false;
  skyGroup.visible = true;
  renderer.setViewport(leftWidth, 0, rightWidth, height);
  renderer.setScissor(leftWidth, 0, rightWidth, height);
  renderer.render(scene, skyCamera);

  systemGroup.visible = true;
  skyGroup.visible = true;
}

function animate() {
  requestAnimationFrame(animate);
  orbit.update();
  updateSystem();
  renderSplitView();
}

animate();
