import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as Physics from './physics.js';

const CM = 0.01;
const COLORS = { north: 0xff4d61, south: 0x397cff, cyan: 0x35e6ff, blue: 0x397cff, magenta: 0xd96bff, copper: 0xc9784a, steel: 0xb8c4d0, dark: 0x0a1220, acid: 0xa3ff6b, amber: 0xffb547 };

function metal(color, roughness = 0.28, metalness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1 });
}
function paint(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.55, envMapIntensity: 0.9 });
}
function glow(color, opacity = 0.8) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}
function brushedTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a949e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = `rgba(${180 + Math.random() * 60},${185 + Math.random() * 55},${195 + Math.random() * 50},${0.04 + Math.random() * 0.08})`;
    const y = Math.random() * 256;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + (Math.random() - 0.5) * 3); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function windingTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4526'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 6) {
    g.fillStyle = y % 12 === 0 ? '#d98a52' : '#a05c30';
    g.fillRect(0, y, 64, 4);
    g.fillStyle = 'rgba(255,220,180,.25)'; g.fillRect(0, y, 64, 1);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function poleTexture(letter, color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = 'bold 72px Space Grotesk, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(letter, 64, 68);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.strokeRect(8, 8, 112, 112);
  return new THREE.CanvasTexture(c);
}

export class MagneticScene {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.params = {
      strength: 100, gap: 40, density: 24, speed: 1, fieldLines: true, filings: false,
      heatmap: false, labels: true, grid: true, displayMode: 'solid', light: 1,
      quality: 'high', paused: false, polarity: 'attract', temperature: 20, twoMagnets: false
    };
    this.view = 'magnet';
    this.magnet = null; this.material = null; this.device = null; this.experiment = null;
    this.alloy = null; this.thickness = 5;
    this.mounted = false; this.disposed = false;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragging = null; this.lastInteraction = performance.now();
    this.fieldLines = []; this.flowData = []; this.sources = [];
    this.explodeAmount = 0; this.explodeTarget = 0;
    this.arcTimer = 0; this.rotorAngle = 0;
    this._initRenderer();
    this._initScene();
    this._bindEvents();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.localClippingEnabled = true;
    } catch {
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      } catch {
        this.renderer = {
          domElement: document.createElement('canvas'),
          getContext: () => null,
          capabilities: { isWebGL2: false },
          setClearColor: () => {},
          shadowMap: { enabled: false },
          setPixelRatio: () => {},
          setSize: () => {},
          render: () => {},
          dispose: () => {}
        };
      }
    }
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Interactive 3D magnetic laboratory viewport');
    this.canvas.tabIndex = 0;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050a12, 0.028);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.camera.position.set(8, 5.5, 10);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 32;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.target.set(0, 0.6, 0);
    this.controls.autoRotateSpeed = 0.35;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    this.scene.add(new THREE.AmbientLight(0x2a3f5a, 0.5));
    const hemi = new THREE.HemisphereLight(0x3a6ea8, 0x0a0f18, 0.55);
    this.scene.add(hemi);
    this.keyLight = new THREE.SpotLight(0xdff4ff, 55, 40, Math.PI / 5, 0.45, 1.6);
    this.keyLight.position.set(6, 12, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.0004;
    this.scene.add(this.keyLight, this.keyLight.target);
    this.rimLight = new THREE.PointLight(COLORS.blue, 18, 30, 1.8);
    this.rimLight.position.set(-8, 4, -6);
    this.scene.add(this.rimLight);
    this.fillLight = new THREE.PointLight(COLORS.magenta, 8, 25, 1.8);
    this.fillLight.position.set(5, 2, -8);
    this.scene.add(this.fillLight);
    this.accentLight = new THREE.PointLight(COLORS.cyan, 10, 20, 1.8);
    this.accentLight.position.set(0, 3, 6);
    this.scene.add(this.accentLight);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.modelGroup = new THREE.Group();
    this.fieldGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.world.add(this.modelGroup, this.fieldGroup, this.labelGroup);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.MeshStandardMaterial({ color: 0x070d16, roughness: 0.85, metalness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.receiveShadow = true;
    this.scene.add(floor);
    this.grid = new THREE.GridHelper(30, 30, 0x1c3a55, 0x101f30);
    this.grid.material.transparent = true; this.grid.material.opacity = 0.45;
    this.scene.add(this.grid);
    this.rings = new THREE.Group();
    [4.5, 7.5, 11].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 128), glow(COLORS.cyan, 0.18 - i * 0.04));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.01;
      this.rings.add(ring);
    });
    this.scene.add(this.rings);

    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 30;
      dustPos[i * 3 + 1] = Math.random() * 12;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: COLORS.cyan, size: 0.035, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.dust);

    this.brushed = brushedTexture();
    this.winding = windingTexture();
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.001);
    this._buildFilings();
    this._buildHeatmap();
    this._buildFlow();
  }

  _bindEvents() {
    this._onPointerDown = e => this._pointerDown(e);
    this._onPointerMove = e => this._pointerMove(e);
    this._onPointerUp = () => this._pointerUp();
    this._onWheel = () => { this.lastInteraction = performance.now(); };
    this._onContextLost = e => { e.preventDefault(); console.warn('WebGL Context Lost. Recovering...'); };
    this._onContextRestored = () => { console.info('WebGL Context Restored.'); this._rebuild(); };
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: true });
    this.controls.addEventListener('start', () => { this.lastInteraction = performance.now(); });
    this._onVisibility = () => { if (document.hidden) this.clock.stop(); else this.clock.start(); };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  mount(host) {
    if (this.mounted && this.host === host) return;
    this.host = host;
    host.appendChild(this.canvas);
    host.appendChild(this.labelRenderer.domElement);
    this.mounted = true;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(host);
    this._resize();
    this.renderer.shadowMap.needsUpdate = true;
    this.callbacks.onReady?.(this.renderer);
  }

  unmount() {
    this._resizeObserver?.disconnect();
    this.canvas.remove();
    this.labelRenderer.domElement.remove();
    this.mounted = false;
  }

  _resize() {
    if (!this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const cap = this.params.quality === 'low' ? 1 : this.params.quality === 'medium' ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
  }

  setView(view) { this.view = view; this._rebuild(); }

  setMagnet(magnet) {
    this.magnet = magnet;
    this.view = this.view === 'field' ? 'field' : 'magnet';
    this._rebuild();
  }

  setMaterial(material, thickness = 5) {
    this.material = material; this.thickness = thickness; this.view = 'material';
    this._rebuild();
  }

  setAlloy(alloy) { this.alloy = alloy; this.view = 'alloy'; this._rebuild(); }

  setDevice(device, params = {}) {
    this.device = device;
    this.deviceParams = { ...device.defaults, ...params };
    this.view = 'electro';
    this._rebuild();
  }

  setExperiment(experiment) {
    this.experiment = experiment;
    this.view = 'experiment';
    this._rebuild();
  }

  update(patch) {
    const prev = { ...this.params };
    Object.assign(this.params, patch);
    if (patch.quality) this._resize();
    if (patch.light !== undefined) {
      this.keyLight.intensity = 55 * this.params.light;
      this.rimLight.intensity = 18 * this.params.light;
      this.fillLight.intensity = 8 * this.params.light;
      this.accentLight.intensity = 10 * this.params.light;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (patch.grid !== undefined) { this.grid.visible = patch.grid; this.rings.visible = patch.grid; }
    if (patch.displayMode) this._applyDisplayMode();
    if (patch.labels !== undefined) this.labelGroup.visible = patch.labels;
    const fieldChanged = ['strength', 'gap', 'polarity', 'temperature', 'twoMagnets'].some(k => patch[k] !== undefined && patch[k] !== prev[k]);
    const densityChanged = patch.density !== undefined && patch.density !== prev.density;
    if (fieldChanged || densityChanged) this._updateField();
    if (patch.filings !== undefined) this.filingsMesh.visible = patch.filings;
    if (patch.heatmap !== undefined) this.heatmapMesh.visible = patch.heatmap;
    if (patch.fieldLines !== undefined) {
      this.fieldGroup.visible = patch.fieldLines;
      this.flowMesh.visible = patch.fieldLines;
    }
    if (this.device && ['voltage', 'current', 'turns', 'core', 'length', 'diameter', 'gap'].some(k => patch[k] !== undefined)) {
      this.deviceParams = { ...this.deviceParams, ...patch };
      this._rebuildModel();
      this._updateField();
    }
  }

  _rebuild() {
    this._rebuildModel();
    this._updateField();
    this._applyDisplayMode();
    this.labelGroup.visible = this.params.labels;
    this.fieldGroup.visible = this.params.fieldLines;
    this.filingsMesh.visible = this.params.filings;
    this.heatmapMesh.visible = this.params.heatmap;
    this.flowMesh.visible = this.params.fieldLines;
    this.grid.visible = this.params.grid;
    this.rings.visible = this.params.grid;
    this.renderer.shadowMap.needsUpdate = true;
  }

  _clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse?.(obj => {
        if (obj.geometry && !obj.userData.shared) obj.geometry.dispose();
        if (obj.material && !obj.userData.shared) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => { if (m.map && m.map !== this.brushed && m.map !== this.winding) m.map.dispose(); m.dispose(); });
        }
        if (obj.element) obj.element.remove();
      });
    }
  }

  _rebuildModel() {
    this._clearGroup(this.modelGroup);
    this._clearGroup(this.labelGroup);
    this.parts = [];
    this.draggables = [];
    this.rotors = [];
    this.pairGroups = null;
    this.probe = null;
    this.maglevFloater = null;
    this.deviceGroup = null;
    this.teslaArcs = null;
    this.genRotor = null;
    this.domainGroup = null;
    const view = this.view;
    if (view === 'magnet' || view === 'field' || view === 'experiment') {
      const magnet = this.magnet;
      if (!magnet) return;
      if (view === 'field' || this.params.twoMagnets) {
        this._buildMagnetPair(magnet);
      } else {
        const g = this._buildMagnet(magnet, 0);
        this.modelGroup.add(g);
      }
    } else if (view === 'material') {
      this._buildMaterialSample();
    } else if (view === 'alloy') {
      this._buildAlloyComparison();
    } else if (view === 'electro') {
      this._buildDevice();
    }
    this._buildLabels();
    this.renderer.shadowMap.needsUpdate = true;
  }

  _addPart(group, mesh, explodeDir = [0, 0, 0]) {
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.basePos = mesh.position.clone();
    mesh.userData.explodeDir = new THREE.Vector3(...explodeDir);
    group.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  _magnetVolume(m) {
    const d = m.dimensions || {};
    const l = (d.length || d.diameter || 50) * 0.001;
    const w = (d.width || d.diameter || 16) * 0.001;
    const h = (d.height || d.thickness || m.thickness || 12) * 0.001;
    if (m.shape === 'ring') {
      const outer = (d.diameter || 40) * 0.001 / 2, inner = (d.innerDiameter || 16) * 0.001 / 2;
      return Math.PI * (outer * outer - inner * inner) * h;
    }
    if (['disc', 'cylinder', 'ring'].includes(m.shape)) return Math.PI * Math.pow((d.diameter || 30) * 0.001 / 2, 2) * h;
    return l * w * h;
  }

  _magnetLength(m) {
    const d = m.dimensions || {};
    if (['disc', 'cylinder', 'ring'].includes(m.shape)) return (d.height || d.thickness || m.thickness || 10) / 10;
    return (d.length || d.diameter || 50) / 10;
  }

  _buildMagnet(m, index, offsetX = 0, flipped = false) {
    const group = new THREE.Group();
    group.position.x = offsetX;
    group.userData.magnetIndex = index;
    group.userData.draggable = this.view === 'field' || this.view === 'experiment';
    const shape = m.shape;
    const northMat = paint(COLORS.north);
    const southMat = paint(COLORS.south);
    const steelMat = metal(COLORS.steel, 0.22, 0.95);
    steelMat.map = this.brushed;
    const bodyMat = m.color ? paint(new THREE.Color(m.color).getHex()) : steelMat;
    const markN = new THREE.MeshStandardMaterial({ map: poleTexture('N', '#ff4d61'), roughness: 0.4, metalness: 0.3 });
    const markS = new THREE.MeshStandardMaterial({ map: poleTexture('S', '#397cff'), roughness: 0.4, metalness: 0.3 });

    if (shape === 'bar' || shape === 'block') {
      const L = this._magnetLength(m), W = 1.6, H = 1.2;
      const half = new RoundedBoxGeometry(L / 2 - 0.02, H, W, 3, 0.08);
      const south = this._addPart(group, new THREE.Mesh(half, southMat), [-1.2, 0, 0]);
      south.position.set(-L / 4, H / 2 + 0.05, 0);
      south.userData.basePos = south.position.clone();
      const north = this._addPart(group, new THREE.Mesh(half.clone(), northMat), [1.2, 0, 0]);
      north.position.set(L / 4, H / 2 + 0.05, 0);
      north.userData.basePos = north.position.clone();
      const seam = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(0.05, H * 1.01, W * 1.01), steelMat), [0, 0.8, 0]);
      seam.position.set(0, H / 2 + 0.05, 0); seam.userData.basePos = seam.position.clone();
      const faceN = this._addPart(group, new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, H * 0.8), markN), [1.4, 0, 0]);
      faceN.position.set(L / 2 + 0.011, H / 2 + 0.05, 0); faceN.rotation.y = Math.PI / 2; faceN.userData.basePos = faceN.position.clone();
      const faceS = this._addPart(group, new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, H * 0.8), markS), [-1.4, 0, 0]);
      faceS.position.set(-L / 2 - 0.011, H / 2 + 0.05, 0); faceS.rotation.y = -Math.PI / 2; faceS.userData.basePos = faceS.position.clone();
      group.userData.poleAxis = new THREE.Vector3(1, 0, 0);
      group.userData.length = L;
    } else if (shape === 'horseshoe') {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.6, 2.2, 0), new THREE.Vector3(-1.6, 0.4, 0),
        new THREE.Vector3(-1.2, -0.6, 0), new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(1.2, -0.6, 0), new THREE.Vector3(1.6, 0.4, 0), new THREE.Vector3(1.6, 2.2, 0)
      ]);
      const tube = new THREE.TubeGeometry(curve, 64, 0.42, 16, false);
      const colors = [];
      const pos = tube.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const c = x < -0.3 ? new THREE.Color(COLORS.south) : x > 0.3 ? new THREE.Color(COLORS.north) : new THREE.Color(COLORS.steel);
        colors.push(c.r, c.g, c.b);
      }
      tube.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.7 });
      const mesh = this._addPart(group, new THREE.Mesh(tube, mat), [0, 1, 0]);
      mesh.position.y = 1.1; mesh.userData.basePos = mesh.position.clone();
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
      group.userData.length = 4;
      group.userData.horseshoe = true;
    } else if (shape === 'disc' || shape === 'cylinder') {
      const d = m.dimensions || {};
      const r = (d.diameter || 30) / 20;
      const h = (d.height || d.thickness || m.thickness || 10) / 10;
      const geo = new THREE.CylinderGeometry(r, r, h, 48);
      const south = this._addPart(group, new THREE.Mesh(geo, southMat), [0, -0.8, 0]);
      south.position.y = h / 2 + 0.05; south.userData.basePos = south.position.clone();
      const capN = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(r * 1.001, r * 1.001, 0.03, 48), markN), [0, 1, 0]);
      capN.position.y = h + 0.07; capN.userData.basePos = capN.position.clone();
      const capS = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(r * 1.001, r * 1.001, 0.03, 48), markS), [0, -1, 0]);
      capS.position.y = 0.03; capS.userData.basePos = capS.position.clone();
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
      group.userData.length = h;
    } else if (shape === 'ring') {
      const d = m.dimensions || {};
      const outer = (d.diameter || 40) / 20, inner = (d.innerDiameter || 16) / 20;
      const h = (d.height || d.thickness || m.thickness || 10) / 10;
      const shape2 = new THREE.Shape();
      shape2.absarc(0, 0, outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
      shape2.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(shape2, { depth: h, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 48 });
      geo.rotateX(-Math.PI / 2);
      const mesh = this._addPart(group, new THREE.Mesh(geo, bodyMat), [0, 1, 0]);
      mesh.position.y = 0.05; mesh.userData.basePos = mesh.position.clone();
      const top = this._addPart(group, new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), markN), [0, 1.2, 0]);
      top.rotation.x = -Math.PI / 2; top.position.y = h + 0.1; top.userData.basePos = top.position.clone();
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
      group.userData.length = h;
    } else if (shape === 'flex') {
      const geo = new RoundedBoxGeometry(5, 0.18, 2.2, 2, 0.05);
      const mesh = this._addPart(group, new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.75, metalness: 0.2 })), [0, 0.8, 0]);
      mesh.position.y = 0.15; mesh.userData.basePos = mesh.position.clone();
      for (let i = -2; i <= 2; i++) {
        const stripe = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.19, 2.21), i % 2 ? northMat : southMat), [i * 0.3, 0.9, 0]);
        stripe.position.set(i * 0.9, 0.15, 0); stripe.userData.basePos = stripe.position.clone();
      }
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
      group.userData.length = 5;
    } else if (shape === 'solenoid') {
      this._buildCoilInto(group, { length: 4, radius: 0.9, turns: 14, core: true });
      group.userData.poleAxis = new THREE.Vector3(1, 0, 0);
      group.userData.length = 4;
    } else if (shape === 'superconducting') {
      const cryo = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.4, 48), metal(0x9fb4c8, 0.15, 1)), [0, 1, 0]);
      cryo.position.y = 1.8; cryo.userData.basePos = cryo.position.clone();
      for (let i = 0; i < 5; i++) {
        const ring = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.05, 8, 48), glow(COLORS.cyan, 0.7)), [0, 1.2 + i * 0.1, 0]);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.6 + i * 0.6; ring.userData.basePos = ring.position.clone();
      }
      const cap = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 48), metal(0x6f87a1, 0.3, 0.9)), [0, 1.6, 0]);
      cap.position.y = 3.6; cap.userData.basePos = cap.position.clone();
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
      group.userData.length = 3.4;
    } else {
      const mesh = this._addPart(group, new THREE.Mesh(new RoundedBoxGeometry(4, 1.2, 1.6, 3, 0.08), bodyMat), [0, 1, 0]);
      mesh.position.y = 0.65; mesh.userData.basePos = mesh.position.clone();
      group.userData.poleAxis = new THREE.Vector3(1, 0, 0);
      group.userData.length = 4;
    }
    if (flipped) group.rotation.y = Math.PI;
    group.traverse(o => { if (o.isMesh) o.userData.magnetIndex = index; });
    if (group.userData.draggable) this.draggables.push(group);
    this._addDomains(group);
    return group;
  }

  _addDomains(group) {
    if (this.domainGroup) return;
    const domains = new THREE.Group();
    const geo = new THREE.ConeGeometry(0.06, 0.28, 6);
    const mat = glow(COLORS.acid, 0.85);
    for (let x = -2; x <= 2; x += 0.7) {
      for (let z = -0.5; z <= 0.5; z += 0.5) {
        const arrow = new THREE.Mesh(geo, mat);
        arrow.rotation.z = -Math.PI / 2;
        arrow.position.set(x, 0.65, z);
        domains.add(arrow);
      }
    }
    domains.visible = false;
    group.add(domains);
    this.domainGroup = domains;
  }

  _buildMagnetPair(m) {
    const L = this._magnetLength(m);
    const sep = L + this.params.gap / 10;
    const repel = this.params.polarity === 'repel';
    const a = this._buildMagnet(m, 0, -sep / 2, false);
    const b = this._buildMagnet(m, 1, sep / 2, repel);
    this.modelGroup.add(a, b);
    this.pairGroups = [a, b];
  }

  _buildCoilInto(group, { length = 4, radius = 0.9, turns = 14, core = true, axis = 'x' } = {}) {
    const copperMat = new THREE.MeshStandardMaterial({ color: COLORS.copper, roughness: 0.3, metalness: 0.85, map: this.winding });
    if (core) {
      const coreMesh = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, length * 1.15, 32), metal(0x8a949e, 0.4, 0.8)), [0, 0, 1.2]);
      coreMesh.rotation.z = Math.PI / 2; coreMesh.position.y = radius + 0.1;
      coreMesh.userData.basePos = coreMesh.position.clone();
    }
    const pts = [];
    const steps = turns * 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3((t - 0.5) * length, radius + 0.1 + Math.sin(angle) * radius, Math.cos(angle) * radius));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const coil = this._addPart(group, new THREE.Mesh(new THREE.TubeGeometry(curve, steps, 0.07, 8, false), copperMat), [0, 1.2, 0]);
    coil.userData.basePos = coil.position.clone();
    [-1, 1].forEach(side => {
      const terminal = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), metal(COLORS.amber, 0.3, 0.9)), [side * 1.2, -0.5, 0]);
      terminal.position.set(side * length / 2, 0.1, 0); terminal.userData.basePos = terminal.position.clone();
    });
    if (axis === 'y') group.rotation.z = Math.PI / 2;
    return group;
  }

  _buildMaterialSample() {
    const m = this.material;
    if (!m) return;
    const t = Math.max(0.05, this.thickness / 10);
    const color = new THREE.Color(m.color || '#8a949e');
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: m.category === 'nonferromagnetic' ? 0.2 : 0.4,
      metalness: 0.9, map: this.brushed, envMapIntensity: 1.2
    });
    const plate = this._addPart(this.modelGroup, new THREE.Mesh(new RoundedBoxGeometry(6, t, 4, 3, Math.min(0.06, t / 3)), mat), [0, 1, 0]);
    plate.position.y = t / 2 + 0.05; plate.userData.basePos = plate.position.clone();
    plate.userData.materialId = m.id;
    this.draggables.push(plate);
    const edge = this._addPart(this.modelGroup, new THREE.Mesh(new THREE.BoxGeometry(6.02, Math.max(0.02, t * 0.15), 4.02), glow(COLORS.cyan, 0.35)), [0, 1.2, 0]);
    edge.position.y = t + 0.06; edge.userData.basePos = edge.position.clone();
    this._buildProbeMagnet(3.8);
  }

  _buildProbeMagnet(height = 3.5) {
    const probe = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.8, 1.2, 2, 0.06), paint(COLORS.north));
    body.position.y = height; probe.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.1, 1.22), metal(COLORS.steel));
    cap.position.y = height - 0.45; probe.add(cap);
    probe.userData.probe = true;
    this.modelGroup.add(probe);
    this.probe = probe;
  }

  _buildAlloyComparison() {
    const a = this.alloy;
    if (!a) return;
    const build = (mat, thickness, x, label) => {
      const t = Math.max(0.05, thickness / 10);
      const mesh = this._addPart(this.modelGroup, new THREE.Mesh(
        new RoundedBoxGeometry(4.5, t, 3.5, 3, Math.min(0.06, t / 3)),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(mat.color || '#8a949e'), roughness: 0.3, metalness: 0.9, map: this.brushed })
      ), [x > 0 ? 1 : -1, 1, 0]);
      mesh.position.set(x, t / 2 + 0.05, 0); mesh.userData.basePos = mesh.position.clone();
      mesh.userData.materialId = mat.id;
      this.draggables.push(mesh);
      const el = document.createElement('div');
      el.className = 'object-label'; el.textContent = `${label} · ${thickness} mm`;
      const obj = new CSS2DObject(el);
      obj.position.set(x, t + 0.8, 0);
      this.labelGroup.add(obj);
    };
    build(a.materialA, a.thicknessA, -3.2, 'A');
    build(a.materialB, a.thicknessB, 3.2, 'B');
    this._buildProbeMagnet(3.2);
  }

  _buildDevice() {
    const d = this.device;
    if (!d) return;
    const p = this.deviceParams || d.defaults;
    const shape = d.shape || d.id;
    const group = new THREE.Group();
    this.modelGroup.add(group);
    if (shape === 'tesla-coil' || d.id === 'tesla-coil') {
      const base = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.4, 48), metal(0x1a2636, 0.5, 0.7)), [0, -0.6, 0]);
      base.position.y = 0.2; base.userData.basePos = base.position.clone();
      const primaryPts = [];
      for (let i = 0; i <= 240; i++) {
        const t = i / 240, angle = t * Math.PI * 2 * 6;
        const r = 1.1 + t * 1.1;
        primaryPts.push(new THREE.Vector3(Math.cos(angle) * r, 0.45 + t * 0.12, Math.sin(angle) * r));
      }
      const primary = this._addPart(group, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(primaryPts), 240, 0.06, 8), metal(COLORS.copper, 0.25, 0.9)), [0, -0.3, 0]);
      primary.userData.basePos = primary.position.clone();
      const secondary = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 4.2, 32), new THREE.MeshStandardMaterial({ color: 0x8a4a28, roughness: 0.45, metalness: 0.6, map: this.winding })), [0, 1.2, 0]);
      secondary.position.y = 2.6; secondary.userData.basePos = secondary.position.clone();
      const toroid = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.35, 24, 64), metal(0xc8d4e0, 0.12, 1)), [0, 2, 0]);
      toroid.rotation.x = Math.PI / 2; toroid.position.y = 4.9; toroid.userData.basePos = toroid.position.clone();
      const breakout = this._addPart(group, new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), glow(COLORS.magenta, 0.9)), [0, 2.4, 0]);
      breakout.position.y = 5.3; breakout.userData.basePos = breakout.position.clone();
      this.teslaArcs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COLORS.magenta, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
      group.add(this.teslaArcs);
      this.teslaTop = new THREE.Vector3(0, 5.3, 0);
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else if (shape === 'transformer') {
      const coreMat = metal(0x5a6672, 0.5, 0.7);
      [[-1.6, 0], [1.6, 0], [0, 1.8], [0, -1.8]].forEach(([x, y], i) => {
        const vert = i < 2;
        const mesh = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(vert ? 0.5 : 3.7, vert ? 4.1 : 0.5, 1.2), coreMat), [x * 0.4, y * 0.4, 0]);
        mesh.position.set(x, y + 2.2, 0); mesh.userData.basePos = mesh.position.clone();
      });
      [-1.6, 1.6].forEach((x, idx) => {
        const coilGroup = new THREE.Group();
        coilGroup.position.set(x, 2.2, 0);
        this._buildCoilInto(coilGroup, { length: 2.2, radius: 0.75, turns: idx ? 18 : 10, core: false, axis: 'y' });
        group.add(coilGroup);
      });
    } else if (shape === 'motor' || shape === 'generator') {
      const stator = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(2, 0.4, 16, 48), metal(0x4a5a6e, 0.4, 0.8)), [0, 0, 1.2]);
      stator.rotation.x = Math.PI / 2; stator.position.y = 2.2; stator.userData.basePos = stator.position.clone();
      const rotor = new THREE.Group();
      rotor.position.y = 2.2;
      const rotorCore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 32), metal(COLORS.steel, 0.25, 0.9));
      rotorCore.rotation.x = Math.PI / 2; rotor.add(rotorCore);
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2;
        const winding = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.7), metal(COLORS.copper, 0.3, 0.85));
        winding.position.set(Math.cos(angle) * 1.25, Math.sin(angle) * 1.25, 0);
        winding.rotation.z = angle;
        rotor.add(winding);
      }
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.5, 16), metal(0x9aa8b8, 0.2, 1));
      shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
      group.add(rotor);
      this.rotors.push(rotor);
      const base = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 3), metal(0x1a2636, 0.5, 0.7)), [0, -0.6, 0]);
      base.position.y = 0.15; base.userData.basePos = base.position.clone();
    } else if (shape === 'reed-switch' || shape === 'relay') {
      const housing = this._addPart(group, new THREE.Mesh(new RoundedBoxGeometry(4.5, 1.6, 2, 3, 0.1),
        new THREE.MeshPhysicalMaterial({ color: 0x8fb8d8, roughness: 0.1, metalness: 0, transmission: 0.7, transparent: true, opacity: 0.4 })), [0, 1, 0]);
      housing.position.y = 1.4; housing.userData.basePos = housing.position.clone();
      const reedMat = metal(0xb8c4d0, 0.2, 1);
      [-1, 1].forEach(side => {
        const reed = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.4), reedMat), [side * 0.8, 0.3, 0]);
        reed.position.set(side * 0.9, 1.4 + side * 0.08, 0); reed.rotation.z = side * -0.06;
        reed.userData.basePos = reed.position.clone();
        if (shape === 'relay') this.rotors.push(reed);
      });
      const coilGroup = new THREE.Group();
      coilGroup.position.set(0, 0.5, 0);
      this._buildCoilInto(coilGroup, { length: 3, radius: 0.5, turns: 12, core: false });
      group.add(coilGroup);
    } else if (shape === 'maglev') {
      const track = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 2.4), metal(0x2a3a4e, 0.4, 0.8)), [0, -0.5, 0]);
      track.position.y = 0.2; track.userData.basePos = track.position.clone();
      for (let i = -4; i <= 4; i += 1) {
        const coil = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 24), glow(COLORS.cyan, 0.6)), [0, -0.3, 0]);
        coil.rotation.x = Math.PI / 2; coil.position.set(i, 0.45, 0); coil.userData.basePos = coil.position.clone();
      }
      const floater = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.7, 1.8, 3, 0.15), paint(COLORS.north));
      floater.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.1, 1.82), glow(COLORS.cyan, 0.8));
      stripe.position.y = -0.3; floater.add(stripe);
      floater.position.y = 1.6;
      group.add(floater);
      this.maglevFloater = floater;
    } else if (shape === 'copper-coil') {
      this._buildCoilInto(group, { length: p.length / 10 || 4, radius: (p.diameter / 20) || 0.9, turns: Math.min(40, Math.max(4, p.turns / 10)), core: false });
    } else if (shape === 'generator-glass') {
      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fd8f0, roughness: 0.08, metalness: 0, transmission: 0.75, transparent: true, opacity: 0.32, thickness: 0.5, ior: 1.45 });
      const chamber = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 5.4, 48, 1, true), glassMat), [0, 1.4, 0]);
      chamber.position.y = 3.2; chamber.userData.basePos = chamber.position.clone();
      const rimMat = metal(0x8a949e, 0.3, 0.9);
      [-1, 1].forEach(side => {
        const rim = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.09, 12, 48), rimMat), [0, 1.2, 0]);
        rim.rotation.x = Math.PI / 2; rim.position.y = 3.2 + side * 2.7; rim.userData.basePos = rim.position.clone();
      });
      const base = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.4, 48), metal(0x1a2636, 0.5, 0.7)), [0, -0.6, 0]);
      base.position.y = 0.2; base.userData.basePos = base.position.clone();
      const coilTurns = Math.min(24, Math.max(6, Math.round((p.turns || 200) / 20)));
      const steps = coilTurns * 24;
      const coilPts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, angle = t * coilTurns * Math.PI * 2;
        coilPts.push(new THREE.Vector3(Math.cos(angle) * 1.95, 0.8 + t * 4.8, Math.sin(angle) * 1.95));
      }
      const coil = this._addPart(group, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), steps, 0.07, 8, false),
        new THREE.MeshStandardMaterial({ color: COLORS.copper, roughness: 0.3, metalness: 0.85, map: this.winding })), [0, 0, 0]);
      coil.userData.basePos = coil.position.clone();
      const rotor = new THREE.Group();
      rotor.position.y = 3.2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 12), metal(0xd8dee8, 0.2, 1));
      rotor.add(shaft);
      [-1, 1].forEach(side => {
        const half = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.4, 0.55, 2, 0.05), paint(side > 0 ? COLORS.north : COLORS.south));
        half.position.set(side * 0.48, 0, 1.0);
        rotor.add(half);
      });
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16), metal(0x6f87a1, 0.3, 0.9));
      axle.position.y = 2.35; rotor.add(axle);
      group.add(rotor);
      this.genRotor = rotor;
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else if (shape === 'mhd-thruster') {
      const channel = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 1.8), new THREE.MeshPhysicalMaterial({ color: 0x8fc8e8, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.4 })), [0, 0.8, 0]);
      channel.position.y = 1.4; channel.userData.basePos = channel.position.clone();
      const fluid = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.8, 1.4), glow(COLORS.cyan, 0.6)), [0, 0.8, 0]);
      fluid.position.y = 1.4; fluid.userData.basePos = fluid.position.clone();
      [-1, 1].forEach(side => {
        const electro = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 1.5), metal(COLORS.copper, 0.2, 0.9)), [0, side * 0.4, 0]);
        electro.position.set(0, 1.4 + side * 0.55, 0); electro.userData.basePos = electro.position.clone();
      });
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else if (shape === 'bifilar-resonator') {
      const base = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.2, 48), metal(0x1a2636, 0.4, 0.8)), [0, -0.4, 0]);
      base.position.y = 0.1; base.userData.basePos = base.position.clone();
      const spiralPts = [];
      for (let i = 0; i <= 360; i++) {
        const t = i / 360, angle = t * Math.PI * 2 * 12;
        const r = 0.3 + t * 2.2;
        spiralPts.push(new THREE.Vector3(Math.cos(angle) * r, 0.25, Math.sin(angle) * r));
      }
      const spiral = this._addPart(group, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 360, 0.05, 8), metal(COLORS.copper, 0.25, 0.9)), [0, 0, 0]);
      spiral.userData.basePos = spiral.position.clone();
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else if (shape === 'tokamak-fusion-ring') {
      const torus = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.9, 32, 64), glow(0xd96bff, 0.75)), [0, 1.2, 0]);
      torus.rotation.x = Math.PI / 2; torus.position.y = 2.0; torus.userData.basePos = torus.position.clone();
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const coil = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 16, 32), metal(0x35e6ff, 0.2, 0.9)), [0, 0, 0]);
        coil.position.set(Math.cos(angle) * 2.6, 2.0, Math.sin(angle) * 2.6);
        coil.rotation.y = -angle;
      }
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else if (shape === 'squid-quantum-sensor' || shape === 'superconducting') {
      const loop = this._addPart(group, new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 24, 64), glow(0x35e6ff, 0.9)), [0, 1, 0]);
      loop.rotation.x = Math.PI / 2; loop.position.y = 1.8; loop.userData.basePos = loop.position.clone();
      [-1, 1].forEach(side => {
        const junction = this._addPart(group, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), metal(COLORS.gold, 0.1, 1)), [side * 1.8, 0, 0]);
        junction.position.set(side * 1.8, 1.8, 0); junction.userData.basePos = junction.position.clone();
      });
      group.userData.poleAxis = new THREE.Vector3(0, 1, 0);
    } else {
      this._buildCoilInto(group, { length: p.length / 10 || 4, radius: (p.diameter / 20) || 0.9, turns: Math.min(40, Math.max(4, p.turns / 10)), core: p.core !== 'air' });
      if (shape === 'electromagnet') {
        const pole = this._addPart(group, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 32), metal(COLORS.steel, 0.25, 0.95)), [1.4, 0, 0]);
        pole.rotation.z = Math.PI / 2; pole.position.set((p.length / 10 || 4) / 2 + 0.3, 1, 0);
        pole.userData.basePos = pole.position.clone();
      }
    }
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.deviceGroup = group;
  }

  _buildLabels() {
    this._clearGroup(this.labelGroup);
    if (this.view === 'magnet' || this.view === 'field' || this.view === 'experiment') {
      const groups = this.pairGroups || this.modelGroup.children.filter(c => c.userData.magnetIndex !== undefined);
      groups.forEach((g, i) => {
        const axis = g.userData.poleAxis || new THREE.Vector3(1, 0, 0);
        const L = g.userData.length || 4;
        const flipped = g.rotation.y > 1;
        const dir = axis.clone().multiplyScalar(flipped ? -1 : 1);
        const center = g.position.clone();
        if (g.userData.horseshoe) {
          this._poleLabel(center.clone().add(new THREE.Vector3(-1.6, 3.4, 0)), 'S');
          this._poleLabel(center.clone().add(new THREE.Vector3(1.6, 3.4, 0)), 'N');
        } else {
          const offset = dir.clone().multiplyScalar(L / 2 + 0.5);
          this._poleLabel(center.clone().add(offset).add(new THREE.Vector3(0, axis.y ? 0.4 : 1.2, 0)), 'N');
          this._poleLabel(center.clone().sub(offset).add(new THREE.Vector3(0, axis.y ? -0.2 : 1.2, 0)), 'S');
        }
        if (this.params.twoMagnets || this.view === 'field') {
          const el = document.createElement('div');
          el.className = 'object-label'; el.textContent = `MAGNET ${i === 0 ? 'A' : 'B'}`;
          const obj = new CSS2DObject(el);
          obj.position.copy(center).add(new THREE.Vector3(0, 2.6, 0));
          this.labelGroup.add(obj);
        }
      });
    } else if (this.view === 'electro' && this.device) {
      const el = document.createElement('div');
      el.className = 'object-label'; el.textContent = this.device.name.toUpperCase();
      const obj = new CSS2DObject(el);
      obj.position.set(0, this.device.id === 'tesla-coil' ? 6.2 : 4.2, 0);
      this.labelGroup.add(obj);
    }
  }

  _poleLabel(position, pole) {
    const el = document.createElement('div');
    el.className = `pole-label ${pole === 'N' ? 'north' : 'south'}`;
    el.textContent = pole;
    const obj = new CSS2DObject(el);
    obj.position.copy(position);
    this.labelGroup.add(obj);
  }

  _computeSources() {
    const sources = [];
    const m = this.magnet;
    const strength = this.params.strength / 100;
    const tempFactor = m && m.br ? Physics.temperatureRemanence({
      br20: (m.br[0] + m.br[1]) / 2, temperature: this.params.temperature,
      coefficient: -0.0011, maxOperating: m.maxTemp || 80, curie: m.curie || 310
    }).br / ((m.br[0] + m.br[1]) / 2) : 1;
    const momentMag = m && m.br ? Physics.magneticMoment((m.br[0] + m.br[1]) / 2 * strength * tempFactor, this._magnetVolume(m)) : 8 * strength;
    if (this.view === 'magnet' || this.view === 'field' || this.view === 'experiment') {
      const groups = this.pairGroups || this.modelGroup.children.filter(c => c.userData.magnetIndex !== undefined);
      groups.forEach((g, i) => {
        const axis = (g.userData.poleAxis || new THREE.Vector3(1, 0, 0)).clone();
        if (g.rotation.y > 1) axis.negate();
        const pos = g.position.clone().multiplyScalar(CM);
        pos.y += 0.006;
        sources.push({ position: [pos.x, pos.y, pos.z], moment: [axis.x * momentMag, axis.y * momentMag, axis.z * momentMag], radius: 0.012, index: i });
      });
      if (!sources.length) sources.push({ position: [0, 0.006, 0], moment: [momentMag, 0, 0], radius: 0.012, index: 0 });
    } else if (this.view === 'electro' && this.device) {
      const p = this.deviceParams;
      const coreMu = p.core === 'iron' ? 800 : p.core === 'ferrite' ? 200 : 1;
      const field = Physics.magneticCircuitField({
        current: p.current * strength, turns: p.turns, coreLength: (p.length || 60) * 0.001,
        gap: (p.gap || 2) * 0.001, relativePermeability: coreMu, saturation: p.core === 'ferrite' ? 0.4 : 1.6
      }).field;
      const moment = field * 0.0004 / Physics.MU0;
      const axisY = ['tesla-coil', 'transformer', 'motor', 'generator', 'maglev'].includes(this.device.id);
      sources.push({ position: [0, axisY ? 0.025 : 0.012, 0], moment: axisY ? [0, moment, 0] : [moment, 0, 0], radius: 0.015, index: 0 });
    } else if (this.view === 'material' || this.view === 'alloy') {
      sources.push({ position: [0.038, 0.035, 0], moment: [0, -6 * strength, 0], radius: 0.01, index: 0 });
    }
    this.sources = sources;
    return sources;
  }

  _updateField() {
    const sources = this._computeSources();
    this._clearGroup(this.fieldGroup);
    this.fieldLines = [];
    const count = Math.round(this.params.density);
    const bounds = 0.22;
    sources.forEach((src, si) => {
      const moment = new THREE.Vector3(...src.moment);
      if (moment.lengthSq() < 1e-9) return;
      const axis = moment.clone().normalize();
      const perp = new THREE.Vector3(0, 1, 0);
      if (Math.abs(axis.dot(perp)) > 0.9) perp.set(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(axis, perp).normalize();
      const v = new THREE.Vector3().crossVectors(axis, u).normalize();
      const rings = Math.max(2, Math.round(count / 8));
      const perRing = Math.max(4, Math.round(count / rings));
      for (let r = 0; r < rings; r++) {
        const polar = 0.25 + (r / rings) * 1.1;
        for (let k = 0; k < perRing; k++) {
          const azimuth = (k / perRing) * Math.PI * 2 + si * 0.3;
          const dir = axis.clone().multiplyScalar(Math.cos(polar))
            .add(u.clone().multiplyScalar(Math.sin(polar) * Math.cos(azimuth)))
            .add(v.clone().multiplyScalar(Math.sin(polar) * Math.sin(azimuth))).normalize();
          const seed = new THREE.Vector3(...src.position).add(dir.clone().multiplyScalar(src.radius * 1.6));
          const pts = Physics.traceFieldLine([seed.x, seed.y, seed.z], sources, { step: 0.0035, maxSteps: 360, bounds, stopRadius: 0.006 });
          if (pts.length < 6) continue;
          const vecs = pts.map(p => new THREE.Vector3(p[0] / CM, p[1] / CM, p[2] / CM));
          const geo = new THREE.BufferGeometry().setFromPoints(vecs);
          const hue = si === 0 ? COLORS.cyan : COLORS.magenta;
          const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
          this.fieldGroup.add(line);
          this.fieldLines.push(vecs);
        }
      }
    });
    this._updateFlow();
    this._updateFilings(sources);
    this._updateHeatmap(sources);
  }

  _buildFlow() {
    const geo = new THREE.SphereGeometry(0.045, 6, 6);
    const mat = glow(COLORS.cyan, 0.9);
    this.flowMesh = new THREE.InstancedMesh(geo, mat, 600);
    this.flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flowMesh.count = 0;
    this.world.add(this.flowMesh);
    this.flowDummy = new THREE.Object3D();
  }

  _updateFlow() {
    const perLine = 2;
    const total = Math.min(600, this.fieldLines.length * perLine);
    this.flowMesh.count = total;
    this.flowData = [];
    for (let i = 0; i < total; i++) {
      this.flowData.push({ line: i % this.fieldLines.length, t: Math.random(), speed: 0.06 + Math.random() * 0.08 });
    }
  }

  _buildFilings() {
    const geo = new THREE.BoxGeometry(0.16, 0.025, 0.035);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6f87a1, roughness: 0.5, metalness: 0.8, emissive: 0x1a2f42, emissiveIntensity: 0.4 });
    this.filingsMesh = new THREE.InstancedMesh(geo, mat, 1400);
    this.filingsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.filingsMesh.visible = false;
    this.world.add(this.filingsMesh);
    this.filingDummy = new THREE.Object3D();
  }

  _updateFilings(sources) {
    let count = 0;
    const spacing = 0.55;
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(1, 0, 0);
    for (let x = -11; x <= 11; x += spacing) {
      for (let z = -8; z <= 8; z += spacing) {
        if (count >= 1400) break;
        const point = [x * CM, 0.004, z * CM];
        const B = Physics.fieldAt(point, sources);
        const mag = Math.hypot(B[0], B[1], B[2]);
        if (mag < 1e-5) continue;
        const dir = new THREE.Vector3(B[0], 0, B[2]);
        if (dir.lengthSq() < 1e-12) dir.set(1, 0, 0);
        dir.normalize();
        q.setFromUnitVectors(up, dir);
        this.filingDummy.position.set(x, 0.04, z);
        this.filingDummy.quaternion.copy(q);
        const s = Math.min(1.6, 0.5 + mag * 40);
        this.filingDummy.scale.set(s, 1, 1);
        this.filingDummy.updateMatrix();
        this.filingsMesh.setMatrixAt(count++, this.filingDummy.matrix);
      }
    }
    this.filingsMesh.count = count;
    this.filingsMesh.instanceMatrix.needsUpdate = true;
  }

  _buildHeatmap() {
    const geo = new THREE.PlaneGeometry(24, 18, 64, 48);
    geo.rotateX(-Math.PI / 2);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.heatmapMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.heatmapMesh.position.y = 0.025;
    this.heatmapMesh.visible = false;
    this.world.add(this.heatmapMesh);
  }

  _updateHeatmap(sources) {
    const pos = this.heatmapMesh.geometry.attributes.position;
    const col = this.heatmapMesh.geometry.attributes.color;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) * CM, z = pos.getZ(i) * CM;
      const B = Physics.fieldAt([x, 0.005, z], sources);
      const mag = Math.hypot(B[0], B[1], B[2]);
      const t = Math.min(1, Math.log10(1 + mag * 400) / 2.2);
      if (t < 0.33) c.setRGB(0.05, 0.2 + t * 2, 0.6 + t);
      else if (t < 0.66) c.setRGB((t - 0.33) * 2.4, 0.85, 1 - (t - 0.33) * 2);
      else c.setRGB(1, 0.85 - (t - 0.66) * 1.8, 0.2);
      col.setXYZ(i, c.r * t, c.g * t, c.b * t);
    }
    col.needsUpdate = true;
  }

  _applyDisplayMode() {
    const mode = this.params.displayMode;
    this.explodeTarget = mode === 'exploded' ? 1.4 : 0;
    const clipping = mode === 'cross-section' ? [this.clipPlane] : [];
    this.modelGroup.traverse(o => {
      if (o.isMesh && o.material && !o.userData.shared) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          m.clippingPlanes = clipping;
          m.wireframe = mode === 'wireframe';
          m.needsUpdate = true;
        });
      }
    });
    if (this.domainGroup) this.domainGroup.visible = mode === 'cross-section' || mode === 'exploded';
    this.renderer.shadowMap.needsUpdate = true;
  }

  _pointerDown(e) {
    this.lastInteraction = performance.now();
    if (!this.mounted) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [];
    this.draggables.forEach(g => g.traverse(o => { if (o.isMesh) meshes.push(o); }));
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length && (this.view === 'field' || this.view === 'experiment')) {
      let obj = hits[0].object;
      while (obj && obj.userData.magnetIndex === undefined && obj.parent) obj = obj.parent;
      if (obj && obj.userData.draggable) {
        this.dragging = obj;
        this.controls.enabled = false;
        this.canvas.setPointerCapture?.(e.pointerId);
        this.callbacks.onSelect?.(obj.userData.magnetIndex);
        e.preventDefault();
      }
    } else if (hits.length) {
      let obj = hits[0].object;
      while (obj && obj.userData.magnetIndex === undefined && obj.parent) obj = obj.parent;
      if (obj) this.callbacks.onSelect?.(obj.userData.magnetIndex ?? 0);
    }
  }

  _pointerMove(e) {
    if (!this.dragging || !this.mounted) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const target = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, target)) {
      target.x = THREE.MathUtils.clamp(target.x, -9, 9);
      target.z = THREE.MathUtils.clamp(target.z, -5, 5);
      const idx = this.dragging.userData.magnetIndex;
      const other = this.pairGroups?.[idx === 0 ? 1 : 0];
      if (other) {
        const minSep = (this.dragging.userData.length || 4) + 0.5;
        if (idx === 0) target.x = Math.min(target.x, other.position.x - minSep);
        else target.x = Math.max(target.x, other.position.x + minSep);
      }
      this.dragging.position.x = target.x;
      this.dragging.position.z = target.z;
      this._updateField();
      this._buildLabels();
      if (this.pairGroups) {
        const gap = Math.abs(this.pairGroups[1].position.x - this.pairGroups[0].position.x) * 10 - (this.pairGroups[0].userData.length || 4) * 10;
        this.callbacks.onDrag?.(Math.max(5, Math.round(gap)));
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  _pointerUp() {
    if (this.dragging) {
      this.dragging = null;
      this.controls.enabled = true;
    }
  }

  resetCamera(preset = 'default') {
    const presets = {
      default: [8, 5.5, 10], top: [0, 14, 0.01], front: [0, 3, 13], side: [13, 3, 0], close: [4.5, 3, 6]
    };
    const p = presets[preset] || presets.default;
    this.camera.position.set(...p);
    this.controls.target.set(0, this.device?.id === 'tesla-coil' ? 2.5 : 0.6, 0);
    this.controls.update();
    this.lastInteraction = performance.now();
  }

  randomize() {
    const hue = Math.random();
    this.fillLight.color.setHSL(0.75 + hue * 0.2, 0.8, 0.6);
    this.rimLight.color.setHSL(0.55 + hue * 0.1, 0.9, 0.55);
    this.camera.position.set(6 + Math.random() * 5, 4 + Math.random() * 3, 8 + Math.random() * 4);
    this.controls.update();
    this.renderer.shadowMap.needsUpdate = true;
  }

  orbitBy(dx, dy) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta -= dx;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy, 0.15, Math.PI * 0.9);
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.lastInteraction = performance.now();
  }

  zoomBy(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(len);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.lastInteraction = performance.now();
  }

  capture() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  _loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this._loop);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    if (!this.mounted) return;
    const paused = this.params.paused;
    this.controls.autoRotate = !paused && performance.now() - this.lastInteraction > 12000;
    this.controls.update();
    if (!paused) {
      const speed = this.params.speed;
      this.flowData.forEach((f, i) => {
        f.t = (f.t + delta * f.speed * speed) % 1;
        const line = this.fieldLines[f.line];
        if (!line) return;
        const idx = f.t * (line.length - 1);
        const a = line[Math.floor(idx)], b = line[Math.min(line.length - 1, Math.ceil(idx))];
        this.flowDummy.position.lerpVectors(a, b, idx % 1);
        const pulse = 0.7 + Math.sin(t * 4 + i) * 0.3;
        this.flowDummy.scale.setScalar(pulse);
        this.flowDummy.updateMatrix();
        this.flowMesh.setMatrixAt(i, this.flowDummy.matrix);
      });
      if (this.flowMesh.count) this.flowMesh.instanceMatrix.needsUpdate = true;
      this.rotors.forEach(r => { r.rotation.z += delta * speed * 1.5; });
      if (this.genRotor) this.genRotor.rotation.y += delta * speed * 2.4;
      if (this.maglevFloater) this.maglevFloater.position.y = 1.6 + Math.sin(t * speed * 1.2) * 0.15;
      if (this.probe) this.probe.position.y = Math.sin(t * speed) * 0.08;
      this.dust.rotation.y += delta * 0.01 * speed;
      if (this.teslaArcs) {
        this.arcTimer += delta * speed;
        if (this.arcTimer > 0.09) {
          this.arcTimer = 0;
          this._updateTeslaArcs(t);
        }
      }
      this.rings.children.forEach((r, i) => { r.material.opacity = 0.12 + Math.sin(t * 0.8 + i) * 0.05; });
    }
    this.explodeAmount = THREE.MathUtils.lerp(this.explodeAmount, this.explodeTarget, 0.08);
    this.parts.forEach(p => {
      if (p.userData.basePos && p.userData.explodeDir) {
        p.position.copy(p.userData.basePos).addScaledVector(p.userData.explodeDir, this.explodeAmount);
      }
    });
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  _updateTeslaArcs(t) {
    const positions = [];
    const p = this.deviceParams || {};
    const power = Math.max(0.15, ((p.voltage ?? 12) / 24) * ((p.current ?? 1) / 2));
    const arcCount = Math.max(1, Math.round((2 + Math.random() * 3) * Math.min(1.8, power)));
    for (let a = 0; a < arcCount; a++) {
      const angle = Math.random() * Math.PI * 2;
      const reach = (1.6 + Math.random() * 2.6) * Math.min(1.7, 0.4 + power);
      const end = new THREE.Vector3(Math.cos(angle) * reach, 0.3 + Math.random() * 1.5, Math.sin(angle) * reach);
      const start = this.teslaTop.clone();
      const segments = 10;
      let prev = start;
      for (let i = 1; i <= segments; i++) {
        const f = i / segments;
        const p = start.clone().lerp(end, f);
        p.x += (Math.random() - 0.5) * 0.5 * Math.sin(f * Math.PI);
        p.y += (Math.random() - 0.5) * 0.4 * Math.sin(f * Math.PI);
        p.z += (Math.random() - 0.5) * 0.5 * Math.sin(f * Math.PI);
        positions.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
      }
    }
    this.teslaArcs.geometry.dispose();
    this.teslaArcs.geometry = new THREE.BufferGeometry();
    this.teslaArcs.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.teslaArcs.material.opacity = 0.5 + Math.random() * 0.4;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this._resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.controls.dispose();
    this._clearGroup(this.modelGroup);
    this._clearGroup(this.fieldGroup);
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => m.dispose());
      }
    });
    this.envMap.dispose();
    this.renderer.dispose();
    this.unmount();
  }
}