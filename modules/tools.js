import * as Physics from './physics.js';
import { MAGNETS, MATERIALS, DEVICES, REFERENCES } from './data.js';

/**
 * Advanced Student & Professional Engineering Tools Module
 */

export const CALCULATORS = [
  {
    id: 'biot-savart',
    name: 'Biot-Savart Loop Field Calculator',
    category: 'Student & Research',
    description: 'Calculate axial magnetic flux density B on the central axis of a circular current loop.',
    inputs: [
      { id: 'bs-current', label: 'Current I (Amperes)', min: 0.1, max: 100, step: 0.1, default: 2, unit: 'A' },
      { id: 'bs-turns', label: 'Loop Turns N', min: 1, max: 2000, step: 1, default: 100, unit: 'turns' },
      { id: 'bs-radius', label: 'Loop Radius R (mm)', min: 1, max: 500, step: 1, default: 25, unit: 'mm' },
      { id: 'bs-distance', label: 'Axial Distance z (mm)', min: 0, max: 500, step: 1, default: 10, unit: 'mm' }
    ],
    calculate: (I, N, Rmm, zmm) => {
      const R = Rmm * 0.001;
      const z = zmm * 0.001;
      const denom = Math.pow(R * R + z * z, 1.5);
      if (denom === 0) return { fieldT: 0, text: 'Invalid geometry' };
      const B = (Physics.MU0 * N * I * R * R) / (2 * denom);
      const energyDensity = (B * B) / (2 * Physics.MU0);
      return {
        fieldT: B,
        formattedB: Physics.formatField(B),
        energyDensityJm3: energyDensity.toFixed(2),
        text: `Center axial field at z=${zmm} mm is ${Physics.formatField(B)}. Energy density: ${energyDensity.toFixed(2)} J/m³.`
      };
    }
  },
  {
    id: 'maxwell-pressure',
    name: 'Maxwell Stress & Pull-Force Estimator',
    category: 'Engineering & Pro',
    description: 'Calculate magnetic pull force and contact stress F = B²A / 2μ₀.',
    inputs: [
      { id: 'mp-field', label: 'Pole Flux Density B (Tesla)', min: 0.01, max: 3.0, step: 0.01, default: 1.2, unit: 'T' },
      { id: 'mp-area', label: 'Contact Pole Area A (cm²)', min: 0.1, max: 500, step: 0.5, default: 10, unit: 'cm²' },
      { id: 'mp-gap', label: 'Air Gap (mm)', min: 0, max: 50, step: 0.1, default: 0.5, unit: 'mm' }
    ],
    calculate: (B, Acm2, gapmm) => {
      const A = Acm2 * 1e-4;
      const gap = gapmm * 0.001;
      const effB = gap === 0 ? B : B / (1 + gap / 0.005);
      const forceN = (effB * effB * A) / (2 * Physics.MU0);
      const forceKg = forceN / 9.80665;
      const pressureKPa = (effB * effB) / (2 * Physics.MU0 * 1000);
      return {
        forceN: forceN.toFixed(1),
        forceKg: forceKg.toFixed(2),
        pressureKPa: pressureKPa.toFixed(1),
        text: `Estimated holding force: ${forceN.toFixed(1)} N (${forceKg.toFixed(2)} kgf). Maxwell pressure: ${pressureKPa.toFixed(1)} kPa.`
      };
    }
  },
  {
    id: 'lorentz-deflection',
    name: 'Lorentz Charge Deflection Radius',
    category: 'Physics Research',
    description: 'Calculate gyro-radius / cyclotron radius r = mv / qB for charged particles in B fields.',
    inputs: [
      { id: 'ld-particle', label: 'Particle Type', type: 'select', options: [['electron', 'Electron (e⁻)'], ['proton', 'Proton (p⁺)'], ['alpha', 'Alpha Particle (He²⁺)']], default: 'electron' },
      { id: 'ld-velocity', label: 'Particle Speed v (% speed of light c)', min: 0.1, max: 90, step: 0.1, default: 5, unit: '% c' },
      { id: 'ld-field', label: 'Magnetic Field B (Tesla)', min: 0.001, max: 10, step: 0.01, default: 0.5, unit: 'T' }
    ],
    calculate: (particleType, vPercent, BTesla) => {
      const c = 299792458;
      const v = (vPercent / 100) * c;
      let m = 9.1093837e-31; // electron kg
      let q = 1.60217663e-19; // charge C
      if (particleType === 'proton') { m = 1.67262192e-27; }
      else if (particleType === 'alpha') { m = 6.644657e-27; q = 3.204353e-19; }

      const r = (m * v) / (q * Math.max(1e-6, BTesla));
      const fCyclotron = (q * BTesla) / (2 * Math.PI * m);
      return {
        radiusM: r,
        formattedRadius: r < 0.001 ? `${(r * 1e6).toFixed(1)} µm` : r < 1 ? `${(r * 1000).toFixed(2)} mm` : `${r.toFixed(2)} m`,
        cyclotronFreqMHz: (fCyclotron / 1e6).toFixed(2),
        text: `Cyclotron gyro-radius: ${r < 0.001 ? (r * 1e6).toFixed(1) + ' µm' : (r * 1000).toFixed(2) + ' mm'}. Gyro-frequency: ${(fCyclotron / 1e6).toFixed(2)} MHz.`
      };
    }
  },
  {
    id: 'coil-winding',
    name: 'Coil Winder & Thermal Power Calculator',
    category: 'Engineering & Pro',
    description: 'Calculate copper wire length, resistance R, DC power P = I²R and steady-state thermal heat rise.',
    inputs: [
      { id: 'cw-turns', label: 'Turns N', min: 10, max: 5000, step: 10, default: 400, unit: 'turns' },
      { id: 'cw-diameter', label: 'Mean Coil Diameter (mm)', min: 5, max: 200, step: 1, default: 30, unit: 'mm' },
      { id: 'cw-awg', label: 'Copper Wire Gauge (AWG)', type: 'select', options: [['18', 'AWG 18 (1.02 mm dia)'], ['22', 'AWG 22 (0.64 mm dia)'], ['26', 'AWG 26 (0.40 mm dia)'], ['30', 'AWG 30 (0.25 mm dia)']], default: '22' },
      { id: 'cw-current', label: 'Current I (Amperes)', min: 0.1, max: 20, step: 0.1, default: 2.0, unit: 'A' }
    ],
    calculate: (N, meanDiamMm, awg, I) => {
      const wireResPerM = { '18': 0.021, '22': 0.053, '26': 0.134, '30': 0.338 }[awg] || 0.053;
      const wireDiameterMm = { '18': 1.02, '22': 0.64, '26': 0.40, '30': 0.25 }[awg] || 0.64;
      const lengthM = N * Math.PI * (meanDiamMm * 0.001);
      const resistance = lengthM * wireResPerM;
      const powerW = I * I * resistance;
      const voltageV = I * resistance;
      const estTempRise = powerW * 3.5; // °C approx free air rise factor
      return {
        lengthM: lengthM.toFixed(2),
        resistanceOhms: resistance.toFixed(2),
        powerW: powerW.toFixed(1),
        voltageV: voltageV.toFixed(2),
        estTempRiseC: estTempRise.toFixed(0),
        text: `Wire length: ${lengthM.toFixed(1)} m. Resistance: ${resistance.toFixed(2)} Ω. Voltage drop: ${voltageV.toFixed(1)} V. Power dissipation: ${powerW.toFixed(1)} W (~${estTempRise.toFixed(0)} °C rise in free air).`
      };
    }
  }
];

export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Which of the following metals is ferromagnetic at room temperature?',
    options: ['Copper', 'Cobalt', 'Aluminium', 'Gold'],
    correct: 1,
    explanation: 'Only three elements are ferromagnetic at room temperature: Iron, Nickel, and Cobalt.'
  },
  {
    id: 2,
    question: 'What happens when you heat an N52 Neodymium magnet above its Curie temperature (~310 °C)?',
    options: [
      'It becomes twice as strong.',
      'It retains magnetization permanently.',
      'Thermal agitation destroys domain order and it collapses to paramagnetic.',
      'It turns into a superconductor.'
    ],
    correct: 2,
    explanation: 'At and above Curie temperature Tc, thermal energy overcomes domain alignment, destroying ferromagnetic order.'
  },
  {
    id: 3,
    question: 'Why does a neodymium magnet fall slowly through a thick copper tube even though copper is non-magnetic?',
    options: [
      'Copper absorbs the magnet.',
      'Moving magnetic flux induces eddy currents in copper that oppose motion (Lenz Law).',
      'Copper becomes statically magnetized.',
      'Air pressure inside the tube stops it.'
    ],
    correct: 1,
    explanation: 'Changing magnetic flux in the conductive copper wall induces circulating eddy currents whose magnetic field opposes the magnet fall (Lenz Law).'
  },
  {
    id: 4,
    question: 'According to Earnshaw\'s Theorem, can static permanent magnets levitate each other in 3D without feedback or motion?',
    options: [
      'Yes, easily.',
      'No, static passive levitation of permanent magnets in 3D is strictly unstable.',
      'Only if painted red.',
      'Only at 100 °C.'
    ],
    correct: 1,
    explanation: 'Earnshaw theorem proves static collection of permanent magnets cannot achieve stable 3D passive equilibrium.'
  },
  {
    id: 5,
    question: 'What unique property defines a Halbach Array?',
    options: [
      'It requires liquid helium.',
      'It concentrates magnetic flux on one side while cancelling it on the opposite side.',
      'It converts electricity into gold.',
      'It works only on plastic.'
    ],
    correct: 1,
    explanation: 'A 90-degree spatial rotation of magnetization vectors doubles field strength on one face and cancels stray fields on the back.'
  },
  {
    id: 6,
    question: 'Which material exhibits the highest magnetic flux saturation density (2.45 Tesla)?',
    options: ['Pure Copper', 'Permendur 24 (Fe-Co-V)', 'Mu-Metal', 'Brass'],
    correct: 1,
    explanation: 'Permendur 24 holds the record for highest room-temperature saturation flux density (2.45 T).'
  },
  {
    id: 7,
    question: 'What is the primary mechanism of magnetic shielding using Mu-Metal in static (DC) fields?',
    options: [
      'Reflecting field lines like a mirror.',
      'High permeability redirects and shunts flux lines through low reluctance path.',
      'Absorbing magnetic fields and destroying energy.',
      'Generating heat.'
    ],
    correct: 1,
    explanation: 'High-permeability materials provide a low-reluctance path that guides static magnetic flux around protected enclosures.'
  },
  {
    id: 8,
    question: 'What occurs when you cut a bar magnet in half across its axis?',
    options: [
      'You get an isolated North monopole and South monopole.',
      'You get two complete magnets, each with its own North and South poles.',
      'It loses all magnetism instantly.',
      'It explodes.'
    ],
    correct: 1,
    explanation: 'Magnetism is dipolar domain ordering. Cutting a magnet yields two complete dipolar magnets (div B = 0).'
  }
];

export function recommendMagnet({ maxTemp, minBr, maxBudget, corrosionRisk }) {
  const recommendations = MAGNETS.map(m => {
    let score = 100;
    const reasons = [];
    if (maxTemp > (m.maxTemp || 80)) {
      score -= 50;
      reasons.push(`Operating temp (${maxTemp} °C) exceeds max rating (${m.maxTemp || 80} °C).`);
    }
    if (minBr && m.br && m.br[0] < minBr) {
      score -= 30;
      reasons.push(`Remanence Br (${m.br[0]} T) below target (${minBr} T).`);
    }
    if (corrosionRisk && m.family.includes('Neodymium')) {
      score -= 20;
      reasons.push('Requires nickel plating in moist/corrosive environments.');
    }
    return { magnet: m, score: Math.max(0, score), reasons };
  }).sort((a, b) => b.score - a.score);

  return recommendations;
}
