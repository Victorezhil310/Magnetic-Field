import * as Physics from './physics.js';
import { icon, esc } from './ui.js';

/**
 * Interactive Virtual Physics Professor & Teaching Assistant Engine
 */

export function getProfessorGuide({ route, magnet, material, device, experiment, concept, params, deviceParams, alloy }) {
  let title = 'Professor’s Physics Briefing';
  let overview = '';
  let components = [];
  let interactionPhysics = '';
  let forceType = 'Attraction / Dipole Alignment';
  let howToTweak = [];
  let realWorldUse = [];

  if (route === 'concepts' || concept) {
    const c = concept || {};
    title = `Professor's Guide: ${c.title || 'Concept Project'}`;
    overview = c.summary || 'Exploring physical magnetic interactions.';
    components = [
      `Active Magnet: ${c.magnet || magnet?.name || 'N52 Neodymium'}`,
      `Specimen / Core: ${c.material || material?.name || 'Soft Iron'}`,
      `Device Winding: ${c.device || device?.name || 'Solenoid'}`
    ];
    interactionPhysics = c.physicsExplanation || 'Field vectors combine according to superposition and Maxwell equations.';
    howToTweak = [
      'Use the Concept Scrubber Bar (numbers 1 to 1000+) to jump between permutations.',
      'Adjust the Pole Gap slider to see how field density drops with distance.',
      'Toggle Field Lines, Iron Filings, and Heatmap overlays to visualize flux.'
    ];
    realWorldUse = ['High-efficiency electric vehicles', 'Maglev trains', 'Particle accelerators'];
  } else if (route === 'field') {
    title = 'Professor’s Guide: Two-Magnet Interaction Stage';
    const isRepel = params?.polarity === 'repel';
    overview = isRepel
      ? 'Like poles face each other (N ↔ N). Magnetic field lines cannot intersect, forcing flux vectors outward.'
      : 'Unlike poles face each other (N ↔ S). Magnetic flux connects across the gap, forming closed loops.';
    components = [
      `Magnet A: ${magnet?.name || 'N52 Neodymium Bar'}`,
      `Magnet B: ${magnet?.name || 'N52 Neodymium Bar'}`,
      `Gap: ${params?.gap || 40} mm | Polarity: ${isRepel ? 'Repulsion (N ↔ N)' : 'Attraction (N ↔ S)'}`
    ];
    interactionPhysics = `Coaxial dipole force scales in the far field as F ≈ 3μ₀ m₁ m₂ / (2π r⁴). At a gap of ${params?.gap} mm, ${isRepel ? 'repulsive force compresses flux laterally.' : 'attractive force accelerates magnets together.'}`;
    forceType = isRepel ? 'Repulsion (Pushes Magnets Apart)' : 'Attraction (Pulls Magnets Together)';
    howToTweak = [
      'Click "Flip Polarity" to instantly switch between Attraction and Repulsion.',
      'Drag Magnet B laterally in the 3D viewport to test off-axis shear force.',
      'Lower the gap to 5 mm to observe near-field magnetic saturation.'
    ];
    realWorldUse = ['Magnetic latches', 'Magnetic bearings', 'Vibration dampeners'];
  } else if (route === 'electro') {
    const d = device || {};
    title = `Professor’s Guide: ${d.name || 'Electromagnetism'}`;
    overview = d.description || 'Current flowing through conductors generates a magnetic field according to Ampere-Maxwell law.';
    components = [
      `Device Assembly: ${d.name}`,
      `Current I: ${deviceParams?.current || 1.5} Amperes`,
      `Coil Turns N: ${deviceParams?.turns || 300} turns`,
      `Core Material: ${deviceParams?.core || 'Iron Core'}`
    ];
    interactionPhysics = d.physics || 'Electrons moving through the coil generate B = μ₀ n I.';
    howToTweak = [
      'Increase Voltage and Current sliders to boost magnetic flux B.',
      'Switch Core Material from Air to Iron to observe up to 800x permeability boost.',
      'Increase Turn count N to build higher magnetomotive force (NI ampere-turns).'
    ];
    realWorldUse = ['Electric motors', 'Transformers', 'Relays', 'MRI scanners'];
  } else if (route === 'materials' || route === 'alloy') {
    const m = material || {};
    title = `Professor’s Guide: ${m.name || 'Material Specimen'}`;
    overview = m.magnetic?.explanation || 'Materials respond differently to magnetic fields based on electron spin alignment.';
    components = [
      `Specimen: ${m.name}`,
      `Category: ${m.category?.toUpperCase() || 'FERROMAGNETIC'}`,
      `Relative Permeability: ${m.magnetic?.relativePermeability || 'High'}`
    ];
    interactionPhysics = `Relative permeability μ_r determines whether flux passes through easily (high μ_r) or is repelled (diamagnetic μ_r < 1).`;
    howToTweak = [
      'Change plate thickness using the custom thickness input.',
      'Select high-permeability materials like Mu-Metal or Permalloy to see DC flux shunting.',
      'Select Copper or Aluminium to observe AC eddy-current skin-depth shielding.'
    ];
    realWorldUse = m.applications || ['Magnetic shielding', 'Transformer cores'];
  } else {
    title = 'Professor’s Overview: Magnetic Science Laboratory';
    overview = 'Welcome to the 3D Science Lab. Every visual element is governed by true SI electromagnetic equations.';
    components = [
      `Selected Specimen: ${magnet?.name || 'N52 Neodymium'}`,
      'Interactive 3D Viewport with Orbit, Zoom, Pan & Drag',
      'Real-time Dipole & Circuit Field Solvers'
    ];
    interactionPhysics = 'Atomic dipole moments combine vectorially to generate continuous magnetic B fields (div B = 0).';
    howToTweak = [
      'Navigate to Concept Projects (Shortcut 0) to explore 1000+ combinations.',
      'Use Tools & Calculators (Shortcut T) for Biot-Savart and Maxwell stress solvers.',
      'Test your knowledge in the Physics Quiz Trainer (Shortcut Q).'
    ];
    realWorldUse = ['Education', 'Engineering design', 'Physics research'];
  }

  return `
    <article class="info-card professor-card" style="border-color:var(--cyan);background:linear-gradient(135deg,rgba(53,230,255,.06),rgba(10,18,30,.9))">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
        <h3 style="margin:0;color:var(--cyan)">${icon('spark')} ${esc(title)}</h3>
        <span class="badge-accent">AI PROFESSOR MODE</span>
      </div>
      <p class="prose" style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:12px">${esc(overview)}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:var(--surface-2);padding:10px;border-radius:8px">
          <strong style="font-size:11px;color:var(--cyan);display:block;margin-bottom:6px">COMPONENT BREAKDOWN</strong>
          <ul style="padding-left:16px;margin:0;font-size:11px;color:var(--muted)">
            ${components.map(c => `<li>${esc(c)}</li>`).join('')}
          </ul>
        </div>
        <div style="background:var(--surface-2);padding:10px;border-radius:8px">
          <strong style="font-size:11px;color:var(--amber);display:block;margin-bottom:6px">FORCE & MECHANISM</strong>
          <span style="font-size:11px;color:var(--text);font-weight:600">${esc(forceType)}</span>
          <p style="font-size:11px;color:var(--cool);margin:4px 0 0">${esc(interactionPhysics.slice(0, 140))}…</p>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong style="font-size:11px;color:var(--text);display:block;margin-bottom:4px">💡 HOW TO INCREASE OR DECREASE THE EFFECT:</strong>
        <ul style="padding-left:18px;margin:0;font-size:11px;color:var(--cool)">
          ${howToTweak.map(h => `<li>${esc(h)}</li>`).join('')}
        </ul>
      </div>

      <div>
        <strong style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">🌍 REAL-WORLD APPLICATIONS:</strong>
        <div class="tag-list">${realWorldUse.map(u => `<span class="tag cyan">${esc(u)}</span>`).join('')}</div>
      </div>
    </article>
  `;
}
