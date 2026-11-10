import * as Physics from './physics.js';

const Chart = typeof window !== 'undefined' ? window.Chart : null;
const PALETTE = ['#35e6ff', '#397cff', '#d96bff', '#ffb547', '#a3ff6b', '#ff4d61', '#d8d2c4', '#8ba3bc'];

if (Chart) {
  Chart.defaults.color = '#8ba3bc';
  Chart.defaults.borderColor = 'rgba(28,48,71,.6)';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 10;
  Chart.defaults.animation.duration = 400;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10,18,30,.95)';
  Chart.defaults.plugins.tooltip.borderColor = '#2a4a68';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#e9f2fb';
  Chart.defaults.plugins.tooltip.bodyColor = '#8ba3bc';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

function baseOptions(xTitle, yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: xTitle, color: '#6f87a1', font: { size: 9 } }, grid: { color: 'rgba(28,48,71,.35)' }, ticks: { maxTicksLimit: 6, font: { size: 9 } } },
      y: { title: { display: true, text: yTitle, color: '#6f87a1', font: { size: 9 } }, grid: { color: 'rgba(28,48,71,.35)' }, ticks: { maxTicksLimit: 5, font: { size: 9 } } }
    }
  };
}

function gradient(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  return g;
}

export function fieldChart(canvas, magnet, params = {}) {
  if (!Chart || !canvas) return null;
  const br = magnet?.br ? (magnet.br[0] + magnet.br[1]) / 2 : 1.2;
  const strength = (params.strength ?? 100) / 100;
  const radius = ((magnet?.dimensions?.diameter || magnet?.dimensions?.width || 20) / 2) * 0.001;
  const length = (magnet?.dimensions?.length || magnet?.dimensions?.height || 40) * 0.001;
  const distances = Array.from({ length: 30 }, (_, i) => 1 + i * 3.3);
  const values = distances.map(mm => Physics.cylinderAxialField({ remanence: br * strength, radius: Math.max(0.004, radius), length: Math.max(0.004, length), distance: mm * 0.001 }) * 1000);
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: distances.map(d => d.toFixed(0)),
      datasets: [{
        label: 'Axial flux density',
        data: values,
        borderColor: PALETTE[0],
        backgroundColor: gradient(ctx, PALETTE[0]),
        fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2
      }]
    },
    options: baseOptions('Distance from pole face (mm)', 'B (mT) · on-axis estimate')
  });
}

export function forceChart(canvas, magnet, params = {}) {
  if (!Chart || !canvas) return null;
  const br = magnet?.br ? (magnet.br[0] + magnet.br[1]) / 2 : 1.2;
  const strength = (params.strength ?? 100) / 100;
  const volume = 0.06 * 0.016 * 0.012;
  const moment = Physics.magneticMoment(br * strength, volume);
  const distances = Array.from({ length: 24 }, (_, i) => 10 + i * 4);
  const values = distances.map(mm => Math.abs(Physics.coaxialDipoleForce(moment, moment, mm * 0.001)));
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: distances.map(d => d.toFixed(0)),
      datasets: [{
        label: 'Far-field force magnitude',
        data: values,
        borderColor: PALETTE[2],
        backgroundColor: gradient(ctx, PALETTE[2]),
        fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2
      }]
    },
    options: { ...baseOptions('Centre separation (mm)', '|F| (N) · dipole approximation'), scales: { ...baseOptions('', '').scales, y: { ...baseOptions('', '').scales.y, type: 'logarithmic', title: { display: true, text: '|F| (N), log scale', color: '#6f87a1', font: { size: 9 } } } } }
  });
}

export function alloyChart(canvas, alloy) {
  if (!Chart || !canvas || !alloy) return null;
  const thicknesses = [0.5, 1, 2, 5, 10, 20, 50];
  const massFor = mat => thicknesses.map(t => Physics.plateMass({ density: ((mat.density?.[0] || 7.8) + (mat.density?.[1] || mat.density?.[0] || 7.8)) / 2 * 1000, area: 0.06 * 0.04, thickness: t * 0.001 }) * 1000);
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: thicknesses.map(t => `${t}`),
      datasets: [
        { label: `${alloy.materialA.name} mass (g)`, data: massFor(alloy.materialA), backgroundColor: PALETTE[0] + 'cc', borderColor: PALETTE[0], borderWidth: 1, borderRadius: 4 },
        { label: `${alloy.materialB.name} mass (g)`, data: massFor(alloy.materialB), backgroundColor: PALETTE[2] + 'cc', borderColor: PALETTE[2], borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: { ...baseOptions('Plate thickness (mm)', 'Mass of 60 × 40 mm plate (g)'), plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, padding: 12 } } } }
  });
}

export function electroChart(canvas, device, params) {
  if (!Chart || !canvas) return null;
  const currents = Array.from({ length: 20 }, (_, i) => i * 0.5);
  const coreMu = params.core === 'iron' ? 800 : params.core === 'ferrite' ? 200 : 1;
  const saturation = params.core === 'ferrite' ? 0.4 : 1.6;
  const values = currents.map(current => Physics.magneticCircuitField({
    current, turns: params.turns, coreLength: (params.length || 60) * 0.001,
    gap: (params.gap || 2) * 0.001, relativePermeability: coreMu, saturation
  }).field * 1000);
  const air = currents.map(current => Physics.finiteSolenoidField({ current, turns: params.turns, length: (params.length || 60) * 0.001, radius: (params.diameter || 20) * 0.001 / 2 }) * 1000);
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: currents.map(i => i.toFixed(1)),
      datasets: [
        { label: 'Magnetic circuit estimate', data: values, borderColor: PALETTE[0], backgroundColor: gradient(ctx, PALETTE[0]), fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2 },
        { label: 'Finite air-core solenoid', data: air, borderColor: PALETTE[3], borderDash: [5, 4], tension: 0.2, pointRadius: 0, borderWidth: 1.5, fill: false }
      ]
    },
    options: { ...baseOptions('Current (A)', 'B (mT)'), plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, padding: 12 } } } }
  });
}

export function generatorChart(canvas, device, params) {
  if (!Chart || !canvas) return null;
  const turns = params.turns || 200;
  const area = Math.PI * Math.pow(((params.diameter || 40) * 0.001) / 2, 2);
  const B = 0.35;
  const rpms = Array.from({ length: 60 }, (_, i) => i * 50);
  const emf = n => rpms.map(rpm => n * B * area * (rpm * Math.PI * 2 / 60));
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: rpms.map(r => r.toFixed(0)),
      datasets: [
        { label: `EMF peak · ${turns} turns`, data: emf(turns), borderColor: PALETTE[1], backgroundColor: gradient(ctx, PALETTE[1]), fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2 },
        { label: `EMF peak · ${turns * 2} turns`, data: emf(turns * 2), borderColor: PALETTE[3], borderDash: [5, 4], tension: 0.25, pointRadius: 0, borderWidth: 1.5, fill: false }
      ]
    },
    options: { ...baseOptions('Rotor speed (rpm)', 'Induced EMF (V peak)'), plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, padding: 12 } } } }
  });
}

export function teslaChart(canvas, params) {
  if (!Chart || !canvas) return null;
  const f0 = params.resonantFrequency || 250;
  const q = params.qualityFactor || 40;
  const freqs = Array.from({ length: 60 }, (_, i) => f0 * (0.5 + i / 60));
  const response = freqs.map(f => {
    const r = f / f0;
    return 1 / Math.sqrt(1 + Math.pow(q * (r - 1 / r), 2));
  });
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: freqs.map(f => f.toFixed(0)),
      datasets: [{
        label: 'Relative secondary response',
        data: response,
        borderColor: PALETTE[2],
        backgroundColor: gradient(ctx, PALETTE[2]),
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
      }]
    },
    options: baseOptions('Drive frequency (kHz)', 'Normalized response · ideal series RLC')
  });
}

export function temperatureChart(canvas, magnet) {
  if (!Chart || !canvas) return null;
  const br20 = magnet?.br ? (magnet.br[0] + magnet.br[1]) / 2 : 1.2;
  const temps = Array.from({ length: 25 }, (_, i) => 20 + i * 12);
  const values = temps.map(temperature => Physics.temperatureRemanence({
    br20, temperature, coefficient: -0.0011, maxOperating: magnet?.maxTemp || 80, curie: magnet?.curie || 310
  }).br);
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: temps.map(t => t.toFixed(0)),
      datasets: [{
        label: 'Reversible remanence estimate',
        data: values,
        borderColor: PALETTE[5],
        backgroundColor: gradient(ctx, PALETTE[5]),
        fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2,
        segment: { borderDash: ctx2 => ctx2.p0.parsed.x > (magnet?.maxTemp || 80) ? [4, 4] : undefined }
      }]
    },
    options: baseOptions('Temperature (°C)', 'Br (T) · reversible region only')
  });
}

export function shieldingChart(canvas, material, thicknessMm) {
  if (!Chart || !canvas) return null;
  const freqs = [0.05, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000];
  const mu = material?.category === 'ferromagnetic' ? 200 : 1;
  const sigma = ((material?.conductivity?.[0] || 1) * 1e6);
  const transmission = freqs.map(kHz => Physics.shieldingEstimate({
    thickness: thicknessMm * 0.001, frequency: kHz * 1000, relativePermeability: mu, conductivity: sigma
  }).transmission * 100);
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: freqs.map(f => f >= 1 ? `${f}k` : `${f * 1000}`),
      datasets: [{
        label: 'Plane-wave transmission',
        data: transmission,
        borderColor: PALETTE[4],
        backgroundColor: gradient(ctx, PALETTE[4]),
        fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2
      }]
    },
    options: { ...baseOptions('Frequency (Hz)', 'Transmission (%) · far-field plane-wave model'), scales: { ...baseOptions('', '').scales, x: { ...baseOptions('', '').scales.x, type: 'logarithmic', title: { display: true, text: 'Frequency (Hz), log', color: '#6f87a1', font: { size: 9 } } } } }
  });
}

export { PALETTE };