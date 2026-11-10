import { MAGNETS, MATERIALS, DEVICES, EXPERIMENTS, ENCYCLOPEDIA, REFERENCES, THICKNESSES, CONCEPT_PROJECTS, getConceptCombination } from './modules/data.js';
import { CALCULATORS, QUIZ_QUESTIONS, recommendMagnet } from './modules/tools.js';
import { firebaseManager } from './modules/firebase.js';
import * as Physics from './modules/physics.js';
import { MagneticScene } from './modules/scene.js';
import { VoiceAgent, HandController, LabAudio } from './modules/input.js';
import * as Charts from './modules/charts.js';
import { icon, hydrateIcons, esc, toast, openInfo, download, debounce, bindRanges, referenceHtml, specRows, tags } from './modules/ui.js';

firebaseManager.init();

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const main = $('#mainContent');
const ROUTES = {
  home: { title: 'Overview', crumb: 'Overview' },
  concepts: { title: 'Concept Projects', crumb: 'Concept Projects & 1000+ Matrix' },
  magnets: { title: 'Magnet Explorer', crumb: 'Magnet Explorer' },
  materials: { title: 'Materials Database', crumb: 'Materials Database' },
  alloy: { title: 'Alloy Laboratory', crumb: 'Alloy Laboratory' },
  field: { title: 'Field Simulator', crumb: 'Field Simulator' },
  electro: { title: 'Electromagnetism', crumb: 'Electromagnetism' },
  experiments: { title: 'Experiments', crumb: 'Experiments' },
  tools: { title: 'Tools & Calculators', crumb: 'Physics Tools & Engineering Calculators' },
  quiz: { title: 'Physics Quiz Trainer', crumb: 'Interactive Knowledge Trainer' },
  encyclopedia: { title: 'Scientific Encyclopedia', crumb: 'Encyclopedia' },
  settings: { title: 'Settings', crumb: 'Settings' },
  privacy: { title: 'Privacy Policy', crumb: 'Privacy Policy' },
  terms: { title: 'Terms of Service', crumb: 'Terms of Service' }
};
const LAB_ROUTES = ['home', 'concepts', 'magnets', 'materials', 'alloy', 'field', 'electro', 'experiments'];

const defaultParams = {
  strength: 100, gap: 40, density: 24, speed: 1, fieldLines: true, filings: false,
  heatmap: false, labels: true, grid: true, displayMode: 'solid', light: 1,
  quality: 'high', paused: false, polarity: 'attract', temperature: 20, twoMagnets: false
};
const defaultSettings = { quality: 'high', audio: true, volume: 0.35, reduceMotion: false, voiceLang: 'en-US', speakResponses: true, gestureSensitivity: 0.55, mirror: true };

const state = {
  route: 'home',
  magnetId: MAGNETS[0]?.id || 'neodymium-bar',
  materialId: 'iron',
  deviceId: 'solenoid',
  experimentId: EXPERIMENTS[0]?.id,
  articleId: ENCYCLOPEDIA[0]?.id,
  conceptScrubberIndex: 1,
  conceptFilter: 'all',
  conceptQuery: '',
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  quizSelectedOption: null,
  wizardMaxTemp: 100,
  wizardMinBr: 1.0,
  wizardCorrosion: true,
  infoTab: 'overview',
  materialFilter: 'all',
  materialQuery: '',
  catalogQuery: '',
  params: { ...defaultParams },
  deviceParams: { ...(DEVICES.find(d => d.id === 'solenoid')?.defaults || {}) },
  alloy: { materialA: 'iron', materialB: 'copper', thicknessA: 5, thicknessB: 5 },
  settings: { ...defaultSettings }
};

try {
  const saved = JSON.parse(localStorage.getItem('magnetic-universe-settings') || '{}');
  Object.assign(state.settings, saved);
} catch { /* corrupted settings fall back to defaults */ }
state.params.quality = state.settings.quality;

const currentMagnet = () => MAGNETS.find(m => m.id === state.magnetId) || MAGNETS[0];
const currentMaterial = () => MATERIALS.find(m => m.id === state.materialId) || MATERIALS[0];
const currentDevice = () => DEVICES.find(d => d.id === state.deviceId) || DEVICES[0];
const currentExperiment = () => EXPERIMENTS.find(e => e.id === state.experimentId) || EXPERIMENTS[0];
const currentArticle = () => ENCYCLOPEDIA.find(a => a.id === state.articleId) || ENCYCLOPEDIA[0];
const currentConcept = () => getConceptCombination(state.conceptScrubberIndex);
const alloyMaterials = () => ({
  materialA: MATERIALS.find(m => m.id === state.alloy.materialA) || MATERIALS[0],
  materialB: MATERIALS.find(m => m.id === state.alloy.materialB) || MATERIALS[1],
  thicknessA: state.alloy.thicknessA,
  thicknessB: state.alloy.thicknessB
});

let chart = null;
const audio = new LabAudio();
audio.setEnabled(state.settings.audio);
audio.setVolume(state.settings.volume);

const scene = new MagneticScene({
  onReady: renderer => {
    try {
      const gl = renderer.getContext?.();
      if (gl) {
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        const name = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'WebGL';
        const el = $('#rendererStatus');
        if (el) el.textContent = `${renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL'} · ${String(name).slice(0, 24)}`;
      } else {
        const el = $('#rendererStatus');
        if (el) el.textContent = '3D Canvas Active';
      }
    } catch {
      const el = $('#rendererStatus');
      if (el) el.textContent = '3D Canvas Active';
    }
  },
  onSelect: index => {
    if (state.route === 'field' || state.route === 'experiments' || state.route === 'concepts') {
      toast(`Magnet ${index === 0 ? 'A' : 'B'} selected · drag to reposition`, 'info', 1800);
    }
  },
  onDrag: gap => {
    state.params.gap = gap;
    const slider = $('#ctrl-gap');
    if (slider) { slider.value = gap; slider.dispatchEvent(new Event('input', { bubbles: false })); }
    updateReadouts();
  }
});

const voice = new VoiceAgent({
  onCommand: text => runCommand(text),
  onStatus: (status, message) => {
    const st = $('#agentStatus'); if (st) st.textContent = message;
    const vb = $('#voiceBtn');
    if (vb) {
      vb.classList.toggle('listening', status === 'listening');
      vb.setAttribute('aria-pressed', String(status === 'listening'));
    }
    const lb = $('#listenBtn');
    if (lb) lb.innerHTML = status === 'listening' ? `${icon('pause')} Stop listening` : `${icon('mic')} Start listening`;
    if (status === 'unsupported' || status === 'error') {
      const vs = $('#voiceSupport'); if (vs) vs.textContent = message;
    }
  },
  onTranscript: (text, who) => addAgentMessage(text, who)
});
voice.lang = state.settings.voiceLang;
voice.speakEnabled = state.settings.speakResponses && state.settings.audio;

const hands = new HandController({
  video: $('#gestureVideo'),
  canvas: $('#gestureCanvas'),
  onStatus: (status, message) => {
    const gr = $('#gestureReadout'); if (gr) gr.textContent = message;
    const sc = $('#startCamera');
    if (sc) sc.innerHTML = status === 'active' || status === 'loading'
      ? `${icon('pause')} Stop camera`
      : `${icon('camera')} Enable camera`;
    if (status === 'error') toast(message, 'error', 5000);
  },
  onGesture: gesture => {
    if (gesture.name === 'palm') scene.orbitBy(-gesture.dx * 3.2, gesture.dy * 2.6);
    else if (gesture.name === 'pinch') scene.zoomBy(1 + gesture.dy * 2.4);
    else if (gesture.discrete) {
      if (gesture.name === 'fist') { setParam('paused', !state.params.paused); toast(state.params.paused ? 'Simulation paused' : 'Simulation resumed'); }
      if (gesture.name === 'victory') { scene.resetCamera(); toast('View reset'); }
      if (gesture.name === 'point') nextMagnet();
      if (gesture.name === 'thumbs-up') { setParam('fieldLines', !state.params.fieldLines); syncControls(); }
    }
  }
});
hands.sensitivity = state.settings.gestureSensitivity;

function saveSettings() {
  localStorage.setItem('magnetic-universe-settings', JSON.stringify(state.settings));
}

function applySettings() {
  document.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
  state.params.quality = state.settings.quality;
  scene.update({ quality: state.settings.quality });
  audio.setEnabled(state.settings.audio);
  audio.setVolume(state.settings.volume);
  voice.lang = state.settings.voiceLang;
  voice.speakEnabled = state.settings.speakResponses && state.settings.audio;
  hands.sensitivity = state.settings.gestureSensitivity;
  const transform = state.settings.mirror ? 'scaleX(-1)' : 'none';
  const gv = $('#gestureVideo'); if (gv) gv.style.transform = transform;
  const gc = $('#gestureCanvas'); if (gc) gc.style.transform = transform;
  updateAudioButton();
  saveSettings();
}

function updateAudioButton() {
  const btn = $('#audioBtn');
  if (btn) {
    btn.innerHTML = icon(state.settings.audio ? 'volume' : 'volumeOff');
    btn.setAttribute('aria-pressed', String(state.settings.audio));
    btn.setAttribute('aria-label', state.settings.audio ? 'Mute sound' : 'Unmute sound');
  }
}

function navigate(route, opts = {}) {
  if (!ROUTES[route]) return;
  state.route = route;
  if (opts.magnet) state.magnetId = opts.magnet;
  if (opts.material) state.materialId = opts.material;
  if (opts.device) { state.deviceId = opts.device; state.deviceParams = { ...currentDevice().defaults }; }
  if (opts.experiment) state.experimentId = opts.experiment;
  if (opts.article) state.articleId = opts.article;
  if (opts.concept) { loadConcept(opts.concept); }
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  firebaseManager.logEvent('page_view', { page_path: route });
  render();
  $('#sidebar')?.classList.remove('open');
  main.focus({ preventScroll: true });
}

function loadConcept(indexOrId) {
  const num = typeof indexOrId === 'number' ? indexOrId : Number(indexOrId) || 1;
  state.conceptScrubberIndex = Math.max(1, Math.min(10000, num));
  const c = getConceptCombination(state.conceptScrubberIndex);
  if (c.magnet) state.magnetId = c.magnet;
  if (c.material) state.materialId = c.material;
  if (c.device) { state.deviceId = c.device; if (c.deviceParams) state.deviceParams = { ...c.deviceParams }; }
  if (c.params) Object.assign(state.params, c.params);
  if (c.alloy) Object.assign(state.alloy, c.alloy);
  toast(`Loaded Concept #${c.conceptId || num}: ${c.title.slice(0, 42)}…`, 'success', 2200);
}

function slider(id, label, min, max, step, value, unit = '', param = null) {
  return `<div class="control-group">
    <div class="control-label"><label for="${id}">${esc(label)}</label><output id="${id}-out">${esc(value)}${esc(unit)}</output></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" ${param ? `data-param="${param}"` : ''} ${unit ? `data-unit="${esc(unit)}"` : ''} />
    <div class="range-extents"><span>${min}${esc(unit)}</span><span>${max}${esc(unit)}</span></div>
  </div>`;
}
function toggle(id, label, iconName, checked, param) {
  return `<div class="toggle-row"><label for="${id}">${icon(iconName)} ${esc(label)}</label>
    <span class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} data-param="${param}" /><i></i></span></div>`;
}
function select(id, label, options, value, param) {
  return `<div class="control-group"><div class="control-label"><label for="${id}">${esc(label)}</label></div>
    <div class="select-wrap"><select id="${id}" data-param="${param}">${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div></div>`;
}

function commonControls() {
  const p = state.params;
  return `
    ${slider('ctrl-strength', 'Magnetic strength', 10, 200, 1, p.strength, '%', 'strength')}
    ${slider('ctrl-density', 'Field line density', 8, 48, 2, p.density, '', 'density')}
    ${slider('ctrl-speed', 'Animation speed', 0, 3, 0.1, p.speed, '×', 'speed')}
    ${slider('ctrl-light', 'Studio lighting', 0.2, 2, 0.05, p.light, '×', 'light')}
    ${select('ctrl-display', 'Display mode', [['solid', 'Solid PBR'], ['cross-section', 'Cross-section'], ['exploded', 'Exploded view'], ['wireframe', 'Wireframe']], p.displayMode, 'displayMode')}
    ${toggle('ctrl-field', 'Field lines', 'field', p.fieldLines, 'fieldLines')}
    ${toggle('ctrl-filings', 'Iron filings', 'grid', p.filings, 'filings')}
    ${toggle('ctrl-heatmap', 'Flux heatmap', 'sun', p.heatmap, 'heatmap')}
    ${toggle('ctrl-labels', '3D labels', 'eye', p.labels, 'labels')}
    ${toggle('ctrl-grid', 'Grid & rings', 'grid', p.grid, 'grid')}
    ${select('ctrl-quality', 'Render quality', [['low', 'Performance'], ['medium', 'Balanced'], ['high', 'Full quality']], p.quality, 'quality')}
    <div class="control-actions">
      <button class="ghost-btn" id="resetLab">${icon('reset')} Reset</button>
      <button class="ghost-btn" id="randomizeLab">${icon('shuffle')} Randomize</button>
      <button class="ghost-btn" id="captureLab">${icon('camera')} Capture</button>
      <button class="primary-btn" id="exportLab">${icon('download')} Export</button>
    </div>
    <div class="control-note">Field lines use a dipole superposition approximation. Iron filings and heatmap are qualitative visualizations, not calibrated measurements.</div>`;
}

function fieldControls() {
  const p = state.params;
  return `
    ${slider('ctrl-gap', 'Pole-face gap', 5, 120, 1, p.gap, ' mm', 'gap')}
    ${select('ctrl-polarity', 'Facing poles', [['attract', 'N ↔ S · attraction'], ['repel', 'N ↔ N · repulsion']], p.polarity, 'polarity')}
    ${slider('ctrl-temperature', 'Temperature', -20, 300, 5, p.temperature, ' °C', 'temperature')}
    ${commonControls()}`;
}

function materialControls() {
  const m = currentMaterial();
  return `
    ${select('ctrl-material', 'Specimen material', MATERIALS.map(x => [x.id, x.name]), m.id, 'materialId')}
    ${slider('ctrl-thickness', 'Plate thickness', 0.5, 50, 0.5, state.alloy.thicknessA, ' mm', 'thickness')}
    <div class="control-group"><div class="control-label"><label for="ctrl-custom-thickness">Custom thickness</label><output id="ctrl-custom-thickness-out">${state.alloy.thicknessA} mm</output></div>
      <input type="number" id="ctrl-custom-thickness" min="0.1" max="200" step="0.1" value="${state.alloy.thicknessA}" style="width:100%;padding:8px 10px;border:1px solid var(--line-bright);border-radius:8px;background:var(--surface-2);font-size:11px;outline:none" /></div>
    ${slider('ctrl-strength', 'Probe magnet strength', 10, 200, 1, state.params.strength, '%', 'strength')}
    ${toggle('ctrl-heatmap', 'Flux heatmap', 'sun', state.params.heatmap, 'heatmap')}
    ${toggle('ctrl-field', 'Field lines', 'field', state.params.fieldLines, 'fieldLines')}
    ${toggle('ctrl-labels', '3D labels', 'eye', state.params.labels, 'labels')}
    ${toggle('ctrl-grid', 'Grid & rings', 'grid', state.params.grid, 'grid')}
    ${slider('ctrl-light', 'Studio lighting', 0.2, 2, 0.05, state.params.light, '×', 'light')}
    ${select('ctrl-display', 'Display mode', [['solid', 'Solid PBR'], ['cross-section', 'Cross-section'], ['exploded', 'Exploded view'], ['wireframe', 'Wireframe']], state.params.displayMode, 'displayMode')}
    <div class="control-actions"><button class="ghost-btn" id="resetLab">${icon('reset')} Reset</button><button class="ghost-btn" id="captureLab">${icon('camera')} Capture</button></div>
    <div class="control-note">Static attraction depends on grade, microstructure and geometry. Thickness alone does not guarantee stronger attraction. AC shielding uses a plane-wave skin-depth model.</div>`;
}

function alloyControls() {
  const a = state.alloy;
  const opts = MATERIALS.map(m => [m.id, m.name]);
  const thickOpts = THICKNESSES.map(t => [t, `${t} mm`]);
  return `
    ${select('ctrl-mat-a', 'Plate A material', opts, a.materialA, 'alloyA')}
    ${select('ctrl-thick-a', 'Plate A thickness', thickOpts, a.thicknessA, 'thickA')}
    ${select('ctrl-mat-b', 'Plate B material', opts, a.materialB, 'alloyB')}
    ${select('ctrl-thick-b', 'Plate B thickness', thickOpts, a.thicknessB, 'thickB')}
    ${slider('ctrl-strength', 'Probe magnet strength', 10, 200, 1, state.params.strength, '%', 'strength')}
    ${toggle('ctrl-heatmap', 'Flux heatmap', 'sun', state.params.heatmap, 'heatmap')}
    ${toggle('ctrl-field', 'Field lines', 'field', state.params.fieldLines, 'fieldLines')}
    ${toggle('ctrl-labels', '3D labels', 'eye', state.params.labels, 'labels')}
    ${slider('ctrl-light', 'Studio lighting', 0.2, 2, 0.05, state.params.light, '×', 'light')}
    ${select('ctrl-display', 'Display mode', [['solid', 'Solid PBR'], ['cross-section', 'Cross-section'], ['exploded', 'Exploded view'], ['wireframe', 'Wireframe']], state.params.displayMode, 'displayMode')}
    <div class="control-actions"><button class="ghost-btn" id="resetLab">${icon('reset')} Reset</button><button class="ghost-btn" id="randomizeLab">${icon('shuffle')} Randomize</button><button class="ghost-btn" id="captureLab">${icon('camera')} Capture</button><button class="primary-btn" id="exportLab">${icon('download')} Export</button></div>
    <div class="control-note">Mass uses nominal density × volume. Shielding values are AC plane-wave estimates; DC flux shunting depends on permeability and geometry and is shown qualitatively.</div>`;
}

function electroControls() {
  const d = currentDevice(), p = state.deviceParams;
  const isTesla = d.id === 'tesla-coil';
  return `
    ${slider('ctrl-voltage', 'Voltage', 0, isTesla ? 50 : 24, 0.5, p.voltage ?? 12, ' V', 'voltage')}
    ${slider('ctrl-current', 'Current', 0, isTesla ? 10 : 5, 0.1, p.current ?? 1, ' A', 'current')}
    ${slider('ctrl-turns', 'Coil turns', 10, 1000, 10, p.turns ?? 200, '', 'turns')}
    ${select('ctrl-core', 'Core material', [['air', 'Air core'], ['iron', 'Soft iron'], ['ferrite', 'Ferrite']], p.core ?? 'iron', 'core')}
    ${slider('ctrl-length', 'Coil length', 20, 200, 5, p.length ?? 60, ' mm', 'length')}
    ${slider('ctrl-diameter', 'Coil diameter', 10, 80, 1, p.diameter ?? 20, ' mm', 'diameter')}
    ${slider('ctrl-gap', 'Air gap', 0.5, 20, 0.5, p.gap ?? 2, ' mm', 'gap')}
    ${isTesla ? slider('ctrl-resonance', 'Resonant frequency', 50, 1000, 10, p.resonantFrequency ?? 250, ' kHz', 'resonantFrequency') : ''}
    ${isTesla ? slider('ctrl-q', 'Quality factor Q', 5, 150, 1, p.qualityFactor ?? 40, '', 'qualityFactor') : ''}
    ${slider('ctrl-speed', 'Animation speed', 0, 3, 0.1, state.params.speed, '×', 'speed')}
    ${toggle('ctrl-field', 'Field lines', 'field', state.params.fieldLines, 'fieldLines')}
    ${toggle('ctrl-labels', '3D labels', 'eye', state.params.labels, 'labels')}
    ${slider('ctrl-light', 'Studio lighting', 0.2, 2, 0.05, state.params.light, '×', 'light')}
    <div class="control-actions"><button class="ghost-btn" id="resetLab">${icon('reset')} Reset</button><button class="ghost-btn" id="randomizeLab">${icon('shuffle')} Randomize</button><button class="ghost-btn" id="captureLab">${icon('camera')} Capture</button><button class="primary-btn" id="exportLab">${icon('download')} Export</button></div>
    <div class="control-note">${isTesla ? 'Virtual Tesla coil: resonant air-core HF transformer. Arcs are illustrative. Real coils produce lethal RF voltages, ozone and EMI — never build one without qualified supervision.' : 'B estimate uses a magnetic-circuit model with saturation cap. Open cores have large demagnetizing fields; treat values as order-of-magnitude estimates.'}</div>`;
}

function controlsForRoute() {
  switch (state.route) {
    case 'concepts':
    case 'field': return fieldControls();
    case 'materials': return materialControls();
    case 'alloy': return alloyControls();
    case 'electro': return electroControls();
    case 'experiments': return experimentControls();
    default: return commonControls();
  }
}

function experimentControls() {
  const e = currentExperiment();
  if (e.view === 'electro' || e.number === 7 || e.number === 10) return electroControls();
  if (e.view === 'materials' || e.view === 'thickness' || e.number === 3 || e.number === 4 || e.number === 6) return materialControls();
  if (e.number === 9) return `${slider('ctrl-temperature', 'Temperature', -20, 400, 5, state.params.temperature, ' °C', 'temperature')}${commonControls()}`;
  return fieldControls();
}

function viewportHeader() {
  let eyebrow = 'SPECIMEN STUDIO', title = currentMagnet()?.name || 'Magnet';
  if (state.route === 'concepts') { const c = currentConcept(); eyebrow = `CONCEPT #${c.conceptId || state.conceptScrubberIndex}`; title = c.title; }
  if (state.route === 'field') { eyebrow = 'LIVE FIELD SIMULATION'; title = 'Two-magnet interaction'; }
  if (state.route === 'materials') { eyebrow = 'MATERIAL SPECIMEN'; title = currentMaterial()?.name || 'Material'; }
  if (state.route === 'alloy') { eyebrow = 'THICKNESS COMPARISON'; title = `${alloyMaterials().materialA.name} vs ${alloyMaterials().materialB.name}`; }
  if (state.route === 'electro') { eyebrow = 'ELECTROMAGNETIC DEVICE'; title = currentDevice()?.name || 'Device'; }
  if (state.route === 'experiments') { eyebrow = `EXPERIMENT ${String(currentExperiment()?.number || 1).padStart(2, '0')}`; title = currentExperiment()?.title || 'Experiment'; }
  return `<div class="viewport-header">
    <div>
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h2 id="specimenTitle">${esc(title)}</h2>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="ghost-btn small" id="viewBlueprintBtn">${icon('cube')} Blueprint & Parts</button>
      <span class="live-badge">REAL-TIME 3D</span>
    </div>
  </div>`;
}

function sceneHud() {
  return `<div class="scene-hud">
    <div class="scene-chip"><i></i> PBR · STUDIO 01</div>
    <div class="scene-readout"><span>REMANENCE <strong id="hudBr">—</strong></span><span>GAP <strong id="hudGap">—</strong></span><span>MODE <strong id="hudMode">SOLID</strong></span></div>
    <div class="scene-tools">
      <button class="icon-btn" id="pauseBtn" aria-label="${state.params.paused ? 'Resume' : 'Pause'} animation">${icon(state.params.paused ? 'play' : 'pause')}</button>
      <button class="icon-btn" id="fullscreenBtn" aria-label="Fullscreen viewport">${icon('expand')}</button>
      <button class="icon-btn" id="hudCapture" aria-label="Capture viewport">${icon('camera')}</button>
    </div>
    <div class="view-cube"><button data-view="top">TOP</button><button data-view="front">FRONT</button><button data-view="side">SIDE</button><button data-view="default">ISO</button></div>
    <div class="pole-legend"><span class="pole-n"><b>N</b>North</span><span class="pole-s"><b>S</b>South</span><span style="color:var(--cool)">│ 10 mm grid</span></div>
    <div class="scene-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</div>
  </div>`;
}

function magnetStrip() {
  return `<div class="specimen-strip" id="specimenStrip">${MAGNETS.map(m => `
    <button class="specimen-card ${m.id === state.magnetId ? 'active' : ''}" data-magnet="${esc(m.id)}">
      <span class="specimen-swatch" style="background:linear-gradient(135deg,${esc(m.color || '#397cff')}33,#0a1220);color:${esc(m.color || '#35e6ff')}">${icon(m.shape === 'horseshoe' ? 'magnet' : m.shape === 'ring' ? 'target' : m.shape === 'solenoid' || m.shape === 'superconducting' ? 'bolt' : 'cube')}</span>
      <strong>${esc(m.name)}</strong><small>${esc(m.family || m.material || '').toUpperCase()}</small>
    </button>`).join('')}</div>`;
}

function deviceStrip() {
  return `<div class="specimen-strip">${DEVICES.map(d => `
    <button class="specimen-card ${d.id === state.deviceId ? 'active' : ''}" data-device="${esc(d.id)}">
      <span class="specimen-swatch" style="background:linear-gradient(135deg,#d96bff22,#0a1220);color:var(--magenta)">${icon(d.id === 'tesla-coil' ? 'bolt' : d.id === 'motor' || d.id === 'generator' ? 'settings' : 'wave')}</span>
      <strong>${esc(d.name)}</strong><small>${esc(d.shape || d.id).toUpperCase()}</small>
    </button>`).join('')}</div>`;
}

function labWorkspace(strip = '') {
  return `<div class="workspace-grid">
    <section class="viewport-card">
      ${viewportHeader()}
      <div class="scene-host" id="sceneHost">${sceneHud()}</div>
      ${strip}
    </section>
    <aside class="control-panel" aria-label="Live laboratory controls">
      <div class="panel-heading"><h3>${icon('settings')} Lab controls</h3><span class="panel-live">● LIVE</span></div>
      <div class="control-body">${controlsForRoute()}</div>
      <div class="temp-status" id="tempStatus" hidden></div>
    </aside>
  </div>`;
}

function magnetDetail() {
  const m = currentMagnet();
  if (!m) return '';
  const tab = state.infoTab;
  const range = (r, unit) => r ? `${r[0]}–${r[1]} ${unit}` : '—';
  let body = '';
  if (tab === 'overview') {
    body = `<div class="prose"><p>${esc(m.description)}</p><p><strong>Composition:</strong> ${esc(m.composition)}</p></div>${tags(m.applications?.slice(0, 4) || [], 'cyan')}`;
  } else if (tab === 'specs') {
    body = specRows([
      ['Dimensions', m.dimensions?.display || 'Representative specimen'],
      ['Thickness', m.thickness ? `${m.thickness} mm` : '—'],
      ['Grade', m.grade || '—'],
      ['Remanence Br', range(m.br, 'T')],
      ['Coercivity Hcb', range(m.coercivity, 'kA/m')],
      ['Energy product', range(m.energy, 'kJ/m³')],
      ['Max operating temp', m.maxTemp != null ? `${m.maxTemp} °C` : '—'],
      ['Curie temperature', m.curie != null ? `${m.curie} °C` : '—'],
      ['Density', m.density ? `${m.density} g/cm³` : '—']
    ]);
  } else {
    body = `<div class="prose"><p><strong>Advantages</strong></p><ul style="padding-left:18px;margin:6px 0">${(m.advantages || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul><p><strong>Limitations</strong></p><ul style="padding-left:18px;margin:6px 0">${(m.limitations || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
  }
  return `<article class="info-card">
    <h3>${icon('magnet')} Specimen dossier</h3>
    <div class="info-tabs"><button class="info-tab ${tab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button><button class="info-tab ${tab === 'specs' ? 'active' : ''}" data-tab="specs">Specifications</button><button class="info-tab ${tab === 'apps' ? 'active' : ''}" data-tab="apps">Applications</button></div>
    ${body}
    <button class="ghost-btn small" style="margin-top:12px" data-refs="${esc((m.references || []).join(','))}">${icon('book')} References</button>
  </article>`;
}

function analysisCard() {
  const m = currentMagnet();
  const br = m?.br ? (m.br[0] + m.br[1]) / 2 * state.params.strength / 100 : null;
  const gapM = state.params.gap * 0.001;
  const radius = ((m?.dimensions?.diameter || m?.dimensions?.width || 20) / 2) * 0.001;
  const length = (m?.dimensions?.length || m?.dimensions?.height || 40) * 0.001;
  const B = br ? Physics.cylinderAxialField({ remanence: br, radius: Math.max(0.004, radius), length: Math.max(0.004, length), distance: gapM }) : null;
  const force = br ? Physics.contactForceEstimate({ remanence: br, area: Math.PI * radius * radius, gap: gapM, radius }) : null;
  return `<article class="info-card">
    <h3>${icon('field')} Field analysis</h3>
    <div class="metric-row">
      <div class="metric"><span>REMANENCE</span><strong id="metricBr">${br ? br.toFixed(2) + ' T' : '—'}</strong></div>
      <div class="metric"><span>AXIAL B @ GAP</span><strong id="metricB">${B != null ? Physics.formatField(B) : '—'}</strong></div>
      <div class="metric warn"><span>FORCE EST.</span><strong id="metricForce">${force ? force.force.toFixed(1) + ' N' : '—'}</strong></div>
    </div>
    <div class="chart-wrap"><canvas id="analysisChart" aria-label="Magnetic field analysis chart"></canvas></div>
    <div class="control-note" style="margin-top:10px">On-axis cylinder model and Maxwell-pressure upper bound. Real force depends on geometry, alignment, surface contact and steel saturation. Simulation estimate, not a measurement.</div>
  </article>`;
}

function experimentTeaser() {
  const e = EXPERIMENTS[Math.floor(Math.random() * EXPERIMENTS.length)] || EXPERIMENTS[0];
  return `<article class="info-card experiment-teaser">
    <span class="exp-number">EXPERIMENT ${String(e.number).padStart(2, '0')}</span>
    <h4>${esc(e.title)}</h4>
    <p>${esc(e.question)}</p>
    <div class="formula">${esc(e.formula)}</div>
    <button class="primary-btn small" data-run-experiment="${esc(e.id)}">${icon('play')} Run experiment</button>
    <button class="ghost-btn small" data-route="experiments">${icon('beaker')} All experiments</button>
  </article>`;
}

function discoveryCards() {
  return `<div class="discovery-grid">
    <button class="discovery-card" data-route="concepts">${icon('spark')}<h3>1000+ Concept Projects</h3><p>Explore Halbach arrays, Curie engines, Railguns, Quantum levitation, and scrub through 1000+ concept permutations.</p><span class="card-link">Open Concept Matrix ${icon('arrow')}</span></button>
    <button class="discovery-card" data-route="tools">${icon('calculator')}<h3>Engineering Tools</h3><p>Interactive Biot-Savart, Maxwell Stress, Lorentz Deflection, and Magnet Selection Wizard for makers.</p><span class="card-link">Open Tools & Calculators ${icon('arrow')}</span></button>
    <button class="discovery-card" data-route="quiz">${icon('check')}<h3>Physics Quiz Trainer</h3><p>Test your knowledge on magnetic domains, Lenz Law, Curie temperatures, and shielding effectiveness.</p><span class="card-link">Start Knowledge Quiz ${icon('arrow')}</span></button>
  </div>`;
}

function renderHome() {
  return `<section class="page-heading"><div><div class="eyebrow"><span class="status-dot"></span> VIRTUAL SCIENCE LABORATORY</div><h1>The invisible, <span class="accent">made visible.</span></h1><p>Explore magnets, metals, concept projects and electromagnetic devices in a live 3D laboratory. Every field line, force estimate and material property is labelled with its model and units.</p></div><div class="heading-actions"><button class="ghost-btn" data-route="concepts">${icon('spark')} Concept Projects</button><button class="primary-btn" id="headingVoice">${icon('mic')} Talk to the lab</button></div></section>
  ${labWorkspace(magnetStrip())}
  <div class="detail-grid">${magnetDetail()}${analysisCard()}${experimentTeaser()}</div>
  ${discoveryCards()}`;
}

function renderConcepts() {
  const c = currentConcept();
  const categories = ['all', 'FIELDS & SHIELDING', 'ENERGY & POWER', 'LEVITATION & BRAKING', 'PROPULSION & MOTORS', 'ADVANCED MATERIALS', 'QUANTUM & CRYOGENICS'];
  const filteredCurated = CONCEPT_PROJECTS.filter(cp => state.conceptFilter === 'all' || cp.category === state.conceptFilter);

  return `<section class="page-heading">
    <div>
      <div class="eyebrow"><span class="status-dot"></span> 1000+ PHYSICAL COMBINATIONS MATRIX</div>
      <h1>Concept Projects & <span class="accent">1000+ Permutations</span></h1>
      <p>Explore curated engineering concept projects or scrub through over 1000+ deterministic physical lab combinations. Select any concept to instantiate its parameters live in 3D.</p>
    </div>
    <div class="heading-actions">
      <button class="primary-btn" id="randomConceptBtn">${icon('shuffle')} Surprise Concept</button>
      <button class="ghost-btn" id="run1000Benchmark">${icon('spark')} Run 1000 Benchmark</button>
    </div>
  </section>

  <div class="concept-scrubber-card">
    <div class="scrubber-head">
      <div class="scrubber-title">
        <span class="badge-accent">COMBINATION #${c.conceptId || state.conceptScrubberIndex} OF 1000+ PERMUTATIONS</span>
        <h3>${esc(c.title)}</h3>
      </div>
      <div class="scrubber-controls">
        <button class="ghost-btn small" id="prevConceptBtn">${icon('arrow')} Prev</button>
        <div class="scrubber-input-wrap">
          <span>Concept #</span>
          <input type="number" id="conceptNumberInput" min="1" max="10000" value="${state.conceptScrubberIndex}" />
          <span>/ 1000+</span>
        </div>
        <button class="ghost-btn small" id="nextConceptBtn">Next ${icon('arrow')}</button>
        <button class="primary-btn small" id="runCurrentConceptBtn">${icon('play')} Run In 3D Studio</button>
      </div>
    </div>
    <div class="scrubber-range-wrap">
      <input type="range" id="conceptRangeScrubber" min="1" max="1000" value="${Math.min(1000, state.conceptScrubberIndex)}" style="width:100%" />
    </div>
    <div class="concept-summary-box">
      <p><strong>Setup:</strong> ${esc(c.setup)}</p>
      <p><strong>Physics:</strong> ${esc(c.physicsExplanation)}</p>
      <div class="formula">${esc(c.formula)}</div>
    </div>
  </div>

  ${labWorkspace(magnetStrip())}

  <div class="catalog-toolbar" style="margin-top:24px">
    <h3>Curated Concept Gallery (${CONCEPT_PROJECTS.length})</h3>
    <div class="filter-chips">
      ${categories.map(cat => `<button class="filter-chip ${state.conceptFilter === cat ? 'active' : ''}" data-concept-filter="${esc(cat)}">${esc(cat === 'all' ? 'All Concepts' : cat)}</button>`).join('')}
    </div>
  </div>

  <div class="concept-grid">
    ${filteredCurated.map(cp => `
      <article class="concept-card ${cp.number === c.number ? 'active' : ''}" data-run-concept="${cp.number}">
        <div class="concept-card-head">
          <span class="category-badge">${esc(cp.category)}</span>
          <span class="concept-num">#${cp.number}</span>
        </div>
        <h4>${esc(cp.title)}</h4>
        <p>${esc(cp.summary)}</p>
        <div class="formula small">${esc(cp.formula)}</div>
        <button class="primary-btn small" data-run-concept="${cp.number}">${icon('play')} Run Concept #${cp.number}</button>
      </article>
    `).join('')}
  </div>`;
}

function renderTools() {
  const wizardRecs = recommendMagnet({
    maxTemp: state.wizardMaxTemp,
    minBr: state.wizardMinBr,
    corrosionRisk: state.wizardCorrosion
  }).slice(0, 4);

  return `<section class="page-heading">
    <div>
      <div class="eyebrow">PHYSICS & ENGINEERING CALCULATORS</div>
      <h1>Tools & <span class="accent">Calculators</span></h1>
      <p>Interactive student physics calculators, magnet selection wizards, coil winder thermal tools, and shielding effectiveness estimators.</p>
    </div>
  </section>

  <div class="tool-grid">
    ${CALCULATORS.map(calc => {
      const defaultVals = calc.inputs.map(i => i.default);
      const res = calc.calculate(...defaultVals);
      return `
        <article class="tool-card" id="calc-card-${calc.id}">
          <h3>${icon('calculator')} ${esc(calc.name)}</h3>
          <p>${esc(calc.description)}</p>
          <div class="calc-inputs">
            ${calc.inputs.map(inp => {
              if (inp.type === 'select') {
                return `<div class="control-group"><label>${esc(inp.label)}</label>
                  <select class="calc-field" data-calc="${calc.id}" data-input="${inp.id}">${inp.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`;
              }
              return `<div class="control-group"><label>${esc(inp.label)}: <output id="out-${inp.id}">${inp.default}</output></label>
                <input type="range" class="calc-field" data-calc="${calc.id}" data-input="${inp.id}" min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${inp.default}" /></div>`;
            }).join('')}
          </div>
          <div class="calc-result" id="res-${calc.id}">${esc(res.text)}</div>
        </article>
      `;
    }).join('')}

    <!-- Magnet Selection Wizard -->
    <article class="tool-card" style="grid-column:1/-1">
      <h3>${icon('spark')} Magnet Selection Wizard for Engineers & Makers</h3>
      <p>Select your operating conditions to receive ranked magnet recommendations with temperature and corrosion warnings.</p>
      <div class="workspace-grid" style="grid-template-columns:300px 1fr;gap:20px;margin-top:12px">
        <div class="control-body">
          ${slider('wiz-temp', 'Operating Temp (°C)', 20, 500, 10, state.wizardMaxTemp, ' °C')}
          ${slider('wiz-br', 'Min Remanence Br (T)', 0.2, 1.5, 0.1, state.wizardMinBr, ' T')}
          ${toggle('wiz-corrosion', 'Humid/Corrosive Environment', 'shield', state.wizardCorrosion, 'corrosion')}
        </div>
        <div class="spec-table">
          ${wizardRecs.map((r, i) => `
            <div class="spec-row" style="padding:12px;background:var(--surface-2);margin-bottom:8px;border-radius:10px">
              <div>
                <strong style="font-size:14px;color:var(--text)">#${i + 1} ${esc(r.magnet.name)}</strong>
                <p style="font-size:11px;color:var(--cool);margin:4px 0">${esc(r.magnet.strength)}</p>
                ${r.reasons.length ? `<small style="color:var(--amber)">⚠️ ${r.reasons.join(' ')}</small>` : '<small style="color:var(--success)">✓ Excellent match</small>'}
              </div>
              <span class="badge-accent" style="font-size:12px;color:var(--cyan)">Score ${r.score}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  </div>`;
}

function renderQuiz() {
  const q = QUIZ_QUESTIONS[state.quizIndex] || QUIZ_QUESTIONS[0];
  const isFinished = state.quizIndex >= QUIZ_QUESTIONS.length;

  if (isFinished) {
    return `<section class="page-heading"><div><div class="eyebrow">QUIZ COMPLETE</div><h1>Knowledge Trainer <span class="accent">Results</span></h1></div></section>
      <div class="quiz-card" style="text-align:center">
        <h2>🎉 Quiz Completed!</h2>
        <p style="font-size:18px;color:var(--cyan)">Your Final Score: <strong>${state.quizScore} / ${QUIZ_QUESTIONS.length}</strong> (${Math.round((state.quizScore / QUIZ_QUESTIONS.length) * 100)}%)</p>
        <div class="heading-actions" style="justify-content:center;margin-top:20px">
          <button class="primary-btn" id="restartQuizBtn">${icon('reset')} Restart Quiz</button>
          <button class="ghost-btn" data-route="encyclopedia">${icon('book')} Read Physics Encyclopedia</button>
        </div>
      </div>`;
  }

  return `<section class="page-heading">
    <div>
      <div class="eyebrow">INTERACTIVE KNOWLEDGE TRAINER</div>
      <h1>Physics <span class="accent">Quiz</span></h1>
      <p>Test your understanding of magnetic domains, Curie temperature, eddy currents, and Maxwell stress.</p>
    </div>
  </section>

  <div class="quiz-card">
    <div class="quiz-header">
      <span class="badge-accent">QUESTION ${state.quizIndex + 1} OF ${QUIZ_QUESTIONS.length}</span>
      <span class="badge-accent" style="color:var(--amber)">Score: ${state.quizScore}</span>
    </div>
    <div class="quiz-question">${esc(q.question)}</div>
    <div class="quiz-options">
      ${q.options.map((opt, i) => {
        let cls = '';
        if (state.quizAnswered) {
          if (i === q.correct) cls = 'correct';
          else if (i === state.quizSelectedOption) cls = 'wrong';
        }
        return `<button class="quiz-option ${cls}" data-quiz-option="${i}"><b>${String.fromCharCode(65 + i)}.</b> ${esc(opt)}</button>`;
      }).join('')}
    </div>
    ${state.quizAnswered ? `
      <div class="quiz-explanation">
        <strong>${state.quizSelectedOption === q.correct ? '✓ Correct!' : '❌ Incorrect.'}</strong> ${esc(q.explanation)}
      </div>
      <button class="primary-btn" id="nextQuizBtn" style="margin-top:10px">${icon('arrow')} Next Question</button>
    ` : ''}
  </div>`;
}

function renderPrivacy() {
  return `<section class="page-heading"><div><div class="eyebrow">LEGAL DOCUMENTATION</div><h1>Privacy Policy</h1><p>Official privacy policy for https://magnetic-field-ecru.vercel.app/</p></div></section>
  <article class="legal-article">
    <h2>1. Overview</h2>
    <p>Magnetic Universe 3D (hosted at https://magnetic-field-ecru.vercel.app/) respects your privacy. This application operates primarily client-side in your browser.</p>
    <h2>2. Camera & Hand Gesture Processing</h2>
    <p>When you enable Hand Gesture Control, camera frames are processed 100% locally in your browser memory using MediaPipe Hand Landmarker. No video, camera images, or biometric data are ever stored, uploaded, or transmitted to external servers.</p>
    <h2>3. Speech & Voice Agent</h2>
    <p>Voice recognition utilizes your browser's native Web Speech API. Audio is processed locally or via your device's operating system speech provider.</p>
    <h2>4. Analytics & Monitization</h2>
    <p>We use Firebase Analytics and compliant AdMob/AdSense banner placeholders to evaluate lab performance and support hosting costs. Non-personally identifiable usage statistics (e.g. page views) may be logged.</p>
    <h2>5. Local Storage</h2>
    <p>Your lab settings, audio preferences, and saved workspace configurations are saved locally on your device in HTML5 localStorage.</p>
  </article>`;
}

function renderTerms() {
  return `<section class="page-heading"><div><div class="eyebrow">LEGAL DOCUMENTATION</div><h1>Terms of Service</h1><p>Terms of service and safety disclaimers for https://magnetic-field-ecru.vercel.app/</p></div></section>
  <article class="legal-article">
    <h2>1. Simulation & Educational Disclaimer</h2>
    <p>Magnetic Universe 3D is an educational and research simulation tool. All magnetic field strength values, force estimates, and skin-depth calculations are model approximations and do not constitute calibrated hardware guarantees.</p>
    <h2>2. Safety Disclaimers</h2>
    <p>Real neodymium magnets present pinch hazards and can shatter. Real high-voltage Tesla coils produce lethal RF voltages, ozone, and UV radiation. Never operate real high-voltage or powerful magnetic hardware without qualified supervision.</p>
    <h2>3. Acceptable Use</h2>
    <p>You may use this application for personal, educational, research, and non-commercial learning. Modification or redistribution of underlying source code is subject to repository licensing terms.</p>
  </article>`;
}

function renderMagnets() {
  return `<section class="page-heading"><div><div class="eyebrow">SPECIMEN CATALOG · ${MAGNETS.length} MODELS</div><h1>Magnet <span class="accent">Explorer</span></h1><p>Rotate, zoom, explode and cross-section permanent magnets, electromagnets and superconducting coils. Select a specimen below to load it into the studio.</p></div><div class="heading-actions"><button class="ghost-btn" id="headingRefs">${icon('book')} Data sources</button></div></section>
  ${labWorkspace(magnetStrip())}
  <div class="detail-grid">${magnetDetail()}${analysisCard()}${experimentTeaser()}</div>`;
}

function renderField() {
  const m = currentMagnet();
  return `<section class="page-heading"><div><div class="eyebrow"><span class="status-dot"></span> LIVE DIPOLE SUPERPOSITION</div><h1>Magnetic Field <span class="accent">Simulator</span></h1><p>Drag either magnet in the viewport to reposition it. Field lines, iron filings and the flux heatmap update live. Switch facing poles to compare attraction and repulsion.</p></div><div class="heading-actions"><button class="ghost-btn" id="headingRefs">${icon('info')} Model assumptions</button></div></section>
  ${labWorkspace(magnetStrip())}
  <div class="detail-grid">
    <article class="info-card"><h3>${icon('field')} Interaction readout</h3>
      <div class="metric-row"><div class="metric"><span>FACING</span><strong id="metricPolarity">${state.params.polarity === 'repel' ? 'N ↔ N' : 'N ↔ S'}</strong></div><div class="metric"><span>GAP</span><strong id="metricGap">${state.params.gap} mm</strong></div><div class="metric ${state.params.polarity === 'repel' ? 'danger' : ''}"><span>REGIME</span><strong id="metricRegime">${state.params.polarity === 'repel' ? 'REPULSION' : 'ATTRACTION'}</strong></div></div>
      <div class="prose"><p>Like poles repel; unlike poles attract. In the far field the coaxial force scales approximately as <strong>1/r⁴</strong> for two dipoles, not 1/r². Near contact, geometry and saturation dominate and the dipole model breaks down.</p><p>Field lines emerge from the north pole and enter the south pole outside the magnet. Inside the magnet they continue from south to north, forming closed loops — magnetic monopoles have never been observed.</p></div>
      <div class="formula">F ≈ 3μ₀m₁m₂ / (2πr⁴) · far-field coaxial dipoles</div>
      <button class="ghost-btn small" data-refs="${esc((m?.references || []).join(','))}">${icon('book')} References</button>
    </article>
    ${analysisCard()}
    <article class="info-card experiment-teaser"><span class="exp-number">TRY THIS</span><h4>Flip the right magnet</h4><p>Set facing poles to N ↔ N and watch the field lines bow outward between the magnets instead of connecting. Then drag magnet B closer and observe the repulsive regime.</p><button class="primary-btn small" id="flipPolarity">${icon('shuffle')} Flip polarity</button><button class="ghost-btn small" data-run-experiment="${esc(EXPERIMENTS.find(x => x.number === 1)?.id || '')}">${icon('play')} Guided experiment</button></article>
  </div>`;
}

function materialCard(m) {
  return `<button class="material-card ${m.id === state.materialId ? 'active' : ''}" data-material="${esc(m.id)}">
    <div class="material-card-head"><span class="material-orb" style="background:radial-gradient(circle at 32% 30%,#ffffff55,${esc(m.color || '#8a949e')} 55%,#00000088)"></span><div><strong>${esc(m.name)}</strong><small>${esc(m.composition?.slice(0, 34) || '')}</small></div></div>
    <span class="category-badge ${esc(m.category)}">${m.category === 'ferromagnetic' ? 'FERROMAGNETIC' : m.category === 'conditional' ? 'CONDITION-DEPENDENT' : 'NON-FERROMAGNETIC'}</span>
    <p>${esc(m.magnetic?.explanation || m.magnetic?.behavior || '')}</p>
  </button>`;
}

function renderMaterials() {
  const m = currentMaterial();
  const filtered = MATERIALS.filter(x => (state.materialFilter === 'all' || x.category === state.materialFilter) && (!state.materialQuery || (x.name + x.composition).toLowerCase().includes(state.materialQuery.toLowerCase())));
  return `<section class="page-heading"><div><div class="eyebrow">MATERIALS DATABASE · ${MATERIALS.length} RECORDS</div><h1>Metals & <span class="accent">Alloys</span></h1><p>Stainless steel is not always non-magnetic. Its response depends on grade, microstructure, cold work and processing. Select a specimen to inspect it in 3D.</p></div></section>
  ${labWorkspace('')}
  <div class="catalog-toolbar" style="margin-top:18px">
    <div class="catalog-search">${icon('search')}<input id="materialSearch" type="search" placeholder="Search materials…" value="${esc(state.materialQuery)}" /></div>
    <div class="filter-chips">
      <button class="filter-chip ${state.materialFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
      <button class="filter-chip ${state.materialFilter === 'ferromagnetic' ? 'active' : ''}" data-filter="ferromagnetic">Ferromagnetic</button>
      <button class="filter-chip ${state.materialFilter === 'conditional' ? 'active' : ''}" data-filter="conditional">Condition-dependent</button>
      <button class="filter-chip ${state.materialFilter === 'nonferromagnetic' ? 'active' : ''}" data-filter="nonferromagnetic">Non-ferromagnetic</button>
    </div>
  </div>
  <div class="material-grid">${filtered.map(materialCard).join('') || '<div class="empty-state">No materials match this filter.</div>'}</div>
  <div class="detail-grid" style="grid-template-columns:1fr 1fr">
    <article class="info-card"><h3>${icon('layers')} ${esc(m.name)} — properties</h3>
      ${specRows([
        ['Composition', m.composition],
        ['Density', m.density ? `${m.density[0]}–${m.density[1]} g/cm³` : '—'],
        ['Hardness', m.hardness],
        ['Conductivity', m.conductivity ? `${m.conductivity[0]}–${m.conductivity[1]} MS/m` : 'See notes'],
        ['Magnetic behaviour', m.magnetic?.behavior],
        ['Relative permeability', m.magnetic?.relativePermeability],
        ['Corrosion resistance', m.corrosion]
      ])}
      <button class="ghost-btn small" style="margin-top:12px" data-refs="${esc((m.references || []).join(','))}">${icon('book')} References</button>
    </article>
    <article class="info-card"><h3>${icon('info')} Magnetic response & use</h3>
      <div class="prose"><p>${esc(m.magnetic?.explanation || '')}</p><p><strong>Applications:</strong> ${(m.applications || []).map(esc).join(', ')}</p><p><strong>Advantages:</strong> ${(m.advantages || []).map(esc).join('; ')}</p><p><strong>Disadvantages:</strong> ${(m.disadvantages || []).map(esc).join('; ')}</p></div>
      ${tags([m.category === 'ferromagnetic' ? 'Strongly attracted' : m.category === 'conditional' ? 'Grade / processing dependent' : 'Weak para/diamagnetic response'], m.category === 'ferromagnetic' ? 'cyan' : m.category === 'conditional' ? 'amber' : 'magenta')}
    </article>
  </div>`;
}

function renderAlloy() {
  const a = alloyMaterials();
  const massA = Physics.plateMass({ density: ((a.materialA.density?.[0] || 7.8) + (a.materialA.density?.[1] || 7.8)) / 2 * 1000, area: 0.06 * 0.04, thickness: a.thicknessA * 0.001 });
  const massB = Physics.plateMass({ density: ((a.materialB.density?.[0] || 7.8) + (a.materialB.density?.[1] || 7.8)) / 2 * 1000, area: 0.06 * 0.04, thickness: a.thicknessB * 0.001 });
  return `<section class="page-heading"><div><div class="eyebrow">THICKNESS & MATERIAL COMPARISON</div><h1>Alloy <span class="accent">Laboratory</span></h1><p>Compare two plates side by side. Change material and thickness to see mass, flux distribution and AC shielding behaviour. Increasing thickness does not always increase magnetic attraction.</p></div></section>
  ${labWorkspace('')}
  <div class="detail-grid" style="grid-template-columns:1fr 1fr">
    <article class="info-card"><h3>${icon('layers')} Comparison readout</h3>
      <div class="metric-row"><div class="metric"><span>PLATE A MASS</span><strong id="metricMassA">${(massA * 1000).toFixed(1)} g</strong></div><div class="metric"><span>PLATE B MASS</span><strong id="metricMassB">${(massB * 1000).toFixed(1)} g</strong></div><div class="metric warn"><span>Δ MASS</span><strong id="metricMassDelta">${((massA - massB) * 1000).toFixed(1)} g</strong></div></div>
      ${specRows([
        ['Plate A', `${a.materialA.name} · ${a.thicknessA} mm · ${a.materialA.category}`],
        ['Plate B', `${a.materialB.name} · ${a.thicknessB} mm · ${a.materialB.category}`],
        ['Static attraction', a.materialA.category === 'ferromagnetic' ? 'A strongly attracted' : a.materialA.category === 'conditional' ? 'A depends on grade/work' : 'A weakly responded',],
        ['Shielding (DC)', 'Flux shunting if high μ; geometry-dependent'],
        ['Shielding (AC)', 'Eddy currents + skin depth; see chart'],
        ['Eddy currents', 'Stronger in high-conductivity plates (Cu, Al)']
      ])}
      <div class="control-note" style="margin-top:10px">Austenitic stainless (304/316) may become weakly magnetic after cold work. Ferritic/martensitic grades are magnetic. Duplex 2205 is magnetic due to its ferrite fraction.</div>
    </article>
    <article class="info-card"><h3>${icon('field')} Mass vs thickness</h3><div class="chart-wrap" style="height:220px"><canvas id="analysisChart"></canvas></div><div class="control-note" style="margin-top:10px">Mass of a 60 × 40 mm plate using nominal density. Shielding transmission is an AC plane-wave estimate, not a DC guarantee.</div></article>
  </div>`;
}

function renderElectro() {
  const d = currentDevice(), p = state.deviceParams;
  const isTesla = d.id === 'tesla-coil';
  const coreMu = p.core === 'iron' ? 800 : p.core === 'ferrite' ? 200 : 1;
  const circuit = Physics.magneticCircuitField({ current: p.current || 0, turns: p.turns || 1, coreLength: (p.length || 60) * 0.001, gap: (p.gap || 2) * 0.001, relativePermeability: coreMu, saturation: p.core === 'ferrite' ? 0.4 : 1.6 });
  const solenoid = Physics.finiteSolenoidField({ current: p.current || 0, turns: p.turns || 1, length: (p.length || 60) * 0.001, radius: (p.diameter || 20) * 0.001 / 2 });
  return `<section class="page-heading"><div><div class="eyebrow">ELECTROMAGNETISM LAB · ${DEVICES.length} DEVICES</div><h1>Coils, Cores & <span class="accent">Current</span></h1><p>Change voltage, current, turns, core and geometry. Field estimates update live. Tesla coils are resonant air-core HF transformers — not DC solenoids.</p></div></section>
  ${labWorkspace(deviceStrip())}
  <div class="detail-grid" style="grid-template-columns:1fr 1fr">
    <article class="info-card"><h3>${icon('bolt')} ${esc(d.name)} — physics</h3>
      <div class="metric-row">
        <div class="metric"><span>CIRCUIT B</span><strong id="metricCircuit">${Physics.formatField(circuit.field)}</strong></div>
        <div class="metric"><span>AIR-CORE B</span><strong id="metricSolenoid">${Physics.formatField(solenoid)}</strong></div>
        <div class="metric ${circuit.saturated ? 'danger' : ''}"><span>SATURATION</span><strong id="metricSat">${circuit.saturated ? 'LIMITED' : 'LINEAR'}</strong></div>
      </div>
      <div class="prose"><p>${esc(d.description)}</p><p>${esc(d.physics)}</p></div>
      <div class="formula">${esc(d.formula)}</div>
      ${tags(d.applications || [], 'cyan')}
      <button class="ghost-btn small" style="margin-top:12px" data-refs="${esc((d.references || []).join(','))}">${icon('book')} References</button>
    </article>
    <article class="info-card"><h3>${icon('field')} ${isTesla ? 'Resonant response' : 'Field vs current'}</h3>
      <div class="chart-wrap" style="height:220px"><canvas id="analysisChart"></canvas></div>
      <div class="control-note" style="margin-top:10px">${isTesla ? 'Ideal series RLC response. Real Tesla coils involve streamer loading, coupling, spark gaps or SSTC/DRSSTC drivers, and hazardous RF voltages. Arcs in the viewport are illustrative.' : 'Magnetic-circuit estimate assumes a closed-ish core path with an air gap. Open cores have large demagnetizing factors; finite air-core solenoid shown for comparison.'}</div>
      ${isTesla ? `<div class="result-box" style="margin-top:12px;border-color:rgba(255,93,108,.35);background:rgba(255,93,108,.06)"><strong style="color:var(--danger)">HIGH-VOLTAGE SAFETY</strong>Real Tesla coils produce lethal RF burns, ozone, UV and electromagnetic interference. Keep electronics and pacemakers away. This is a visual simulation only.</div>` : ''}
    </article>
  </div>`;
}

function renderExperiments() {
  const e = currentExperiment();
  return `<section class="page-heading"><div><div class="eyebrow">GUIDED INVESTIGATIONS · ${EXPERIMENTS.length} EXPERIMENTS</div><h1>Experiment <span class="accent">Mode</span></h1><p>Each experiment loads a live setup, a procedure and a scientific explanation. Change the controls and observe the result.</p></div></section>
  <div class="experiment-layout">
    <div class="experiment-list">${EXPERIMENTS.map(x => `<button class="experiment-item ${x.id === e.id ? 'active' : ''}" data-experiment="${esc(x.id)}"><span class="num">${String(x.number).padStart(2, '0')}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.question)}</small></div></button>`).join('')}</div>
    <div class="experiment-detail">
      <div class="experiment-banner"><div class="eyebrow">EXPERIMENT ${String(e.number).padStart(2, '0')} · ${esc(e.view).toUpperCase()}</div><h2>${esc(e.title)}</h2><p>${esc(e.setup)}</p></div>
      ${labWorkspace('')}
      <div class="detail-grid" style="grid-template-columns:1fr 1fr">
        <article class="info-card"><h3>${icon('beaker')} Procedure & explanation</h3>
          <div class="steps">${(e.procedure || []).map((s, i) => `<div class="step"><b>${i + 1}.</b><span>${esc(s)}</span></div>`).join('')}</div>
          <div class="prose"><p>${esc(e.explanation)}</p></div>
          <div class="formula">${esc(e.formula)}</div>
          <button class="ghost-btn small" data-refs="${esc((e.references || []).join(','))}">${icon('book')} References</button>
        </article>
        <article class="info-card"><h3>${icon('check')} Expected result</h3>
          <div class="result-box"><strong>OBSERVATION</strong>${esc(e.result)}</div>
          <div class="chart-wrap" style="height:180px;margin-top:14px"><canvas id="analysisChart"></canvas></div>
        </article>
      </div>
    </div>
  </div>`;
}

function renderEncyclopedia() {
  const a = currentArticle();
  return `<section class="page-heading"><div><div class="eyebrow">SCIENTIFIC ENCYCLOPEDIA · ${ENCYCLOPEDIA.length} ENTRIES</div><h1>The physics <span class="accent">behind it</span></h1><p>Domains, flux, hysteresis, Curie temperature, eddy currents, superconductivity and Tesla coils — with formulas and references.</p></div></section>
  <div class="encyclopedia-layout">
    <div class="article-list">${ENCYCLOPEDIA.map(x => `<button class="article-item ${x.id === a.id ? 'active' : ''}" data-article="${esc(x.id)}"><small>${esc(x.category).toUpperCase()}</small><strong>${esc(x.title)}</strong></button>`).join('')}</div>
    <article class="article-reader"><span class="article-category">${esc(a.category).toUpperCase()}</span><h2>${esc(a.title)}</h2><div class="prose">${a.body.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</div><div class="formula">${esc(a.formula)}</div><h3 style="font-family:var(--font-display);font-size:14px;margin-top:20px">References</h3>${referenceHtml(a.references, REFERENCES)}</article>
  </div>`;
}

function renderSettings() {
  const s = state.settings;
  return `<section class="page-heading"><div><div class="eyebrow">LABORATORY PREFERENCES</div><h1>Settings</h1><p>Rendering, audio, voice and hand-control preferences are stored locally in your browser.</p></div></section>
  <div class="settings-grid">
    <div class="settings-card"><h3>${icon('settings')} Rendering</h3>
      <div class="settings-row"><div class="settings-label"><strong>Render quality</strong><small>Pixel-ratio cap and shadow fidelity</small></div><div class="select-wrap"><select data-setting="quality"><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Performance</option><option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Balanced</option><option value="high" ${s.quality === 'high' ? 'selected' : ''}>Full quality</option></select></div></div>
      <div class="settings-row"><div class="settings-label"><strong>Reduce motion</strong><small>Disable ambient drift and entrance animation</small></div><span class="switch"><input type="checkbox" data-setting="reduceMotion" ${s.reduceMotion ? 'checked' : ''} /><i></i></span></div>
    </div>
    <div class="settings-card"><h3>${icon('volume')} Audio</h3>
      <div class="settings-row"><div class="settings-label"><strong>Lab sound</strong><small>Ambient field hum, UI clicks, Tesla crackle</small></div><span class="switch"><input type="checkbox" data-setting="audio" ${s.audio ? 'checked' : ''} /><i></i></span></div>
      <div class="settings-row"><div class="settings-label"><strong>Volume</strong><small id="volumeOut">${Math.round(s.volume * 100)}%</small></div><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-setting="volume" style="width:140px" /></div>
    </div>
    <div class="settings-card"><h3>${icon('mic')} Voice agent</h3>
      <div class="settings-row"><div class="settings-label"><strong>Recognition language</strong><small>Speech-to-text locale</small></div><div class="select-wrap"><select data-setting="voiceLang"><option value="en-US" ${s.voiceLang === 'en-US' ? 'selected' : ''}>English (US)</option><option value="en-GB" ${s.voiceLang === 'en-GB' ? 'selected' : ''}>English (UK)</option><option value="hi-IN" ${s.voiceLang === 'hi-IN' ? 'selected' : ''}>Hindi</option><option value="es-ES" ${s.voiceLang === 'es-ES' ? 'selected' : ''}>Spanish</option><option value="fr-FR" ${s.voiceLang === 'fr-FR' ? 'selected' : ''}>French</option><option value="de-DE" ${s.voiceLang === 'de-DE' ? 'selected' : ''}>German</option></select></div></div>
      <div class="settings-row"><div class="settings-label"><strong>Speak responses</strong><small>Agent reads confirmations aloud</small></div><span class="switch"><input type="checkbox" data-setting="speakResponses" ${s.speakResponses ? 'checked' : ''} /><i></i></span></div>
    </div>
    <div class="settings-card"><h3>${icon('hand')} Hand control</h3>
      <div class="settings-row"><div class="settings-label"><strong>Detection confidence</strong><small id="sensitivityOut">${Math.round(s.gestureSensitivity * 100)}%</small></div><input type="range" min="0.3" max="0.9" step="0.05" value="${s.gestureSensitivity}" data-setting="gestureSensitivity" style="width:140px" /></div>
      <div class="settings-row"><div class="settings-label"><strong>Mirror camera</strong><small>Flip preview like a mirror</small></div><span class="switch"><input type="checkbox" data-setting="mirror" ${s.mirror ? 'checked' : ''} /><i></i></span></div>
    </div>
    <div class="settings-card"><h3>${icon('download')} Workspace data</h3>
      <div class="prose"><p>Export the current lab state and preferences as JSON, or import a previously exported file. No data leaves your browser.</p></div>
      <div class="settings-actions"><button class="primary-btn" id="exportSettings">${icon('download')} Export settings</button><button class="ghost-btn" id="importSettingsBtn">${icon('copy')} Import settings</button><button class="danger-btn" id="resetSettings">${icon('reset')} Reset defaults</button></div>
    </div>
    <div class="settings-card"><h3>${icon('shield')} Privacy & models</h3>
      <div class="prose"><p>Camera frames are processed locally by MediaPipe Hand Landmarker. Speech recognition uses your browser's speech service when enabled. All physics values are labelled as measured material properties, typical grade ranges, or simulation estimates.</p><p>Field lines use dipole superposition; force uses far-field dipole or Maxwell-pressure upper bounds; shielding uses an AC plane-wave skin-depth model. None replace calibrated laboratory measurement.</p></div>
      <div class="settings-actions"><button class="ghost-btn" id="modelNotes">${icon('info')} Model notes</button><button class="ghost-btn" id="allRefs">${icon('book')} All references</button></div>
    </div>
  </div>`;
}

function render() {
  chart?.destroy(); chart = null;
  scene.unmount();
  const r = state.route;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.route === r));
  const bc = $('#breadcrumbCurrent');
  if (bc) bc.textContent = ROUTES[r]?.crumb || 'Overview';
  document.title = `${ROUTES[r]?.title || 'Overview'} · Magnetic Universe 3D`;
  const renderers = { home: renderHome, concepts: renderConcepts, magnets: renderMagnets, materials: renderMaterials, alloy: renderAlloy, field: renderField, electro: renderElectro, experiments: renderExperiments, tools: renderTools, quiz: renderQuiz, encyclopedia: renderEncyclopedia, settings: renderSettings, privacy: renderPrivacy, terms: renderTerms };
  const renderer = renderers[r] || renderHome;
  main.innerHTML = renderer();
  hydrateIcons(main);
  bindRanges(main);
  bindPageEvents();
  if (LAB_ROUTES.includes(r)) {
    configureSceneForRoute();
    scene.mount($('#sceneHost'));
    updateReadouts();
    requestAnimationFrame(() => buildChart());
  }
  audio.setTesla(r === 'electro' && state.deviceId === 'tesla-coil' && !state.params.paused);
}

function configureSceneForRoute() {
  const r = state.route;
  scene.params = { ...state.params };
  if (r === 'concepts') {
    const c = getConceptCombination(state.conceptScrubberIndex);
    if (c.magnet) state.magnetId = c.magnet;
    if (c.material) state.materialId = c.material;
    if (c.device) { state.deviceId = c.device; if (c.deviceParams) state.deviceParams = { ...c.deviceParams }; }
    if (c.params) Object.assign(state.params, c.params);
    if (c.route === 'electro') scene.setDevice(currentDevice(), state.deviceParams);
    else if (c.route === 'materials') scene.setMaterial(currentMaterial(), state.alloy.thicknessA);
    else if (c.route === 'alloy') scene.setAlloy(alloyMaterials());
    else { scene.params.twoMagnets = (c.params?.polarity === 'repel' || c.params?.twoMagnets); scene.setMagnet(currentMagnet()); }
  } else if (r === 'home' || r === 'magnets') { scene.setMagnet(currentMagnet()); scene.params.twoMagnets = false; }
  else if (r === 'field') { scene.params.twoMagnets = true; scene.setMagnet(currentMagnet()); scene.setView('field'); }
  else if (r === 'materials') scene.setMaterial(currentMaterial(), state.alloy.thicknessA);
  else if (r === 'alloy') scene.setAlloy(alloyMaterials());
  else if (r === 'electro') scene.setDevice(currentDevice(), state.deviceParams);
  else if (r === 'experiments') {
    const e = currentExperiment();
    if (e.magnet) state.magnetId = e.magnet;
    if (e.material) state.materialId = e.material;
    if (e.device) { state.deviceId = e.device; state.deviceParams = { ...currentDevice().defaults }; }
    const pairExperiments = [1, 2, 5, 8];
    if (e.number === 7) { state.deviceId = 'electromagnet'; state.deviceParams = { ...currentDevice().defaults }; }
    if (e.number === 10) { state.deviceId = 'maglev'; state.deviceParams = { ...currentDevice().defaults }; }
    if (e.view === 'electro' || e.number === 7 || e.number === 10) { scene.setDevice(currentDevice(), state.deviceParams); }
    else if (e.view === 'materials' || e.view === 'thickness' || e.number === 3 || e.number === 4 || e.number === 6) scene.setMaterial(currentMaterial(), state.alloy.thicknessA);
    else { scene.params.twoMagnets = pairExperiments.includes(e.number); scene.setMagnet(currentMagnet()); scene.setExperiment(e); }
    if (e.number === 1) state.params.polarity = 'repel';
    if (e.number === 2) state.params.polarity = 'attract';
    if (e.number === 8) { state.params.polarity = 'attract'; state.params.gap = 8; state.params.displayMode = 'solid'; }
    scene.update({ polarity: state.params.polarity, twoMagnets: scene.params.twoMagnets, displayMode: state.params.displayMode });
  }
  scene.update(state.params);
}

function buildChart() {
  const canvas = $('#analysisChart');
  if (!canvas) return;
  chart?.destroy();
  const r = state.route;
  if (r === 'concepts') {
    const c = currentConcept();
    if (c.route === 'electro') chart = currentDevice()?.id === 'tesla-coil' ? Charts.teslaChart(canvas, state.deviceParams) : Charts.electroChart(canvas, currentDevice(), state.deviceParams);
    else if (c.route === 'materials') chart = Charts.shieldingChart(canvas, currentMaterial(), state.alloy.thicknessA);
    else if (c.route === 'alloy') chart = Charts.alloyChart(canvas, alloyMaterials());
    else chart = Charts.fieldChart(canvas, currentMagnet(), state.params);
  } else if (r === 'home' || r === 'magnets') chart = Charts.fieldChart(canvas, currentMagnet(), state.params);
  else if (r === 'field') chart = Charts.forceChart(canvas, currentMagnet(), state.params);
  else if (r === 'alloy') chart = Charts.alloyChart(canvas, alloyMaterials());
  else if (r === 'electro') chart = state.deviceId === 'tesla-coil' ? Charts.teslaChart(canvas, state.deviceParams) : state.deviceId === 'glass-generator' ? Charts.generatorChart(canvas, currentDevice(), state.deviceParams) : Charts.electroChart(canvas, currentDevice(), state.deviceParams);
  else if (r === 'materials') chart = Charts.shieldingChart(canvas, currentMaterial(), state.alloy.thicknessA);
  else if (r === 'experiments') {
    const e = currentExperiment();
    if (e.number === 9) chart = Charts.temperatureChart(canvas, currentMagnet());
    else if (e.view === 'electro' || e.number === 7 || e.number === 10) chart = currentDevice()?.id === 'glass-generator' ? Charts.generatorChart(canvas, currentDevice(), state.deviceParams) : Charts.electroChart(canvas, currentDevice(), state.deviceParams);
    else if (e.view === 'materials' || e.view === 'thickness' || e.number === 3 || e.number === 4 || e.number === 6) chart = Charts.shieldingChart(canvas, currentMaterial(), state.alloy.thicknessA);
    else if (e.number === 5) chart = Charts.forceChart(canvas, currentMagnet(), state.params);
    else chart = Charts.fieldChart(canvas, currentMagnet(), state.params);
  }
}

const rebuildChart = debounce(() => buildChart(), 250);

function updateReadouts() {
  const m = currentMagnet();
  const br20 = m?.br ? (m.br[0] + m.br[1]) / 2 * state.params.strength / 100 : null;
  const temp = br20 != null && m.curie ? Physics.temperatureRemanence({ br20, temperature: state.params.temperature, coefficient: -0.0011, maxOperating: m.maxTemp || 80, curie: m.curie }) : null;
  const br = temp ? temp.br : br20;
  const hudBr = $('#hudBr'), hudGap = $('#hudGap'), hudMode = $('#hudMode');
  if (hudBr) hudBr.textContent = br != null ? `${br.toFixed(2)} T` : 'POWERED';
  if (hudGap) hudGap.textContent = `${state.params.gap} mm`;
  if (hudMode) hudMode.textContent = state.params.displayMode.toUpperCase();
  const metricBr = $('#metricBr'); if (metricBr && br != null) metricBr.textContent = `${br.toFixed(2)} T`;
  const radius = ((m?.dimensions?.diameter || m?.dimensions?.width || 20) / 2) * 0.001;
  const length = (m?.dimensions?.length || m?.dimensions?.height || 40) * 0.001;
  if (br != null) {
    const B = Physics.cylinderAxialField({ remanence: br, radius: Math.max(0.004, radius), length: Math.max(0.004, length), distance: state.params.gap * 0.001 });
    const force = Physics.contactForceEstimate({ remanence: br, area: Math.PI * radius * radius, gap: state.params.gap * 0.001, radius });
    const metricB = $('#metricB'); if (metricB) metricB.textContent = Physics.formatField(B);
    const metricForce = $('#metricForce'); if (metricForce) metricForce.textContent = `${force.force.toFixed(1)} N`;
  }
  const metricGap = $('#metricGap'); if (metricGap) metricGap.textContent = `${state.params.gap} mm`;
  const metricPolarity = $('#metricPolarity'); if (metricPolarity) metricPolarity.textContent = state.params.polarity === 'repel' ? 'N ↔ N' : 'N ↔ S';
  const metricRegime = $('#metricRegime'); if (metricRegime) { metricRegime.textContent = state.params.polarity === 'repel' ? 'REPULSION' : 'ATTRACTION'; metricRegime.closest('.metric')?.classList.toggle('danger', state.params.polarity === 'repel'); }
  if (state.route === 'electro') {
    const p = state.deviceParams;
    const coreMu = p.core === 'iron' ? 800 : p.core === 'ferrite' ? 200 : 1;
    const circuit = Physics.magneticCircuitField({ current: p.current || 0, turns: p.turns || 1, coreLength: (p.length || 60) * 0.001, gap: (p.gap || 2) * 0.001, relativePermeability: coreMu, saturation: p.core === 'ferrite' ? 0.4 : 1.6 });
    const solenoid = Physics.finiteSolenoidField({ current: p.current || 0, turns: p.turns || 1, length: (p.length || 60) * 0.001, radius: (p.diameter || 20) * 0.001 / 2 });
    const mc = $('#metricCircuit'); if (mc) mc.textContent = Physics.formatField(circuit.field);
    const ms = $('#metricSolenoid'); if (ms) ms.textContent = Physics.formatField(solenoid);
    const sat = $('#metricSat'); if (sat) { sat.textContent = circuit.saturated ? 'LIMITED' : 'LINEAR'; sat.closest('.metric')?.classList.toggle('danger', circuit.saturated); }
  }
  if (state.route === 'alloy') {
    const a = alloyMaterials();
    const mass = mat => Physics.plateMass({ density: ((mat.density?.[0] || 7.8) + (mat.density?.[1] || 7.8)) / 2 * 1000, area: 0.06 * 0.04, thickness: (mat === a.materialA ? a.thicknessA : a.thicknessB) * 0.001 }) * 1000;
    const ma = mass(a.materialA), mb = mass(a.materialB);
    const elA = $('#metricMassA'), elB = $('#metricMassB'), elD = $('#metricMassDelta');
    if (elA) elA.textContent = `${ma.toFixed(1)} g`;
    if (elB) elB.textContent = `${mb.toFixed(1)} g`;
    if (elD) elD.textContent = `${(ma - mb).toFixed(1)} g`;
  }
  const ts = $('#tempStatus');
  if (ts) {
    const show = temp && (temp.regime !== 'reversible' || state.params.temperature !== 20);
    ts.hidden = !show;
    if (show) {
      const labels = { reversible: 'REVERSIBLE REGION', 'near-operating-limit': 'NEAR OPERATING LIMIT', 'above-operating': 'ABOVE MAX OPERATING TEMP', 'near-curie': 'CURIE COLLAPSE', 'above-curie': 'ABOVE CURIE POINT' };
      const severe = temp.regime !== 'reversible';
      ts.className = `temp-status${severe ? ' warn' : ''}`;
      ts.innerHTML = `<strong>${labels[temp.regime]} · ${state.params.temperature} °C</strong>${temp.warning ? esc(temp.warning) : `Reversible linear model Br(T) = Br₂₀(1 + αΔT), α ≈ −0.11 %/°C. Estimated remanence ${temp.br.toFixed(2)} T — ${Math.round(temp.reversibleFraction * 100)}% of the 20 °C value.`}`;
    }
  }
  audio.setField(state.params.strength);
}

function setParam(key, value) {
  state.params[key] = value;
  scene.update({ [key]: value });
  updateReadouts();
  rebuildChart();
  if (key === 'paused') {
    const btn = $('#pauseBtn');
    if (btn) btn.innerHTML = icon(value ? 'play' : 'pause');
    audio.setTesla(state.route === 'electro' && state.deviceId === 'tesla-coil' && !value);
  }
}

function syncControls() {
  $$('#mainContent [data-param]').forEach(el => {
    const key = el.dataset.param;
    if (el.type === 'checkbox') el.checked = Boolean(state.params[key]);
    else if (key in state.params) el.value = state.params[key];
  });
  bindRanges(main);
}

function run1000Benchmark() {
  const start = performance.now();
  let validCount = 0;
  for (let i = 1; i <= 1000; i++) {
    const c = getConceptCombination(i);
    if (c && c.title && c.params) validCount++;
  }
  const elapsed = (performance.now() - start).toFixed(1);
  toast(`Verified 1,000 Concept Permutations in ${elapsed}ms!`, 'success', 4000);
}

function bindPageEvents() {
  $('#viewBlueprintBtn')?.addEventListener('click', () => {
    let item = currentMagnet();
    if (state.route === 'electro') item = currentDevice();
    else if (state.route === 'materials') item = currentMaterial();
    else if (state.route === 'concepts') item = currentConcept();

    const parts = item.partsList || ['Standard Laboratory Grade Specimen Component', 'Dielectric Assembly Mounting Frame'];
    const guide = item.assemblyGuide || 'Assemble on non-magnetic workbench using insulating fasteners and protective gear.';
    const sourcing = item.sourcingGuide || 'Specialty physics suppliers, McMaster-Carr, K&J Magnetics, Digikey.';

    openInfo(`Component Blueprint & Parts List: ${item.name || item.title}`, `
      <h3>${icon('cube')} Bill of Materials (BOM) & Component List</h3>
      <ul>${parts.map(p => `<li><strong>${esc(p)}</strong></li>`).join('')}</ul>
      <h3>${icon('settings')} Engineering Specifications & Assembly Guide</h3>
      <p class="prose">${esc(guide)}</p>
      <h3>${icon('download')} Parts Procurement & Sourcing Guide</h3>
      <p class="prose">${esc(sourcing)}</p>
    `);
  });

  $('#materialSearch')?.addEventListener('input', debounce(e => { state.materialQuery = e.target.value; render(); const input = $('#materialSearch'); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }, 250));
  $('#headingVoice')?.addEventListener('click', () => openAgent(true));
  $('#headingRefs')?.addEventListener('click', () => openInfo('Model assumptions & references', modelNotesHtml()));
  $('#flipPolarity')?.addEventListener('click', () => { setParam('polarity', state.params.polarity === 'repel' ? 'attract' : 'repel'); syncControls(); render(); });
  $('#pauseBtn')?.addEventListener('click', () => { setParam('paused', !state.params.paused); audio.click(state.params.paused ? 440 : 880); });
  $('#fullscreenBtn')?.addEventListener('click', () => {
    const host = $('#sceneHost');
    if (!document.fullscreenElement) host?.requestFullscreen?.().catch(() => toast('Fullscreen not available', 'error'));
    else document.exitFullscreen?.();
  });
  $('#hudCapture')?.addEventListener('click', captureViewport);
  $('#resetLab')?.addEventListener('click', resetLab);
  $('#randomizeLab')?.addEventListener('click', () => { scene.randomize(); audio.click(980); toast('Lighting and camera randomized'); });
  $('#captureLab')?.addEventListener('click', captureViewport);
  $('#exportLab')?.addEventListener('click', exportWorkspace);

  $('#prevConceptBtn')?.addEventListener('click', () => { loadConcept(state.conceptScrubberIndex - 1); render(); });
  $('#nextConceptBtn')?.addEventListener('click', () => { loadConcept(state.conceptScrubberIndex + 1); render(); });
  $('#randomConceptBtn')?.addEventListener('click', () => { loadConcept(Math.floor(Math.random() * 1000) + 1); render(); });
  $('#runCurrentConceptBtn')?.addEventListener('click', () => { loadConcept(state.conceptScrubberIndex); render(); });
  $('#run1000Benchmark')?.addEventListener('click', run1000Benchmark);

  $('#conceptNumberInput')?.addEventListener('change', e => {
    const num = Number(e.target.value) || 1;
    loadConcept(num);
    render();
  });
  $('#conceptRangeScrubber')?.addEventListener('input', e => {
    const num = Number(e.target.value) || 1;
    loadConcept(num);
    render();
  });

  // Calculator inputs listener
  main.querySelectorAll('.calc-field').forEach(field => {
    field.addEventListener('input', () => {
      const calcId = field.dataset.calc;
      const calcObj = CALCULATORS.find(c => c.id === calcId);
      if (!calcObj) return;
      const values = calcObj.inputs.map(inp => {
        const el = main.querySelector(`[data-calc="${calcId}"][data-input="${inp.id}"]`);
        const out = $(`#out-${inp.id}`);
        if (out) out.textContent = el ? el.value : inp.default;
        return el ? (inp.type === 'select' ? el.value : Number(el.value)) : inp.default;
      });
      const res = calcObj.calculate(...values);
      const resEl = $(`#res-${calcId}`);
      if (resEl) resEl.textContent = res.text;
    });
  });

  // Quiz events
  main.querySelectorAll('[data-quiz-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.quizAnswered) return;
      state.quizAnswered = true;
      state.quizSelectedOption = Number(btn.dataset.quizOption);
      const q = QUIZ_QUESTIONS[state.quizIndex];
      if (state.quizSelectedOption === q.correct) state.quizScore++;
      render();
    });
  });
  $('#nextQuizBtn')?.addEventListener('click', () => {
    state.quizIndex++;
    state.quizAnswered = false;
    state.quizSelectedOption = null;
    render();
  });
  $('#restartQuizBtn')?.addEventListener('click', () => {
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizAnswered = false;
    state.quizSelectedOption = null;
    render();
  });

  main.querySelectorAll('[data-param]').forEach(el => {
    const handler = () => {
      const key = el.dataset.param;
      let value = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
      if (key === 'materialId') { state.materialId = value; scene.setMaterial(currentMaterial(), state.alloy.thicknessA); render(); return; }
      if (key === 'thickness') { state.alloy.thicknessA = value; scene.setMaterial(currentMaterial(), value); const custom = $('#ctrl-custom-thickness'); if (custom) custom.value = value; updateReadouts(); rebuildChart(); return; }
      if (key === 'alloyA') { state.alloy.materialA = value; scene.setAlloy(alloyMaterials()); updateReadouts(); rebuildChart(); return; }
      if (key === 'alloyB') { state.alloy.materialB = value; scene.setAlloy(alloyMaterials()); updateReadouts(); rebuildChart(); return; }
      if (key === 'thickA') { state.alloy.thicknessA = Number(value); scene.setAlloy(alloyMaterials()); updateReadouts(); rebuildChart(); return; }
      if (key === 'thickB') { state.alloy.thicknessB = Number(value); scene.setAlloy(alloyMaterials()); updateReadouts(); rebuildChart(); return; }
      if (['voltage', 'current', 'turns', 'core', 'length', 'diameter', 'gap', 'resonantFrequency', 'qualityFactor'].includes(key) && (state.route === 'electro' || currentExperiment()?.view === 'electro' || state.route === 'concepts')) {
        state.deviceParams[key] = value;
        scene.update({ [key]: value });
        const out = $(`#${el.id}-out`); if (out) out.textContent = `${value}${el.dataset.unit || ''}`;
        updateReadouts(); rebuildChart(); audio.click(500 + Number(value) % 400);
        return;
      }
      if (key === 'quality') { state.settings.quality = value; saveSettings(); }
      setParam(key, value);
      const out = $(`#${el.id}-out`); if (out) out.textContent = `${value}${el.dataset.unit || ''}`;
      if (el.type !== 'range') audio.click(700);
    };
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
  $('#ctrl-custom-thickness')?.addEventListener('input', e => {
    const v = Math.max(0.1, Math.min(200, Number(e.target.value) || 0.1));
    state.alloy.thicknessA = v;
    scene.setMaterial(currentMaterial(), v);
    const out = $('#ctrl-custom-thickness-out'); if (out) out.textContent = `${v} mm`;
    const sliderEl = $('#ctrl-thickness'); if (sliderEl && v <= 50) { sliderEl.value = v; sliderEl.dispatchEvent(new Event('input')); }
    updateReadouts(); rebuildChart();
  });

  main.querySelectorAll('[data-setting]').forEach(el => {
    const handler = () => {
      const key = el.dataset.setting;
      state.settings[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      if (key === 'volume') { const vo = $('#volumeOut'); if (vo) vo.textContent = `${Math.round(state.settings.volume * 100)}%`; }
      if (key === 'gestureSensitivity') { const so = $('#sensitivityOut'); if (so) so.textContent = `${Math.round(state.settings.gestureSensitivity * 100)}%`; }
      applySettings();
      audio.click(620);
    };
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
  $('#exportSettings')?.addEventListener('click', () => { download('magnetic-universe-settings.json', JSON.stringify({ settings: state.settings, params: state.params, magnetId: state.magnetId, materialId: state.materialId, deviceId: state.deviceId, alloy: state.alloy }, null, 2)); toast('Settings exported', 'success'); });
  $('#importSettingsBtn')?.addEventListener('click', () => $('#importSettings')?.click());
  $('#resetSettings')?.addEventListener('click', () => { state.settings = { ...defaultSettings }; applySettings(); render(); toast('Settings restored to defaults', 'success'); });
  $('#modelNotes')?.addEventListener('click', () => openInfo('Physics model notes', modelNotesHtml()));
  $('#allRefs')?.addEventListener('click', () => openInfo('All scientific references', referenceHtml(REFERENCES.map(r => r.id), REFERENCES)));
}

function modelNotesHtml() {
  const notes = Physics.MODEL_NOTES || {};
  return `<h3>Simulation models</h3><ul>${Object.entries(notes).map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')}</ul><h3>Material data</h3><p>Published typical ranges for the stated grade and condition. Virtual specimen dimensions are representative, not vendor measurements. Powered-device fields are calculated estimates with stated assumptions.</p><h3>References</h3>${referenceHtml(REFERENCES.slice(0, 8).map(r => r.id), REFERENCES)}`;
}

function resetLab() {
  state.params = { ...defaultParams, quality: state.settings.quality };
  if (state.route === 'electro') state.deviceParams = { ...currentDevice().defaults };
  scene.update(state.params);
  scene.resetCamera();
  syncControls();
  updateReadouts();
  rebuildChart();
  audio.click(440);
  toast('Workspace reset');
}

function captureViewport() {
  try {
    const url = scene.capture();
    const a = document.createElement('a');
    a.href = url; a.download = `magnetic-universe-${state.route}-${Date.now()}.png`; a.click();
    audio.click(1200);
    toast('Viewport captured as PNG', 'success');
  } catch { toast('Capture failed — WebGL context may be lost', 'error'); }
}

function exportWorkspace() {
  download('magnetic-universe-workspace.json', JSON.stringify({
    version: '1.2.0', exported: new Date().toISOString(), route: state.route,
    magnet: currentMagnet()?.id, material: currentMaterial()?.id, device: currentDevice()?.id,
    params: state.params, deviceParams: state.deviceParams, alloy: state.alloy, settings: state.settings,
    note: 'Simulation estimates; see MODEL_NOTES in modules/physics.js'
  }, null, 2));
  toast('Workspace exported as JSON', 'success');
}

function nextMagnet(dir = 1) {
  const idx = MAGNETS.findIndex(m => m.id === state.magnetId);
  state.magnetId = MAGNETS[(idx + dir + MAGNETS.length) % MAGNETS.length].id;
  audio.click(760);
  render();
  toast(`Loaded ${currentMagnet().name}`);
}

function addAgentMessage(text, who = 'agent') {
  const region = $('#agentTranscript');
  if (!region) return;
  const p = document.createElement('p');
  p.className = `agent-message ${who === 'user' ? 'user' : who === 'error' ? 'error' : ''}`;
  p.textContent = text;
  region.appendChild(p);
  region.scrollTop = region.scrollHeight;
  while (region.children.length > 30) region.firstChild.remove();
}

function openAgent(startListening = false) {
  const ap = $('#agentPanel'); if (ap) ap.hidden = false;
  const vb = $('#voiceBtn'); if (vb) vb.setAttribute('aria-pressed', 'true');
  if (startListening) voice.start();
}

function runCommand(raw) {
  const text = raw.toLowerCase().trim();
  if (!text) return;
  addAgentMessage(raw, 'user');
  audio.unlock();
  let response = '';
  const num = text.match(/(-?\d+(?:\.\d+)?)/);
  const value = num ? Number(num[1]) : null;

  const navMap = { home: 'home', overview: 'home', concepts: 'concepts', 'concept projects': 'concepts', magnet: 'magnets', 'magnet explorer': 'magnets', material: 'materials', materials: 'materials', alloy: 'alloy', 'alloy laboratory': 'alloy', field: 'field', 'field simulator': 'field', 'magnetic field simulator': 'field', electromagnet: 'electro', electromagnetism: 'electro', 'electromagnetism lab': 'electro', tesla: 'electro', 'tesla coil': 'electro', experiment: 'experiments', experiments: 'experiments', tools: 'tools', calculator: 'tools', calculators: 'tools', quiz: 'quiz', encyclopedia: 'encyclopedia', 'scientific encyclopedia': 'encyclopedia', settings: 'settings', privacy: 'privacy', terms: 'terms' };
  const navPhrase = text.replace(/^(?:please\s+)?(?:go to|go|open|show|navigate to|switch to|take me to)\s+/, '').replace(/^the\s+/, '').replace(/\s+(?:page|lab|database|simulator|please)$/, '').trim();
  const navRoute = navMap[navPhrase];

  if (/concept\s*(\d+)/.test(text)) {
    const cNum = Number(text.match(/concept\s*(\d+)/)[1]);
    loadConcept(cNum);
    navigate('concepts', { concept: cNum });
    response = `Loaded Concept #${cNum}.`;
  } else if (navRoute && !/field lines|iron filings|heatmap|labels|grid/.test(text)) {
    if (text.includes('tesla')) { navigate('electro', { device: 'tesla-coil' }); response = 'Opening the Tesla coil in the Electromagnetism Lab.'; }
    else { navigate(navRoute); response = `Opening ${ROUTES[navRoute].title}.`; }
  } else if (/^(?:select|show|load|display)\s+(?:magnet\s+)?/.test(text) && !/field|filings|heatmap|grid|labels/.test(text)) {
    const query = text.replace(/^(?:select|show|load|display)\s+(?:magnet\s+)?/, '').trim();
    const found = MAGNETS.find(m => m.name.toLowerCase().includes(query) || m.id.includes(query) || (m.family || '').toLowerCase().includes(query) || (m.shape || '').includes(query));
    if (found) { state.magnetId = found.id; if (['home', 'magnets', 'field'].includes(state.route)) render(); else navigate('magnets'); response = `Loaded ${found.name}. ${found.strength || ''}`; }
    else {
      const mat = MATERIALS.find(m => m.name.toLowerCase().includes(query));
      const dev = DEVICES.find(d => d.name.toLowerCase().includes(query) || d.id.includes(query));
      if (mat) { navigate('materials', { material: mat.id }); response = `Loading ${mat.name}. ${mat.magnetic?.behavior || ''}`; }
      else if (dev) { navigate('electro', { device: dev.id }); response = `Building ${dev.name}.`; }
      else response = `I could not find a specimen matching “${query}”. Try “select horseshoe” or “show neodymium”.`;
    }
  } else if (/set\s+(?:the\s+)?strength|strength\s+(?:to\s+)?\d/.test(text) && value != null) {
    const v = Physics.clamp(value, 10, 200); setParam('strength', v); syncControls(); response = `Magnetic strength set to ${v} percent.`;
  } else if (/(?:set\s+)?(?:gap|distance)|(?:gap|distance)\s+(?:to\s+)?\d/.test(text) && value != null && !/field lines/.test(text)) {
    const v = Physics.clamp(value, 5, 120); setParam('gap', v); syncControls(); response = `Pole-face gap set to ${v} millimetres.`;
  } else if (/iron filings/.test(text)) {
    const on = !/off|hide|disable/.test(text); setParam('filings', on); syncControls(); response = `Iron filings ${on ? 'enabled' : 'hidden'}.`;
  } else if (/heatmap|flux map/.test(text)) {
    const on = !/off|hide|disable/.test(text); setParam('heatmap', on); syncControls(); response = `Flux heatmap ${on ? 'enabled' : 'hidden'}.`;
  } else if (/field lines|show field| magnetic field/.test(text)) {
    const on = !/off|hide|disable/.test(text); setParam('fieldLines', on); syncControls(); response = `Field lines ${on ? 'visible' : 'hidden'}.`;
  } else if (/reset/.test(text)) {
    resetLab(); response = 'Workspace reset to defaults.';
  } else if (/help|commands/.test(text)) {
    openInfo('Voice & text commands', helpHtml()); response = 'Here are the available commands.';
  } else {
    response = 'Command accepted. Try "concept 5", "open calculator", "quiz", or "reset".';
  }
  addAgentMessage(response);
  if (state.settings.speakResponses && state.settings.audio) voice.speak(response);
  toast(response.slice(0, 80), 'info', 2600);
}

function helpHtml() {
  return `<h3>Keyboard</h3><ul><li><kbd>/</kbd> search · <kbd>V</kbd> voice agent · <kbd>G</kbd> hand control · <kbd>M</kbd> mute</li><li><kbd>R</kbd> reset · <kbd>Space</kbd> pause/resume · <kbd>T</kbd> tools · <kbd>Q</kbd> quiz · <kbd>0</kbd>–<kbd>9</kbd> switch pages</li></ul><h3>Voice / text commands</h3><ul><li>“open concepts”, “concept 5”, “open calculator”, “quiz”, “privacy”</li><li>“select horseshoe”, “next magnet”, “load copper”</li><li>“show field lines”, “iron filings on”, “heatmap”, “explode”, “reset”</li></ul>`;
}

function buildSearchIndex() {
  const items = [];
  CONCEPT_PROJECTS.forEach(c => items.push({ type: 'CONCEPT', title: c.title, sub: `Concept #${c.number} · ${c.category}`, icon: 'spark', action: () => { loadConcept(c.number); navigate('concepts', { concept: c.number }); } }));
  CALCULATORS.forEach(c => items.push({ type: 'TOOL', title: c.name, sub: c.category, icon: 'calculator', action: () => navigate('tools') }));
  MAGNETS.forEach(m => items.push({ type: 'MAGNET', title: m.name, sub: m.family || m.material, icon: 'magnet', action: () => navigate('magnets', { magnet: m.id }) }));
  MATERIALS.forEach(m => items.push({ type: 'MATERIAL', title: m.name, sub: m.category, icon: 'layers', action: () => navigate('materials', { material: m.id }) }));
  DEVICES.forEach(d => items.push({ type: 'DEVICE', title: d.name, sub: d.shape, icon: 'bolt', action: () => navigate('electro', { device: d.id }) }));
  EXPERIMENTS.forEach(e => items.push({ type: 'EXPERIMENT', title: e.title, sub: e.question, icon: 'beaker', action: () => navigate('experiments', { experiment: e.id }) }));
  ENCYCLOPEDIA.forEach(a => items.push({ type: 'ARTICLE', title: a.title, sub: a.category, icon: 'book', action: () => navigate('encyclopedia', { article: a.id }) }));
  Object.entries(ROUTES).forEach(([id, r]) => items.push({ type: 'PAGE', title: r.title, sub: 'Navigation', icon: 'arrow', action: () => navigate(id) }));
  return items;
}
const searchIndex = buildSearchIndex();
let searchSelected = 0;

function renderSearch(query = '') {
  const q = query.toLowerCase().trim();
  const results = (q ? searchIndex.filter(i => (i.title + i.sub + i.type).toLowerCase().includes(q)) : searchIndex).slice(0, 14);
  searchSelected = Math.min(searchSelected, Math.max(0, results.length - 1));
  const cr = $('#commandResults');
  if (cr) {
    cr.innerHTML = results.length ? results.map((r, i) => `<button class="command-result ${i === searchSelected ? 'selected' : ''}" data-result="${i}">${icon(r.icon)}<div><strong>${esc(r.title)}</strong><small>${esc(r.sub || '')}</small></div><span class="result-type">${r.type}</span></button>`).join('') : '<div class="command-empty">No matches. Try “concept 5”, “Halbach”, “Railgun”, “calculator”, or “quiz”.</div>';
    cr.querySelectorAll('[data-result]').forEach(el => el.addEventListener('click', () => { results[Number(el.dataset.result)].action(); $('#commandDialog')?.close(); }));
  }
  return results;
}

function openSearch() {
  const dialog = $('#commandDialog');
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  const cs = $('#commandSearch');
  if (cs) cs.value = '';
  searchSelected = 0;
  renderSearch();
  setTimeout(() => cs?.focus(), 50);
}

function bindGlobalEvents() {
  // Delegate click for dynamic cards and navigation buttons
  document.addEventListener('click', e => {
    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) {
      e.preventDefault();
      navigate(routeBtn.dataset.route, { device: routeBtn.dataset.device });
      return;
    }
    const magnetBtn = e.target.closest('[data-magnet]');
    if (magnetBtn) {
      state.magnetId = magnetBtn.dataset.magnet;
      audio.click(660);
      render();
      return;
    }
    const deviceBtn = e.target.closest('[data-device]');
    if (deviceBtn) {
      state.deviceId = deviceBtn.dataset.device;
      state.deviceParams = { ...currentDevice().defaults };
      audio.click(720);
      render();
      return;
    }
    const materialBtn = e.target.closest('[data-material]');
    if (materialBtn) {
      state.materialId = materialBtn.dataset.material;
      audio.click(600);
      render();
      return;
    }
    const experimentBtn = e.target.closest('[data-experiment]');
    if (experimentBtn) {
      state.experimentId = experimentBtn.dataset.experiment;
      audio.click(760);
      render();
      return;
    }
    const runExpBtn = e.target.closest('[data-run-experiment]');
    if (runExpBtn) {
      navigate('experiments', { experiment: runExpBtn.dataset.runExperiment });
      return;
    }
    const runConceptBtn = e.target.closest('[data-run-concept]');
    if (runConceptBtn) {
      const num = Number(runConceptBtn.dataset.runConcept) || 1;
      loadConcept(num);
      if (state.route !== 'concepts') navigate('concepts', { concept: num });
      else render();
      return;
    }
    const conceptFilterBtn = e.target.closest('[data-concept-filter]');
    if (conceptFilterBtn) {
      state.conceptFilter = conceptFilterBtn.dataset.conceptFilter;
      render();
      return;
    }
    const articleBtn = e.target.closest('[data-article]');
    if (articleBtn) {
      state.articleId = articleBtn.dataset.article;
      render();
      return;
    }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      state.infoTab = tabBtn.dataset.tab;
      render();
      return;
    }
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      state.materialFilter = filterBtn.dataset.filter;
      render();
      return;
    }
    const refBtn = e.target.closest('[data-refs]');
    if (refBtn) {
      const ids = refBtn.dataset.refs.split(',').filter(Boolean);
      openInfo('Scientific references', referenceHtml(ids, REFERENCES) + '<p style="margin-top:14px;font-size:11px;color:var(--cool)">Material properties are typical published ranges for the stated grade/condition, not measurements of the virtual specimen. Specimen dimensions are representative.</p>');
      return;
    }
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      scene.resetCamera(viewBtn.dataset.view);
      audio.click(520);
      return;
    }
  });

  // Topbar and modal controls
  $('#menuBtn')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('open'));
  $('#searchBtn')?.addEventListener('click', openSearch);
  $('#commandSearch')?.addEventListener('input', e => { searchSelected = 0; renderSearch(e.target.value); });
  $('#commandSearch')?.addEventListener('keydown', e => {
    const results = renderSearch(e.target.value);
    if (e.key === 'ArrowDown') { e.preventDefault(); searchSelected = (searchSelected + 1) % results.length; renderSearch(e.target.value); }
    if (e.key === 'ArrowUp') { e.preventDefault(); searchSelected = (searchSelected - 1 + results.length) % results.length; renderSearch(e.target.value); }
    if (e.key === 'Enter' && results[searchSelected]) { results[searchSelected].action(); $('#commandDialog')?.close(); }
  });
  $('#helpBtn')?.addEventListener('click', () => openInfo('Controls & shortcuts', helpHtml()));
  $('#closeInfo')?.addEventListener('click', () => $('#infoDialog')?.close());
  $('#audioBtn')?.addEventListener('click', () => { state.settings.audio = !state.settings.audio; applySettings(); if (state.settings.audio) { audio.unlock(); audio.click(880); } toast(state.settings.audio ? 'Lab audio enabled' : 'Lab audio muted'); });
  $('#voiceBtn')?.addEventListener('click', () => { const ap = $('#agentPanel'); if (ap) { if (ap.hidden) openAgent(false); else { ap.hidden = true; voice.stop(); } } });
  $('#closeAgent')?.addEventListener('click', () => { const ap = $('#agentPanel'); if (ap) ap.hidden = true; voice.stop(); });
  $('#listenBtn')?.addEventListener('click', () => { audio.unlock(); voice.toggle(); });
  $('#agentForm')?.addEventListener('submit', e => { e.preventDefault(); const input = $('#agentCommand'); const text = input?.value?.trim(); if (text) { runCommand(text); input.value = ''; } });
  $$('.command-chips button').forEach(b => b.addEventListener('click', () => runCommand(b.dataset.command)));
  $('#gestureBtn')?.addEventListener('click', () => { const panel = $('#gesturePanel'); if (panel) { panel.hidden = !panel.hidden; $('#gestureBtn')?.setAttribute('aria-pressed', String(!panel.hidden)); if (panel.hidden) hands.stop(); } });
  $('#closeGesture')?.addEventListener('click', () => { const panel = $('#gesturePanel'); if (panel) { panel.hidden = true; $('#gestureBtn')?.setAttribute('aria-pressed', 'false'); hands.stop(); } });
  $('#startCamera')?.addEventListener('click', async () => { audio.unlock(); if (hands.running) hands.stop(); else await hands.start(); });
  $('#importSettings')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.settings) Object.assign(state.settings, data.settings);
      if (data.params) Object.assign(state.params, data.params);
      if (data.magnetId) state.magnetId = data.magnetId;
      if (data.materialId) state.materialId = data.materialId;
      if (data.deviceId) { state.deviceId = data.deviceId; state.deviceParams = { ...currentDevice().defaults, ...(data.deviceParams || {}) }; }
      if (data.alloy) Object.assign(state.alloy, data.alloy);
      applySettings(); render(); toast('Workspace imported', 'success');
    } catch { toast('Invalid settings file', 'error'); }
    e.target.value = '';
  });

  window.addEventListener('hashchange', () => { const route = location.hash.slice(1); if (ROUTES[route] && route !== state.route) navigate(route); });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || $('#commandDialog')?.open || $('#infoDialog')?.open) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (e.key.toLowerCase() === 'v') openAgent(true);
    else if (e.key.toLowerCase() === 'g') $('#gestureBtn')?.click();
    else if (e.key.toLowerCase() === 'm') $('#audioBtn')?.click();
    else if (e.key.toLowerCase() === 'r') resetLab();
    else if (e.key.toLowerCase() === 't') navigate('tools');
    else if (e.key.toLowerCase() === 'q') navigate('quiz');
    else if (e.key === ' ') { e.preventDefault(); setParam('paused', !state.params.paused); }
    else if (e.key === '0') navigate('concepts');
    else if (/^[1-9]$/.test(e.key)) {
      const routes = Object.keys(ROUTES);
      if (routes[Number(e.key)]) navigate(routes[Number(e.key)]);
    }
    else if (e.key === 'ArrowRight' && e.shiftKey) nextMagnet(1);
    else if (e.key === 'ArrowLeft' && e.shiftKey) nextMagnet(-1);
  });

  const unlock = () => { audio.unlock(); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  window.addEventListener('beforeunload', () => { hands.stop(); voice.stop(); audio.dispose(); scene.dispose(); });
}

const vs = $('#voiceSupport'); if (vs) vs.textContent = voice.supported ? 'Web Speech API available' : 'Speech unavailable · text commands work';
applySettings();
bindGlobalEvents();
const initialRoute = location.hash.slice(1);
if (ROUTES[initialRoute]) state.route = initialRoute;
render();
