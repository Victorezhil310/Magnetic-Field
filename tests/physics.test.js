import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MU0,
  finiteSolenoidField,
  magneticCircuitField,
  dipoleField,
  fieldAt,
  magneticMoment,
  traceFieldLine,
  coaxialDipoleForce,
  contactForceEstimate,
  cylinderAxialField,
  skinDepth,
  shieldingEstimate,
  plateMass,
  temperatureRemanence,
  cutMagnet,
  formatField,
  clamp,
  lerp,
  MODEL_NOTES,
} from '../modules/physics.js';

const close = (actual, expected, relTol = 1e-9, absTol = 1e-15) => {
  const diff = Math.abs(actual - expected);
  const tol = Math.max(absTol, relTol * Math.abs(expected));
  assert.ok(diff <= tol, `expected ${actual} to be within ${tol} of ${expected} (diff ${diff})`);
};

const vecClose = (actual, expected, relTol = 1e-9, absTol = 1e-15) => {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i += 1) close(actual[i], expected[i], relTol, absTol);
};

test('MU0 is the conventional vacuum permeability', () => {
  close(MU0, 4 * Math.PI * 1e-7, 1e-12);
  assert.ok(MU0 > 0);
});

test('finite solenoid approaches the long-solenoid limit mu0*n*I', () => {
  const n = 2000; // turns per metre
  const I = 3;
  const L = 2;
  const solenoid = finiteSolenoidField({ current: I, turns: n * L, length: L, radius: 0.005 });
  const ideal = MU0 * n * I;
  close(solenoid, ideal, 1e-4); // finite length correction is tiny but nonzero
  assert.ok(solenoid < ideal);
});

test('finite solenoid approaches the flat-coil limit as length -> 0', () => {
  const N = 12;
  const I = 2;
  const R = 0.04;
  const flat = finiteSolenoidField({ current: I, turns: N, length: 1e-12, radius: R });
  close(flat, (MU0 * N * I) / (2 * R), 1e-6);
});

test('finite solenoid is signed, zero-safe and validates geometry', () => {
  assert.equal(finiteSolenoidField({ current: 0, turns: 100, length: 0.1, radius: 0.01 }), 0);
  assert.equal(finiteSolenoidField({ current: 5, turns: 0, length: 0.1, radius: 0.01 }), 0);
  const negative = finiteSolenoidField({ current: -2, turns: 100, length: 0.1, radius: 0.01 });
  assert.ok(negative < 0);
  assert.throws(() => finiteSolenoidField({ current: 1, turns: 1, length: 0, radius: 0 }), RangeError);
});

test('magnetic circuit uses the reluctance denominator and reports flags', () => {
  const result = magneticCircuitField({
    current: 2,
    turns: 150,
    coreLength: 0.2,
    gap: 0.001,
    relativePermeability: 2000,
    saturation: 1.6,
  });
  const expected = (MU0 * 150 * 2) / (0.001 + 0.2 / 2000);
  close(result.idealField, expected);
  close(result.field, expected);
  assert.equal(result.saturated, false);
  assert.equal(result.reluctanceLimited, false); // core term 1e-4 < gap 1e-3
});

test('magnetic circuit caps at saturation and flags it', () => {
  const result = magneticCircuitField({
    current: 10,
    turns: 500,
    coreLength: 0.1,
    gap: 0.0005,
    relativePermeability: 5000,
    saturation: 0.8,
  });
  assert.ok(result.idealField > 0.8);
  close(result.field, 0.8);
  assert.equal(result.saturated, true);
});

test('magnetic circuit flags reluctance-limited cores and handles negative current', () => {
  const limited = magneticCircuitField({
    current: 1,
    turns: 100,
    coreLength: 0.1,
    gap: 1e-6,
    relativePermeability: 100,
    saturation: 2,
  });
  assert.equal(limited.reluctanceLimited, true); // core term 1e-3 >> gap
  const reversed = magneticCircuitField({
    current: -1,
    turns: 100,
    coreLength: 0.1,
    gap: 0.001,
    relativePermeability: 1000,
    saturation: 2,
  });
  assert.ok(reversed.field < 0);
  assert.equal(reversed.saturated, false);
});

test('dipole far field matches the analytic point-dipole expression', () => {
  const source = { position: [0, 0, 0], moment: [0, 0, 1], radius: 0.01 };
  const point = [0.03, 0.04, 0.05];
  const r = Math.hypot(...point);
  const mdotr = point[2];
  const k = MU0 / (4 * Math.PI);
  const expected = [
    k * (3 * point[0] * mdotr / r ** 5),
    k * (3 * point[1] * mdotr / r ** 5),
    k * (3 * point[2] * mdotr / r ** 5 - 1 / r ** 3),
  ];
  vecClose(dipoleField(point, source), expected, 1e-12);
});

test('dipole field is inversion-symmetric and finite at the source centre', () => {
  const source = { position: [0.01, -0.02, 0.03], moment: [0.4, -0.7, 1.1], radius: 0.02 };
  const p = [0.05, 0.01, -0.02];
  const mirrored = [
    2 * source.position[0] - p[0],
    2 * source.position[1] - p[1],
    2 * source.position[2] - p[2],
  ];
  vecClose(dipoleField(p, source), dipoleField(mirrored, source), 1e-12);

  const centre = dipoleField(source.position, source);
  const sphereScale = MU0 / (2 * Math.PI * source.radius ** 3);
  vecClose(centre, source.moment.map((m) => m * sphereScale), 1e-12);
  assert.ok(centre.every(Number.isFinite));
});

test('dipole field is continuous across the source boundary in every direction', () => {
  const source = { position: [0, 0, 0], moment: [0.3, -0.5, 0.8], radius: 0.02 };
  const directions = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, -2, 3],
  ];
  for (const dir of directions) {
    const norm = Math.hypot(...dir);
    const n = dir.map((d) => d / norm);
    const eps = 1e-9;
    const inside = dipoleField(n.map((c) => c * (source.radius - eps)), source);
    const outside = dipoleField(n.map((c) => c * (source.radius + eps)), source);
    vecClose(inside, outside, 1e-6, 1e-12);
  }
});

test('fieldAt superposes sources and returns zero for an empty list', () => {
  const a = { position: [0, 0, 0], moment: [0, 0, 1], radius: 0.01 };
  const b = { position: [0.05, 0, 0], moment: [0, 0, -1], radius: 0.01 };
  const p = [0.02, 0.01, 0.03];
  const sum = fieldAt(p, [a, b]);
  const manual = dipoleField(p, a).map((v, i) => v + dipoleField(p, b)[i]);
  vecClose(sum, manual, 1e-12);
  assert.deepEqual(fieldAt(p, []), [0, 0, 0]);
});

test('magneticMoment converts remanence and volume to A*m^2', () => {
  close(magneticMoment(1.2, 1e-6), (1.2 * 1e-6) / MU0, 1e-12);
  assert.equal(magneticMoment(1.2, 0), 0);
});

test('traceFieldLine returns a finite deterministic RK4 path', () => {
  const sources = [{ position: [0, 0, 0], moment: [0, 0, 1], radius: 0.01 }];
  const options = { step: 0.002, maxSteps: 400, bounds: 0.3, stopRadius: 0.012 };
  const first = traceFieldLine([0.05, 0, 0], sources, options);
  const second = traceFieldLine([0.05, 0, 0], sources, options);
  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.ok(first.length <= options.maxSteps + 1);
  assert.deepEqual(first[0], [0.05, 0, 0]);
  for (const point of first) {
    assert.equal(point.length, 3);
    assert.ok(point.every(Number.isFinite));
    assert.ok(Math.max(...point.map(Math.abs)) <= options.bounds + options.step);
  }
});

test('traceFieldLine stops immediately inside a sink and with no sources', () => {
  const sources = [{ position: [0, 0, 0], moment: [0, 0, 1], radius: 0.01 }];
  assert.deepEqual(traceFieldLine([0, 0, 0], sources), [[0, 0, 0]]);
  assert.deepEqual(traceFieldLine([0.05, 0, 0], []), [[0.05, 0, 0]]);
});

test('coaxial dipole force has the lab repulsive-positive sign and r^-4 scaling', () => {
  const repulsive = coaxialDipoleForce(1, 1, 0.1);
  const attractive = coaxialDipoleForce(1, -1, 0.1);
  assert.ok(repulsive > 0);
  assert.ok(attractive < 0);
  close(repulsive, (3 * MU0) / (2 * Math.PI * 0.1 ** 4), 1e-12);
  const doubled = coaxialDipoleForce(1, 1, 0.2);
  close(repulsive / doubled, 16, 1e-12);
  assert.throws(() => coaxialDipoleForce(1, 1, 0), RangeError);
});

test('cylinder axial field handles the pole face and the long-magnet limit', () => {
  const br = 1.3;
  const R = 0.01;
  const L = 0.02;
  const face = cylinderAxialField({ remanence: br, radius: R, length: L, distance: 0 });
  close(face, 0.5 * br * (L / Math.sqrt(R * R + L * L)), 1e-12);
  const long = cylinderAxialField({ remanence: br, radius: R, length: 100, distance: 0 });
  close(long, br / 2, 1e-4);
  assert.equal(cylinderAxialField({ remanence: br, radius: R, length: 0, distance: 0 }), 0);
  const far = cylinderAxialField({ remanence: br, radius: R, length: L, distance: 1 });
  assert.ok(far > 0 && far < face);
});

test('contact force uses Maxwell pressure and lists assumptions', () => {
  const estimate = contactForceEstimate({ remanence: 1.2, area: 1e-4, gap: 0, radius: 0.01 });
  close(estimate.field, 0.6, 1e-3); // long-cylinder surface limit ~ Br/2
  close(estimate.force, (estimate.field ** 2 * 1e-4) / (2 * MU0), 1e-12);
  assert.ok(estimate.force > 0);
  assert.ok(Array.isArray(estimate.assumptions) && estimate.assumptions.length >= 2);

  const finiteLength = contactForceEstimate({ remanence: 1.2, area: 1e-4, gap: 0.001, radius: 0.01, length: 0.01 });
  const expectedField = cylinderAxialField({ remanence: 1.2, radius: 0.01, length: 0.01, distance: 0.001 });
  close(finiteLength.field, expectedField, 1e-12);
  close(finiteLength.force, (expectedField ** 2 * 1e-4) / (2 * MU0), 1e-12);
});

test('skin depth follows the classical good-conductor formula', () => {
  const copper = skinDepth({ frequency: 1e6, permeability: MU0, conductivity: 5.8e7 });
  close(copper, Math.sqrt(1 / (Math.PI * 1e6 * MU0 * 5.8e7)), 1e-12);
  assert.ok(copper > 6e-5 && copper < 7e-5);
  assert.equal(skinDepth({ frequency: 0, permeability: MU0, conductivity: 5.8e7 }), Infinity);
  // Higher frequency -> shallower penetration (1/sqrt(f)).
  const higher = skinDepth({ frequency: 4e6, permeability: MU0, conductivity: 5.8e7 });
  close(copper / higher, 2, 1e-12);
});

test('shielding estimate is a labelled plane-wave model with no DC claim', () => {
  const result = shieldingEstimate({ thickness: 1e-4, frequency: 1e6, relativePermeability: 1, conductivity: 5.8e7 });
  const delta = skinDepth({ frequency: 1e6, permeability: MU0, conductivity: 5.8e7 });
  close(result.skinDepth, delta, 1e-12);
  close(result.attenuation, 1e-4 / delta, 1e-12);
  close(result.transmission, Math.exp(-1e-4 / delta), 1e-12);
  close(result.decibels, (20 / Math.LN10) * (1e-4 / delta), 1e-12);
  assert.match(result.model, /plane-wave far-field/i);

  const oneSkin = shieldingEstimate({ thickness: delta, frequency: 1e6, relativePermeability: 1, conductivity: 5.8e7 });
  close(oneSkin.transmission, Math.exp(-1), 1e-12);
  close(oneSkin.decibels, 8.685889638, 1e-6);

  const dc = shieldingEstimate({ thickness: 1e-3, frequency: 0, relativePermeability: 1000, conductivity: 1e7 });
  assert.equal(dc.decibels, null);
  assert.equal(dc.transmission, null);
  assert.equal(dc.skinDepth, Infinity);
  assert.match(dc.model, /DC/i);
});

test('plate mass multiplies density, area and thickness', () => {
  close(plateMass({ density: 7850, area: 0.01, thickness: 0.001 }), 0.0785, 1e-12);
  assert.equal(plateMass({ density: 7850, area: 0, thickness: 0.001 }), 0);
});

test('temperature remanence is linear and reversible below the operating limit', () => {
  const result = temperatureRemanence({ br20: 1.2, temperature: 60, coefficient: -0.0012, maxOperating: 120, curie: 310 });
  close(result.br, 1.2 * (1 - 0.0012 * 40), 1e-12);
  close(result.reversibleFraction, 1 - 0.0012 * 40, 1e-12);
  assert.equal(result.regime, 'reversible');
  assert.equal(result.warning, null);
});

test('temperature remanence warns above operating temperature without inventing loss', () => {
  const result = temperatureRemanence({ br20: 1.2, temperature: 150, coefficient: -0.0012, maxOperating: 120, curie: 310 });
  assert.equal(result.regime, 'above-operating');
  assert.ok(typeof result.warning === 'string' && result.warning.length > 0);
  assert.ok(result.br <= 1.2);
  assert.ok(Number.isFinite(result.br));
});

test('temperature remanence is qualitative near and above Curie', () => {
  const near = temperatureRemanence({ br20: 1.2, temperature: 300, coefficient: -0.0012, maxOperating: 120, curie: 310 });
  assert.equal(near.regime, 'near-curie');
  assert.equal(near.br, 0);
  assert.ok(near.warning);

  const above = temperatureRemanence({ br20: 1.2, temperature: 320, coefficient: -0.0012, maxOperating: 120, curie: 310 });
  assert.equal(above.regime, 'above-curie');
  assert.equal(above.br, 0);
  assert.equal(above.reversibleFraction, 0);
  assert.ok(above.warning);
});

test('cutting a magnet yields two half-length dipolar pieces, never monopoles', () => {
  const magnet = {
    id: 'm1',
    position: [0, 0, 0],
    moment: [0, 0, 0.8],
    radius: 0.01,
    length: 0.04,
    remanence: 1.25,
    volume: 1.2e-5,
  };
  const original = JSON.parse(JSON.stringify(magnet));
  const pieces = cutMagnet(magnet);
  assert.equal(pieces.length, 2);
  for (const piece of pieces) {
    close(piece.length, 0.02, 1e-12);
    assert.equal(piece.remanence, magnet.remanence);
    assert.equal(piece.radius, magnet.radius);
    assert.ok(piece.poles.includes('north') && piece.poles.includes('south'));
    close(piece.moment[2], 0.4, 1e-12);
    close(piece.volume, magnet.volume / 2, 1e-12);
    assert.ok(piece.position.every(Number.isFinite));
  }
  // Pieces sit on opposite sides of the original centre along the axis.
  close(pieces[0].position[2], -0.01, 1e-12);
  close(pieces[1].position[2], 0.01, 1e-12);
  assert.deepEqual(magnet, original); // input is not mutated
});

test('formatField picks readable units without fake precision', () => {
  assert.equal(formatField(0), '0 T');
  assert.equal(formatField(1.234), '1.23 T');
  assert.equal(formatField(0.001234), '1.23 mT');
  assert.equal(formatField(0.000001234), '1.23 uT');
  assert.equal(formatField(-0.005), '-5 mT');
  assert.match(formatField(1e-9), /e-9 T/);
});

test('clamp and lerp behave', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
  assert.equal(clamp(2, 3, 0), 2); // order-insensitive
  assert.equal(lerp(0, 10, 0.25), 2.5);
  assert.equal(lerp(2, 4, 1.5), 5);
});

test('MODEL_NOTES documents every model', () => {
  const keys = [
    'solenoid', 'magneticCircuit', 'dipole', 'fieldLine', 'coaxialForce',
    'contactForce', 'cylinderAxial', 'skinDepth', 'shielding', 'plateMass',
    'temperature', 'cutMagnet', 'formatField',
  ];
  for (const key of keys) {
    assert.ok(typeof MODEL_NOTES[key] === 'string' && MODEL_NOTES[key].length > 10, `missing note: ${key}`);
  }
});

import { getConceptCombination } from '../modules/data.js';
import { CALCULATORS, QUIZ_QUESTIONS, recommendMagnet } from '../modules/tools.js';

test('getConceptCombination produces valid physical parameters for 1000+ permutations', () => {
  for (let i = 1; i <= 1000; i += 1) {
    const concept = getConceptCombination(i);
    assert.ok(concept, `concept ${i} should exist`);
    assert.ok(typeof concept.title === 'string' && concept.title.length > 5, `concept ${i} title missing`);
    assert.ok(concept.params && typeof concept.params.strength === 'number', `concept ${i} params missing`);
    assert.ok(Number.isFinite(concept.params.strength), `concept ${i} strength finite`);
    assert.ok(Number.isFinite(concept.params.gap), `concept ${i} gap finite`);
  }
});

test('CALCULATORS calculate correct physics outputs', () => {
  const biot = CALCULATORS.find(c => c.id === 'biot-savart');
  const biotRes = biot.calculate(2, 100, 25, 10);
  assert.ok(biotRes.fieldT > 0);
  assert.ok(biotRes.formattedB.length > 0);

  const maxwell = CALCULATORS.find(c => c.id === 'maxwell-pressure');
  const maxRes = maxwell.calculate(1.2, 10, 0);
  assert.ok(Number(maxRes.forceN) > 0);

  const lorentz = CALCULATORS.find(c => c.id === 'lorentz-deflection');
  const lorRes = lorentz.calculate('electron', 5, 0.5);
  assert.ok(lorRes.radiusM > 0);

  const winder = CALCULATORS.find(c => c.id === 'coil-winding');
  const winRes = winder.calculate(400, 30, '22', 2.0);
  assert.ok(Number(winRes.resistanceOhms) > 0);
});

test('QUIZ_QUESTIONS and recommendMagnet operate cleanly', () => {
  assert.ok(QUIZ_QUESTIONS.length >= 8);
  for (const q of QUIZ_QUESTIONS) {
    assert.ok(q.question && q.options.length === 4);
    assert.ok(q.correct >= 0 && q.correct < 4);
  }

  const recs = recommendMagnet({ maxTemp: 100, minBr: 1.0, corrosionRisk: true });
  assert.ok(recs.length > 0);
  assert.ok(recs[0].score >= 0);
});

import { blackHoleMagneticJet, gravitationalLensingAngle, cosmicScaleConverter } from '../modules/physics.js';
import { getProfessorGuide } from '../modules/teacher.js';

test('Astrophysics models, cosmic scale converter and professor guide operate cleanly', () => {
  const jet = blackHoleMagneticJet({ massSolar: 10, spinParameter: 0.9, magneticField: 100 });
  assert.ok(jet.jetPowerWatts > 0);
  assert.ok(jet.horizonRadiusM > 0);

  const lens = gravitationalLensingAngle({ massSolar: 1, impactParameterKm: 700000 });
  assert.ok(lens.angleArcsec > 0);

  const cosmic = cosmicScaleConverter(-35);
  assert.equal(cosmic.exponent, -35);
  assert.ok(cosmic.name.includes('Planck'));

  const cosmicMax = cosmicScaleConverter(26);
  assert.equal(cosmicMax.exponent, 26);
  assert.ok(cosmicMax.name.includes('Multiverse'));

  const prof = getProfessorGuide({ route: 'field', params: { polarity: 'repel', gap: 20 } });
  assert.ok(typeof prof === 'string' && prof.includes('AI PROFESSOR MODE'));
});