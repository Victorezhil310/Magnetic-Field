/**
 * Pure SI physics helpers for the magnetic science lab.
 * No dependencies. All lengths are metres, fields tesla, forces newtons,
 * moments A*m^2, mass kg, temperature degrees Celsius.
 */

// Conventional rounded vacuum permeability (H/m). Adequate for a teaching lab;
// the post-2019 SI measured value differs only in the 10th significant digit.
export const MU0 = 4 * Math.PI * 1e-7;

const FOUR_PI = 4 * Math.PI;
const WEAK_FIELD_T = 1e-12;

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function nonNegative(value, name) {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must be >= 0`);
  return value;
}

function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be > 0`);
  return value;
}

function vector3(value, name) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${name} must be an [x, y, z] array`);
  }
  return [finite(value[0], `${name}[0]`), finite(value[1], `${name}[1]`), finite(value[2], `${name}[2]`)];
}

function magnitude3(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Axial centre field of a finite air-core solenoid (thin uniform winding).
 * B = mu0*N*I / (2*sqrt(R^2 + (L/2)^2)).
 * Limits: L >> R -> mu0*(N/L)*I (ideal long solenoid);
 *         L -> 0 -> mu0*N*I/(2R) (N-loop flat coil).
 */
export function finiteSolenoidField({ current, turns, length, radius }) {
  const I = finite(current, 'current');
  const N = nonNegative(turns, 'turns');
  const L = nonNegative(length, 'length');
  const R = nonNegative(radius, 'radius');
  if (I === 0 || N === 0) return 0;
  if (L === 0 && R === 0) throw new RangeError('length and radius cannot both be zero');
  const halfL = L / 2;
  return (MU0 * N * I) / (2 * Math.sqrt(R * R + halfL * halfL));
}

/**
 * Lumped closed magnetic circuit: B = mu0*N*I / (gap + coreLength/mu_r),
 * capped at the material saturation flux density.
 */
export function magneticCircuitField({ current, turns, coreLength, gap, relativePermeability, saturation }) {
  const I = finite(current, 'current');
  const N = nonNegative(turns, 'turns');
  const Lc = nonNegative(coreLength, 'coreLength');
  const g = nonNegative(gap, 'gap');
  const mur = positive(relativePermeability, 'relativePermeability');
  const sat = positive(saturation, 'saturation');

  // Closed-circuit demo model: no leakage, fringing or open-core demagnetization.
  const coreTerm = Lc / mur;
  const denominator = g + coreTerm;
  if (denominator === 0) {
    if (I === 0 || N === 0) {
      return { field: 0, idealField: 0, saturated: false, reluctanceLimited: false };
    }
    throw new RangeError('gap + coreLength/relativePermeability must be positive');
  }
  const idealField = (MU0 * N * I) / denominator;
  const field = clamp(idealField, -sat, sat);
  return {
    field,
    idealField,
    saturated: Math.abs(idealField) > sat,
    // Finite core reluctance dominates the air-gap term.
    reluctanceLimited: coreTerm > g,
  };
}

/**
 * Field of a dipole source, regularized inside its radius.
 * Exterior: exact point dipole. Interior: uniformly magnetized sphere core
 * value B = (2/3)*mu0*M = mu0*m/(2*pi*a^3), smoothly joined to the exterior
 * dipole in a thin surface shell so the returned field is continuous at r = a.
 * (The ideal sharp sphere has a tangential B jump from bound surface current;
 * this visualization regularization removes that kink and all singularities.)
 */
export function dipoleField(point, source) {
  const p = vector3(point, 'point');
  const pos = vector3(source.position, 'source.position');
  const m = vector3(source.moment, 'source.moment');
  const a = positive(source.radius, 'source.radius');

  const rx = p[0] - pos[0];
  const ry = p[1] - pos[1];
  const rz = p[2] - pos[2];
  const r2 = rx * rx + ry * ry + rz * rz;
  const r = Math.sqrt(r2);
  const k = MU0 / FOUR_PI;
  const a3 = a * a * a;

  if (r >= a) {
    const inv3 = 1 / (r2 * r);
    const inv5 = inv3 / r2;
    const mdotr = m[0] * rx + m[1] * ry + m[2] * rz;
    const c = 3 * mdotr * inv5;
    return [k * (c * rx - m[0] * inv3), k * (c * ry - m[1] * inv3), k * (c * rz - m[2] * inv3)];
  }

  const sphereScale = MU0 / (2 * Math.PI * a3);
  const sphere = [sphereScale * m[0], sphereScale * m[1], sphereScale * m[2]];
  if (r === 0) return sphere;

  // Thin outer shell blends the sphere core to the exact exterior boundary value.
  const shell = a * 1e-3;
  const rInner = a - shell;
  if (r <= rInner) return sphere;

  const nx = rx / r;
  const ny = ry / r;
  const nz = rz / r;
  const mdotn = m[0] * nx + m[1] * ny + m[2] * nz;
  const invA3 = 1 / a3;
  const c = 3 * mdotn * invA3;
  const surface = [k * (c * nx - m[0] * invA3), k * (c * ny - m[1] * invA3), k * (c * nz - m[2] * invA3)];
  const t = (r - rInner) / shell;
  const w = t * t * (3 - 2 * t);
  return [
    sphere[0] + w * (surface[0] - sphere[0]),
    sphere[1] + w * (surface[1] - sphere[1]),
    sphere[2] + w * (surface[2] - sphere[2]),
  ];
}

/** Superposition of dipole sources at a point. */
export function fieldAt(point, sources) {
  const p = vector3(point, 'point');
  if (!Array.isArray(sources)) throw new TypeError('sources must be an array');
  const total = [0, 0, 0];
  for (const source of sources) {
    const b = dipoleField(p, source);
    total[0] += b[0];
    total[1] += b[1];
    total[2] += b[2];
  }
  return total;
}

/** Magnetic moment from remanence and volume: m = M*V = Br*V/mu0. */
export function magneticMoment(remanence, volume) {
  const br = finite(remanence, 'remanence');
  const v = nonNegative(volume, 'volume');
  return (br * v) / MU0;
}

/**
 * Deterministic RK4 field-line trace along the normalized B direction.
 * Stops at the cubic bounds, a weak/null field, or a source sink.
 */
export function traceFieldLine(seed, sources, options = {}) {
  const { step = 0.002, maxSteps = 500, bounds = 0.3, stopRadius = 0.004 } = options;
  positive(step, 'step');
  finite(maxSteps, 'maxSteps');
  if (!Number.isInteger(maxSteps) || maxSteps < 0) throw new RangeError('maxSteps must be a non-negative integer');
  positive(bounds, 'bounds');
  nonNegative(stopRadius, 'stopRadius');
  if (!Array.isArray(sources)) throw new TypeError('sources must be an array');

  const start = vector3(seed, 'seed');
  const points = [start];
  const sinks = sources.map((s) => ({
    position: vector3(s.position, 'source.position'),
    radius: Math.max(stopRadius, nonNegative(s.radius ?? 0, 'source.radius')),
  }));

  const outside = (q) => Math.abs(q[0]) > bounds || Math.abs(q[1]) > bounds || Math.abs(q[2]) > bounds;
  const nearSink = (q) => sinks.some((s) => {
    const dx = q[0] - s.position[0];
    const dy = q[1] - s.position[1];
    const dz = q[2] - s.position[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= s.radius;
  });
  const direction = (q) => {
    const b = fieldAt(q, sources);
    const mag = magnitude3(b);
    if (!Number.isFinite(mag) || mag < WEAK_FIELD_T) return null;
    return [b[0] / mag, b[1] / mag, b[2] / mag];
  };
  const advance = (q, k, h) => [q[0] + k[0] * h, q[1] + k[1] * h, q[2] + k[2] * h];

  let p = start;
  if (outside(p) || nearSink(p)) return points;

  for (let i = 0; i < maxSteps; i += 1) {
    const k1 = direction(p);
    if (!k1) break;
    const k2 = direction(advance(p, k1, step / 2));
    if (!k2) break;
    const k3 = direction(advance(p, k2, step / 2));
    if (!k3) break;
    const k4 = direction(advance(p, k3, step));
    if (!k4) break;
    const next = [
      p[0] + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      p[1] + (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      p[2] + (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ];
    if (!next.every(Number.isFinite)) break;
    points.push(next);
    p = next;
    if (outside(p) || nearSink(p)) break;
  }
  return points;
}

/**
 * Coaxial dipole force, far field |F| = 3*mu0*m1*m2/(2*pi*r^4).
 * Sign convention (lab): positive = repulsive (like poles facing), negative =
 * attractive. The scalar moments use a pole-facing sign so a positive product
 * means like poles face each other. If you instead pass vector dipole moments
 * projected on one common axis, aligned projections physically attract and the
 * sign must be flipped.
 */
export function coaxialDipoleForce(momentA, momentB, distance) {
  const mA = finite(momentA, 'momentA');
  const mB = finite(momentB, 'momentB');
  const r = positive(distance, 'distance');
  const r4 = r * r * r * r;
  return (3 * MU0 * mA * mB) / (2 * Math.PI * r4);
}

/**
 * Exact on-axis field of a uniformly magnetized permanent cylinder.
 * distance is measured from the pole face along the axis (z = 0 at the face).
 * B(z) = Br/2 * [ (z+L)/sqrt(R^2+(z+L)^2) - z/sqrt(R^2+z^2) ].
 */
export function cylinderAxialField({ remanence, radius, length, distance }) {
  const br = finite(remanence, 'remanence');
  const R = positive(radius, 'radius');
  const L = nonNegative(length, 'length');
  const z = finite(distance, 'distance');
  if (L === 0 || br === 0) return 0;
  const zL = z + L;
  const termFar = zL / Math.sqrt(R * R + zL * zL);
  const termNear = z / Math.sqrt(R * R + z * z);
  return 0.5 * br * (termFar - termNear);
}

/**
 * Contact / pull-force upper bound from the on-axis gap field and Maxwell
 * pressure F = B^2*A/(2*mu0). Not an inverse-square guess.
 * `length` is optional; without it the long-cylinder limit is used and flagged.
 */
export function contactForceEstimate({ remanence, area, gap, radius, length }) {
  const br = finite(remanence, 'remanence');
  const A = nonNegative(area, 'area');
  const g = nonNegative(gap, 'gap');
  const R = positive(radius, 'radius');

  let field;
  const assumptions = [];
  if (length === undefined || length === null) {
    // L -> infinity limit of the finite cylinder expression (no fake length).
    field = 0.5 * br * (1 - g / Math.sqrt(R * R + g * g));
    assumptions.push('Magnet length not supplied: long-cylinder (semi-infinite) limit of the finite cylindrical axial field; a real finite magnet gives less field.');
  } else {
    const L = positive(length, 'length');
    field = cylinderAxialField({ remanence: br, radius: R, length: L, distance: g });
    assumptions.push('Finite cylindrical axial field evaluated on axis at the gap centre.');
  }
  const force = (field * field * A) / (2 * MU0);
  assumptions.push('Maxwell pressure B^2*A/(2*mu0) upper bound: ideal steel keeper, uniform gap field, no fringing, leakage or saturation.');
  assumptions.push('On-axis centre value only; real pull force depends on alignment, contact area, surface finish and the steel grade.');
  return { force, field, assumptions };
}

/** Classical skin depth delta = sqrt(2/(omega*mu*sigma)) = sqrt(1/(pi*f*mu*sigma)). */
export function skinDepth({ frequency, permeability, conductivity }) {
  const f = nonNegative(frequency, 'frequency');
  const mu = positive(permeability, 'permeability');
  const sigma = positive(conductivity, 'conductivity');
  if (f === 0) return Infinity;
  return Math.sqrt(1 / (Math.PI * f * mu * sigma));
}

/**
 * Plane-wave far-field absorption-only shielding estimate.
 * Amplitude transmission = exp(-t/delta); SE(dB) = -20*log10(transmission).
 * Explicitly not a DC shielding claim.
 */
export function shieldingEstimate({ thickness, frequency, relativePermeability, conductivity }) {
  const t = nonNegative(thickness, 'thickness');
  const f = nonNegative(frequency, 'frequency');
  const mur = positive(relativePermeability, 'relativePermeability');
  const sigma = positive(conductivity, 'conductivity');
  const baseModel = 'Plane-wave far-field absorption-only approximation (A = exp(-t/delta)); ignores reflection loss, multiple reflections, near-field source impedance, seams, apertures and saturation.';
  if (f === 0) {
    return {
      skinDepth: Infinity,
      attenuation: null,
      transmission: null,
      decibels: null,
      model: `DC limit: ${baseModel} No numeric DC shielding is claimed.`,
    };
  }
  const delta = skinDepth({ frequency: f, permeability: MU0 * mur, conductivity: sigma });
  const attenuation = t / delta; // nepers (amplitude exponent)
  const transmission = Math.exp(-attenuation);
  const decibels = -20 * Math.log10(transmission);
  return { skinDepth: delta, attenuation, transmission, decibels, model: baseModel };
}

/** Plate mass = density*area*thickness (kg). */
export function plateMass({ density, area, thickness }) {
  const rho = nonNegative(density, 'density');
  const A = nonNegative(area, 'area');
  const t = nonNegative(thickness, 'thickness');
  return rho * A * t;
}

/**
 * Reversible linear remanence temperature model.
 * Br(T) = Br20*(1 + coefficient*(T-20)) only below the operating limit.
 * Near/above Curie the result is qualitative; irreversible loss is never
 * fabricated as an exact number.
 */
export function temperatureRemanence({ br20, temperature, coefficient, maxOperating, curie }) {
  const b0 = finite(br20, 'br20');
  const T = finite(temperature, 'temperature');
  const alpha = finite(coefficient, 'coefficient');
  const top = finite(maxOperating, 'maxOperating');
  const tc = positive(curie, 'curie');

  const factor = Math.max(0, 1 + alpha * (T - 20));
  let br;
  let regime;
  let warning;

  if (T >= tc) {
    br = 0;
    regime = 'above-curie';
    warning = 'At/above the Curie temperature ferromagnetic order is lost and remanence collapses. Exact irreversible loss is material- and history-dependent and is not modelled.';
  } else if (T >= 0.9 * tc) {
    br = 0;
    regime = 'near-curie';
    warning = 'Approaching the Curie temperature: remanence falls rapidly and largely irreversibly. The linear model is invalid here; this is a qualitative collapse, not a precise value.';
  } else if (T >= top) {
    br = b0 * factor;
    regime = 'above-operating';
    warning = 'Above the maximum operating temperature irreversible demagnetization is possible. The value shown is only a reversible linear extrapolation, not a guaranteed remanence.';
  } else if (T >= top - 20) {
    br = b0 * factor;
    regime = 'near-operating-limit';
    warning = 'Within 20 C of the maximum operating temperature: reversible linear approximation only; irreversible loss may begin and is not quantified.';
  } else {
    br = b0 * factor;
    regime = 'reversible';
    warning = null;
  }
  const reversibleFraction = b0 === 0 ? 0 : br / b0;
  return { br, reversibleFraction, regime, warning };
}

/**
 * Cut a magnet in half across its magnetization axis. Each piece keeps the same
 * remanence and radius, has half the length (and half the moment/volume), and
 * carries BOTH poles - no magnetic monopoles.
 */
export function cutMagnet(magnet) {
  if (!magnet || typeof magnet !== 'object') throw new TypeError('magnet must be an object');
  const L = positive(magnet.length ?? magnet.height, 'magnet.length');
  const half = L / 2;
  let axis = [0, 0, 1];
  const rawAxis = magnet.moment ?? magnet.axis;
  if (Array.isArray(rawAxis)) {
    const v = vector3(rawAxis, 'magnet axis');
    const mag = magnitude3(v);
    if (mag > 0) axis = [v[0] / mag, v[1] / mag, v[2] / mag];
  }
  const basePosition = magnet.position ? vector3(magnet.position, 'magnet.position') : null;

  const makeHalf = (sign) => {
    const piece = { ...magnet, length: half, poles: ['north', 'south'] };
    delete piece.height;
    if (basePosition) {
      const offset = (sign * L) / 4;
      piece.position = [
        basePosition[0] + axis[0] * offset,
        basePosition[1] + axis[1] * offset,
        basePosition[2] + axis[2] * offset,
      ];
    }
    if (Array.isArray(magnet.moment)) piece.moment = magnet.moment.map((v) => v / 2);
    if (typeof magnet.magneticMoment === 'number') piece.magneticMoment = magnet.magneticMoment / 2;
    if (typeof magnet.volume === 'number') piece.volume = magnet.volume / 2;
    return piece;
  };
  return [makeHalf(-1), makeHalf(1)];
}

/** Human-readable field with sensible significant figures (no fake precision). */
export function formatField(tesla) {
  const b = finite(tesla, 'tesla');
  if (b === 0) return '0 T';
  const abs = Math.abs(b);
  const sig = (v) => {
    let s = v.toPrecision(3);
    if (s.includes('.') && !s.includes('e')) s = s.replace(/\.?0+$/, '');
    return s;
  };
  if (abs >= 1) return `${sig(b)} T`;
  if (abs >= 1e-3) return `${sig(b * 1e3)} mT`;
  if (abs >= 1e-6) return `${sig(b * 1e6)} uT`;
  return `${b.toExponential(2)} T`;
}

/** Clamp value into [min, max] (order-insensitive). */
export function clamp(value, min, max) {
  finite(value, 'value');
  finite(min, 'min');
  finite(max, 'max');
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(hi, Math.max(lo, value));
}

/** Linear interpolation a -> b by t (t is not clamped). */
export function lerp(a, b, t) {
  finite(a, 'a');
  finite(b, 'b');
  finite(t, 't');
  return a + (b - a) * t;
}

/** Model limitations, keyed by model. */
export const MODEL_NOTES = {
  solenoid: 'Finite thin-winding air-core solenoid centre field. Ignores winding pitch, wire thickness, end effects beyond the exact on-axis formula, and any core material.',
  magneticCircuit: 'Lumped closed-circuit B = mu0*N*I/(gap + coreLength/mu_r) capped at saturation. Ignores leakage, fringing, hysteresis and open-core demagnetization; a demo open core never reaches this ideal.',
  dipole: 'Exterior is the exact point dipole. Interior uses the uniformly magnetized sphere core field joined continuously to the exterior in a thin surface shell; the ideal sharp sphere has a physical tangential B jump from bound surface current that this visualization regularization removes. Not valid for non-spherical magnets at close range.',
  fieldLine: 'RK4 integration along normalized B with fixed step. Stops at cubic bounds, weak field (<1e-12 T) or a source sink. Deterministic; accuracy depends on step size and the dipole approximation.',
  coaxialForce: 'Far-field coaxial dipole force 3*mu0*m1*m2/(2*pi*r^4). Lab sign convention: positive product = like poles facing = repulsive. With global-axis vector moment projections aligned projections attract, so flip the sign. Invalid at contact / near field.',
  contactForce: 'Maxwell pressure B^2*A/(2*mu0) upper bound using the on-axis cylindrical gap field. Assumes an ideal steel keeper and uniform field; ignores fringing, leakage, saturation and alignment. Without a supplied length the long-cylinder limit is used and flagged.',
  cylinderAxial: 'Exact on-axis field of a uniformly magnetized cylinder. Off-axis fields, edge effects and non-uniform magnetization are not modelled.',
  skinDepth: 'Classical good-conductor skin depth sqrt(2/(omega*mu*sigma)). Assumes linear, homogeneous, non-magnetic-saturating material and sinusoidal steady state.',
  shielding: 'Plane-wave far-field absorption-only estimate. Ignores reflection loss, multiple reflections, near-field source impedance, seams, apertures and saturation. No numeric DC shielding claim is made.',
  plateMass: 'Uniform density plate mass = density*area*thickness. Ignores coatings, holes and tolerances.',
  temperature: 'Reversible linear Br(T) = Br20*(1+coefficient*(T-20)) only below the operating limit. Near/above Curie the result is qualitative; exact irreversible demagnetization depends on material, geometry and history and is never fabricated.',
  cutMagnet: 'Cutting perpendicular to magnetization yields two half-length magnets with the same remanence and both poles. Moment and volume halve; no monopoles are produced.',
  formatField: 'Display helper rounding to three significant figures; not a precision claim.',
};