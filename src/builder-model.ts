export const MORPH_KEYS = [
  'scale',
  'reach',
  'fold',
  'lobes',
  'tension',
  'mutation',
  'gesture',
  'resonance',
  'texture',
  'polarity',
  'phase',
  'motion',
  'pulse',
  'density',
] as const;

export type MorphKey = (typeof MORPH_KEYS)[number];
export type MorphState = Readonly<Record<MorphKey, number>>;

export interface MorphControl {
  readonly key: MorphKey;
  readonly group: 'form' | 'surface' | 'life';
  readonly label: string;
  readonly description: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly defaultValue: number;
}

export const MORPH_CONTROLS: readonly MorphControl[] = [
  { key: 'scale', group: 'form', label: 'Presence', description: 'Changes the overall scale.', min: 0.78, max: 1.18, step: 0.01, defaultValue: 1 },
  { key: 'reach', group: 'form', label: 'Reach', description: 'Widens or gathers the projection.', min: 0.68, max: 1.42, step: 0.01, defaultValue: 1 },
  { key: 'fold', group: 'form', label: 'Fold', description: 'Changes the curvature of the projection phase.', min: 0.68, max: 1.42, step: 0.01, defaultValue: 1 },
  { key: 'lobes', group: 'form', label: 'Lobes', description: 'Changes the number and rhythm of larger structures.', min: 0.65, max: 1.55, step: 0.05, defaultValue: 1 },
  { key: 'tension', group: 'form', label: 'Tension', description: 'Pulls the form between axial and radial states.', min: 0.7, max: 1.35, step: 0.01, defaultValue: 1 },
  { key: 'mutation', group: 'form', label: 'Mutation', description: 'Controls the generated developmental transformation.', min: 0, max: 1.65, step: 0.01, defaultValue: 1 },
  { key: 'gesture', group: 'form', label: 'Gesture', description: 'Bends the generated body axis from one posture into another.', min: -1, max: 1, step: 0.01, defaultValue: 0 },
  { key: 'resonance', group: 'surface', label: 'Resonance', description: 'Amplifies or quietens nested oscillations.', min: 0.55, max: 1.5, step: 0.01, defaultValue: 1 },
  { key: 'texture', group: 'surface', label: 'Texture', description: 'Changes the frequency of fine structures.', min: 0.72, max: 1.34, step: 0.01, defaultValue: 1 },
  { key: 'polarity', group: 'surface', label: 'Polarity', description: 'Biases the transformation to one side or the other.', min: -0.5, max: 0.5, step: 0.01, defaultValue: 0 },
  { key: 'phase', group: 'life', label: 'Phase', description: 'Moves the creature through its internal cycle.', min: -3.15, max: 3.15, step: 0.05, defaultValue: 0 },
  { key: 'motion', group: 'life', label: 'Motion', description: 'Changes how quickly time enters the equation.', min: 0.3, max: 1.6, step: 0.01, defaultValue: 1 },
  { key: 'pulse', group: 'life', label: 'Colour wave', description: 'Changes the width of the travelling colour pulse.', min: 0.45, max: 1.85, step: 0.01, defaultValue: 1 },
  { key: 'density', group: 'life', label: 'Matter', description: 'Adds or removes sampled points without changing the equation.', min: 7_000, max: 28_000, step: 250, defaultValue: 16_000 },
] as const;

export const DEFAULT_MORPH: MorphState = Object.freeze(
  Object.fromEntries(MORPH_CONTROLS.map((control) => [control.key, control.defaultValue])),
) as unknown as MorphState;

export interface BuilderPalette {
  readonly body: string;
  readonly pulse: string;
}

export type ProgramModules = readonly [carrier: number, metric: number, phase: number, projection: number];
export type DevelopmentGene = readonly [kind: number, amount: number, frequency: number, phase: number];

export interface CreatureGenome {
  readonly seed: number;
  readonly family: number;
  readonly modules: ProgramModules;
  readonly development: DevelopmentGene;
  readonly parameters: readonly number[];
  readonly sourcePointCount: number;
  readonly normalization: number;
  readonly centerX: number;
  readonly centerY: number;
}

export interface GeneratedCreature {
  readonly genome: CreatureGenome;
  readonly palette: BuilderPalette;
  readonly name: string;
  readonly score: number;
}

export interface EvaluatedPoint {
  readonly x: number;
  readonly y: number;
}

interface QualityResult {
  readonly score: number;
  readonly accepted: boolean;
  readonly centerX: number;
  readonly centerY: number;
  readonly normalization: number;
  readonly occupancy: number;
  readonly cohesion: number;
  readonly aspect: number;
}

export const EQUATION_FAMILY_NAMES = [
  'Axial Rake',
  'Polar Fold',
  'Parity Fibre',
  'Singular Textile',
  'Radial Lattice',
  'Field Veil',
  'Secant Fan',
] as const;

export const DEVELOPMENT_NAMES = [
  'Tidal coupling',
  'Bilateral lens',
  'Phase current',
  'Orbital echo',
  'Cellular fold',
  'Contour bloom',
] as const;

const NAME_PREFIXES = ['Ash', 'Glass', 'Night', 'Tidal', 'Velvet', 'Ember', 'Pale', 'Silent', 'Lunar', 'Cinder'] as const;
const NAME_SUFFIXES = ['Drifter', 'Weaver', 'Root', 'Warden', 'Moth', 'Crown', 'Ray', 'Larva', 'Veil', 'Ghost'] as const;
const PARAMETER_COUNT = 24;
const QUALITY_SAMPLE_COUNT = 1_280;
const QUALITY_GRID_SIZE = 40;
const CANDIDATE_COUNT = 48;
const RESCUE_CANDIDATE_COUNT = 96;
const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safe(value: number): number {
  if (Math.abs(value) >= 0.0001) return value;
  return value < 0 ? -0.0001 : 0.0001;
}

function safePole(value: number, epsilon: number): number {
  return value / (value * value + epsilon * epsilon);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function range(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function integer(random: () => number, min: number, max: number): number {
  return Math.floor(range(random, min, max + 1));
}

function choose<T>(random: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function createParameterVector(): number[] {
  return Array.from({ length: PARAMETER_COUNT }, () => 0);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = ((hue % 360) + 360) % 360 / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const [rawRed, rawGreen, rawBlue] =
    section < 1 ? [chroma, secondary, 0]
      : section < 2 ? [secondary, chroma, 0]
        : section < 3 ? [0, chroma, secondary]
          : section < 4 ? [0, secondary, chroma]
            : section < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightness - chroma / 2;
  return `#${[rawRed, rawGreen, rawBlue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function chooseFamily(seed: number, avoidFamily?: number): number {
  let family = Math.imul((seed ^ 0xa511e9b3) >>> 0, 0x45d9f3b) >>> 0;
  family %= EQUATION_FAMILY_NAMES.length;
  if (family === avoidFamily) {
    const offset = 1 + ((seed >>> 7) % (EQUATION_FAMILY_NAMES.length - 1));
    family = (family + offset) % EQUATION_FAMILY_NAMES.length;
  }
  return family;
}

function moduleTuple(
  random: () => number,
  family: number,
  forcedModules?: ProgramModules,
): ProgramModules {
  if (forcedModules) return [...forcedModules] as ProgramModules;
  if (family === 0) return [integer(random, 0, 2), 0, integer(random, 0, 1), integer(random, 0, 1)];
  if (family === 1) return [integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1)];
  if (family === 2) return [integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1)];
  if (family === 3) return [integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1), integer(random, 0, 1)];
  if (family === 4) {
    const projection = integer(random, 0, 3);
    return [projection < 2 ? 0 : projection === 2 ? 1 : 2, projection, integer(random, 0, 1), projection];
  }
  if (family === 5) return [integer(random, 0, 2), 0, integer(random, 0, 1), integer(random, 0, 1)];
  return [integer(random, 0, 1), 0, integer(random, 0, 1), integer(random, 0, 1)];
}

function createCandidate(
  seed: number,
  family: number,
  candidateIndex: number,
  forcedModules?: ProgramModules,
  forcedDevelopmentKind?: number,
): CreatureGenome {
  const candidateSeed = (seed ^ Math.imul(candidateIndex + 1, 0x9e3779b9)) >>> 0;
  const random = mulberry32(candidateSeed ^ 0x243f6a88);
  const moduleRandom = mulberry32(candidateSeed ^ 0xb7e15162);
  const developmentRandom = mulberry32(candidateSeed ^ 0x8aed2a6b);
  const modules = moduleTuple(moduleRandom, family, forcedModules);
  const developmentKind = forcedDevelopmentKind === undefined
    ? integer(developmentRandom, 0, DEVELOPMENT_NAMES.length - 1)
    : Math.round(clamp(forcedDevelopmentKind, 0, DEVELOPMENT_NAMES.length - 1));
  const development: DevelopmentGene = [
    developmentKind,
    range(developmentRandom, 0.035, 0.125),
    range(developmentRandom, 2.8, 9.5),
    range(developmentRandom, 0, TAU),
  ];
  const p = createParameterVector();
  let sourcePointCount = 12_000;

  if (family === 0) {
    sourcePointCount = integer(random, 9_500, 16_000);
    p[0] = range(random, 210, 280);
    p[1] = range(random, 3.2, 5.2);
    p[2] = range(random, 0.8, Math.min(2.8, p[1] - 0.5));
    p[3] = range(random, 1.4, 3.1);
    p[4] = range(random, 0.55, 1.7);
    p[5] = range(random, 18, 34);
    p[6] = range(random, 6.5, 9.5);
    p[7] = range(random, 10.5, 16.5);
    p[8] = range(random, 0.8, 4.5);
    p[9] = choose(random, [7, 9, 11, 13, 17, 19]);
    p[10] = range(random, 0.5, 3.5);
    p[11] = range(random, 1.5, 3.2);
    p[12] = range(random, 18, 34);
    p[13] = range(random, 6, 11);
    p[14] = range(random, 1.2, 4);
    p[15] = range(random, 7, 15);
    p[16] = range(random, 2.2, 4.5);
    p[17] = range(random, 32, 68);
    p[18] = range(random, 29, 46);
    p[19] = modules[2] === 0 ? range(random, 0.7, 1.12) : 0;
    p[20] = modules[2] === 1 ? range(random, 1 / 72, 1 / 38) : 0;
    p[21] = range(random, 0.7, 1.3);
    p[22] = range(random, 0, 0.5);
    p[23] = range(random, 0.07, 0.18);
  } else if (family === 1) {
    sourcePointCount = integer(random, 10_000, 15_000);
    p[0] = integer(random, 165, 220);
    p[1] = range(random, 42, 68);
    p[2] = range(random, 4.5, 9.5);
    p[3] = range(random, 8.5, 20);
    p[4] = range(random, 25, 40);
    p[5] = range(random, 7, 10);
    p[6] = range(random, 11, 14.5);
    p[7] = range(random, 55, 115);
    p[8] = range(random, modules[1] === 0 ? 0.45 : 2, modules[1] === 0 ? 1.1 : 4.8);
    p[9] = range(random, 52, 102);
    p[10] = range(random, 1, 5);
    p[11] = choose(random, [5, 7, 9, 11, 13]);
    p[12] = range(random, 2, 4.2);
    p[13] = range(random, 1.2, 4);
    p[14] = range(random, 0.7, 1.35);
    p[15] = range(random, 8, 22);
    p[16] = range(random, 0.35, 0.6);
    p[17] = range(random, 0, 0.024);
    p[18] = 1 / range(random, 12, 24);
    p[19] = range(random, 0.7, 2.2);
  } else if (family === 2) {
    sourcePointCount = integer(random, 9_500, 14_000);
    p[0] = range(random, 330, 820);
    p[1] = range(random, 4, 11);
    p[2] = range(random, 4.2, 7);
    p[3] = range(random, 3.5, 6.2);
    p[4] = range(random, 0.08, 0.24);
    p[5] = range(random, 3.5, 7);
    p[6] = range(random, 11, 14.5);
    p[7] = range(random, 0.15, 0.48);
    p[8] = range(random, 3.5, 5.5);
    p[9] = range(random, 4.2, 7.5);
    p[10] = range(random, 2, 4);
    p[11] = range(random, 0.72, 1.25);
    p[12] = range(random, 1.5, 2.6);
    p[13] = range(random, 0.35, 1.05);
    p[14] = range(random, 0.15, 0.34);
    p[15] = range(random, 58, 94);
    p[16] = range(random, 25, 35);
    p[17] = range(random, 0.28, 0.56);
    p[18] = range(random, 0.28, 0.62);
    p[19] = choose(random, [1, 2, 4, 8]);
  } else if (family === 3) {
    sourcePointCount = integer(random, 18_000, 32_000);
    p[0] = integer(random, 82, 118);
    p[1] = range(random, 120, 340);
    p[2] = range(random, 3.6, 4.9);
    p[3] = range(random, 10.5, 14.5);
    p[4] = range(random, 8, 11);
    p[5] = choose(random, [0, 0, 5, 9]);
    p[6] = range(random, 8, 11);
    p[7] = range(random, 0.25, 1.05);
    p[8] = range(random, 0.06, 0.16);
    p[9] = range(random, 88, 108);
    p[10] = range(random, 0.22, 0.42);
    p[11] = range(random, 6, 11);
    p[12] = range(random, 4, 10);
    p[13] = range(random, 2.2, 4.5);
    p[14] = range(random, 7, 18);
    p[15] = range(random, 0.6, 1.7);
    p[16] = range(random, 3.1, 4.9);
    p[17] = range(random, 0.65, 1.8);
    p[18] = modules[2] === 0 ? range(random, 4.2, 6.8) : range(random, 24, 40);
    p[19] = range(random, 3.2, 6);
    p[20] = range(random, 6, 12);
    p[21] = range(random, 18, 38);
    p[22] = range(random, 0.7, 1.4);
  } else if (family === 4) {
    sourcePointCount = 40_000;
    p[0] = 200;
    p[1] = range(random, 7, 9.4);
    p[2] = range(random, 2.8, 4.3);
    p[3] = range(random, 3.8, 5.7);
    p[4] = range(random, 0.7, 1.35);
    p[5] = range(random, 1.8, 3.1);
    p[6] = range(random, 0.55, 1.15);
    p[7] = range(random, 0.18, 0.65);
    p[8] = range(random, 2.7, 6);
    p[9] = range(random, 15, 24);
    p[10] = range(random, 2.5, 7);
    p[11] = range(random, 0.18, 0.35);
    p[12] = range(random, 0.06, 0.2);
    p[13] = range(random, 1.7, 4);
    p[14] = choose(random, [7, 9, 11, 13]);
    p[15] = range(random, 0.8, 1.7);
    p[16] = range(random, 28, 52);
    p[17] = range(random, 8, 24);
    p[18] = range(random, 0.55, 0.78);
    p[19] = range(random, 1.7, 2.8);
    p[20] = range(random, 0.65, 1.15);
  } else if (family === 5) {
    sourcePointCount = integer(random, 30_000, 40_000);
    p[0] = integer(random, 175, 225);
    p[1] = range(random, 175, 250);
    p[2] = range(random, 7, 10);
    p[3] = range(random, 10.5, 14);
    p[4] = range(random, 0.7, 1.3);
    p[5] = range(random, 0.7, 1.3);
    p[6] = range(random, 0.7, 1.3);
    p[7] = range(random, 18, 32);
    p[8] = range(random, 1.7, 3);
    p[9] = range(random, 3, 5);
    p[10] = range(random, 82, 104);
    p[11] = range(random, 0.72, 1.28);
    p[12] = range(random, 0.7, 1.3);
    p[13] = range(random, 3, 6);
    p[14] = range(random, 0.8, 2.5);
    p[15] = range(random, 52, 98);
    p[16] = range(random, 480, 720);
    p[17] = range(random, 6, 12);
    p[18] = range(random, 4, 9);
    p[19] = range(random, 76, 116);
    p[20] = range(random, 4, 8);
  } else {
    sourcePointCount = integer(random, 8_200, 11_500);
    p[0] = integer(random, 175, 215);
    p[1] = range(random, 3.5, 5.2);
    p[2] = range(random, 7, 9.5);
    p[3] = range(random, 22, 28);
    p[4] = range(random, 7, 9.5);
    p[5] = range(random, 22, 28);
    p[6] = range(random, 82, 128);
    p[7] = range(random, 0.1, 0.58);
    p[8] = range(random, 0.09, 0.2);
    p[9] = range(random, 3.5, 6.2);
    p[10] = range(random, 0.8, 1.5);
    p[11] = range(random, 2.5, 3.9);
    p[12] = range(random, 1.8, 2.8);
    p[13] = range(random, 6, 12);
    p[14] = range(random, 7, 15);
    p[15] = range(random, 0.6, 1.6);
    p[16] = range(random, 6, 11);
    p[17] = range(random, 0.6, 1.4);
    p[18] = range(random, 6, 14);
    p[19] = range(random, 8, 18);
    p[20] = range(random, 3.8, 5.2);
  }

  return {
    seed: seed >>> 0,
    family,
    modules,
    development,
    parameters: p,
    sourcePointCount,
    normalization: 1,
    centerX: 0,
    centerY: 0,
  };
}

function evaluateRawPoint(
  genome: CreatureGenome,
  index: number,
  time: number,
  morph: MorphState,
): EvaluatedPoint {
  const p = genome.parameters;
  const [carrier, metric, phase, projection] = genome.modules;
  const detail = morph.texture;
  const t = time * morph.motion + morph.phase;
  const spread = morph.reach;
  const fold = morph.fold;
  const interference = morph.resonance;
  const lobes = morph.lobes;

  if (genome.family === 0) {
    const x = index + 1;
    const y = x / p[0];
    const carrierPhase = carrier === 1 ? x / (p[3] * 5.5) : y * p[3];
    const cross = carrier === 2 ? Math.cos(y / (p[5] * 0.85)) : 1;
    const k = (p[1] + p[2] * Math.sin(carrierPhase * detail - t * p[4])) * Math.cos(x / p[5]) * cross;
    const e = y / p[6] - p[7];
    const d = Math.hypot(k, e) + p[22] * Math.sin(y * p[23] * detail + t * 0.45);
    const theta = Math.atan2(k, e);
    const pole = projection === 1 ? 0.22 * safePole(k, 0.1) : 0;
    const nested = Math.sin(y / p[12]) * k * (p[13] + p[14] * interference * Math.sin(p[15] * e - p[16] * d + 2 * t));
    const q = p[8] * Math.sin(p[9] * lobes * theta) + p[10] * Math.sin(p[11] * k * detail) + pole + nested;
    const c = (p[19] * d + p[20] * d * d - t * p[21]) * fold;
    const xOut = q + p[17] * spread * Math.cos(c);
    const yOut = q * Math.sin(c) + p[18] * d;
    return projection === 0 ? { x: xOut, y: yOut } : { x: xOut, y: -yOut };
  }

  if (genome.family === 1) {
    const x = index % p[0];
    const y = index / p[1];
    const cross = carrier === 1 ? Math.cos(y / p[4]) : 1;
    const k = p[2] * Math.cos(x / p[3]) * cross;
    const e = y / p[5] - p[6];
    const d = (k * k + e * e) / p[7] + p[8] + (metric === 0 ? 0.13 * Math.sin(t) : 0);
    const theta = Math.atan2(k, e);
    const lobeCarrier = phase === 0 ? e : 1;
    const wave = projection === 0 ? Math.cos(d * d * p[14] * detail - t * p[19]) : Math.sin(d * d * p[14] * detail - t * p[19]);
    const q = p[9] - p[10] * lobeCarrier * Math.sin(theta * p[11] * lobes) / safe(d) + k * (p[12] + p[13] * interference * wave);
    const c = (p[16] * d + p[17] * e - t * p[18]) * fold;
    return {
      x: q * Math.sin(c) * spread,
      y: (q + p[15] * d * spread) * Math.cos(c),
    };
  }

  if (genome.family === 2) {
    const y = index / p[0];
    const mask = Math.trunc(y) ^ Math.trunc(p[19]);
    const lowEnvelope = p[2] + (carrier === 0 ? p[2] * Math.sin(mask) : 2 * Math.sin(y * 1.7));
    const highEnvelope = carrier === 0 ? p[3] + Math.cos(y) : p[3] + y * p[4] + Math.cos(y / 2);
    const envelope = y < p[1] ? lowEnvelope : highEnvelope;
    const direction = projection === 0 ? 1 : -1;
    const k = envelope * Math.cos(index + direction * t * p[13]);
    const e = y / p[5] - p[6];
    const d = Math.hypot(k, e) + p[7] * Math.sin(e / p[8] + direction * t);
    const divisor = metric === 0 ? p[9] : safe(d);
    const q = y * k / divisor * (p[10] + p[11] * interference * Math.sin(d * p[12] * detail * lobes + y * p[14] - 4 * t));
    const parity = phase === 0 ? index % 2 : 1;
    const c = (p[17] * d + parity - t * p[18]) * fold;
    return {
      x: q + p[15] * spread * Math.cos(c),
      y: q * Math.sin(c) + p[16] * d,
    };
  }

  if (genome.family === 3) {
    const x = index % p[0];
    const y = index / p[1];
    const k = x / p[2] - p[3];
    const e = y / p[4] + p[5];
    const o = Math.hypot(k, e) / p[6];
    const singular = carrier === 0
      ? p[7] * safePole(k, p[8])
      : p[7] * Math.cos(p[11] / safe(k));
    const q = p[10] * x + p[9] + singular
      + o * k * (Math.cos(e * p[12] * detail * lobes) / p[13] + Math.cos(y / p[14]) / p[15])
        * interference * Math.sin(o * p[16] * detail - t * p[17]);
    const c = (metric === 0 ? o / p[18] + e / p[19] : o * e / p[18]) * fold - t / p[20];
    if (projection === 0) {
      return {
        x: q * Math.cos(c) * spread,
        y: (q + p[21]) * Math.sin(c) * Math.cos(c) - q / 3 + 30 * o,
      };
    }
    return {
      x: 0.7 * q * Math.sin(c) * spread,
      y: y / p[21] * Math.cos(4 * c - t / 2) - 0.5 * q * Math.cos(c) * p[22],
    };
  }

  if (genome.family === 4) {
    const columns = p[0];
    const x = 100 + index % columns;
    const y = 100 + Math.floor(index / columns);
    const k = x / p[1] - 25;
    const e = y / p[1] - 25;
    const r = Math.hypot(k, e);
    let o = r / p[2];
    let d: number;
    if (carrier === 0) d = p[3] * Math.cos(o * p[4]);
    else if (carrier === 1) {
      o = (r / 11) * Math.cos(Math.sin(k / 2) * Math.cos(e / 2));
      d = p[3] * Math.cos(o);
    }
    else d = -p[3] * Math.abs(Math.sin(k / 2) * Math.cos(e * 0.8));
    d *= interference;
    if (projection === 0) {
      return {
        x: (x + spread * d * k * p[6] * Math.sin(d * p[5] * detail * lobes - t) + k * p[7] * Math.sin(y / p[8] + t)) / 2,
        y: p[9] * d + p[10] * (d - 2) * Math.abs(Math.cos(d / 2 - t / 2)) + d * e,
      };
    }
    if (projection === 1) {
      const c = ((d + o) * p[11] - t * p[12]) * fold;
      return {
        x: (k * Math.atan(p[13] * Math.cos(d * p[14] * detail * lobes)) + x / 2) * Math.cos(c) * spread,
        y: (k * d * Math.cos(o - d + t) + y / 2) * Math.sin(c),
      };
    }
    if (projection === 2) {
      return {
        x: (x + spread * d * k * (Math.sin(d * p[19] * detail * lobes + t) + Math.sin(y * o * o) / p[17])) / p[15],
        y: (y / 3 - p[16] * d + p[17] * Math.cos(d + t)) * p[18],
      };
    }
    const signedO = 2 - r / p[2];
    return {
      x: 0.7 * (x - 4 * d * k + d * k * Math.sin(d + t)) + 2 * k * signedO,
      y: 0.7 * (y - d * y / 5 + d * e * Math.cos(d + t + signedO) * Math.sin(t + d)) + e * signedO,
    };
  }

  if (genome.family === 5) {
    const x = index % p[0];
    const y = index / p[1];
    const k = x / p[2] - p[3];
    const waveA = carrier === 1 ? Math.sin(k) : Math.cos(k);
    const waveB = carrier === 2 ? Math.cos(y / p[7]) : Math.sin(y / p[7]);
    const e = p[4] * waveA + p[5] * waveB + p[6] * Math.cos(k / p[8]);
    const d = Math.abs(e);
    const q = x / p[9] + p[10] + d * k * (p[11] + p[12] * interference * Math.cos(d * p[13] * detail * lobes - p[14] * t + y / p[15]));
    const c = (y * e / p[16] - t / p[17] + d / p[18]) * fold;
    const echo = projection === 0 ? Math.cos(c / 2) : Math.sin(c / 2);
    return {
      x: q * Math.cos(c) * spread,
      y: (q / 2 + p[19] * echo) * Math.sin(c) + p[20] * e,
    };
  }

  const columns = p[0];
  const x = 99 + index % columns;
  const y = 99 + Math.floor(index / columns) * p[20];
  const k = x / p[2] - p[3];
  const e = y / p[4] - p[5];
  const rho = (k * k + e * e) / p[6];
  const z = y * p[9] * detail * lobes;
  const cosine = Math.cos(z);
  const secant = carrier === 0 ? cosine / (cosine * cosine + p[8] * p[8]) : Math.sin(z) / (Math.sin(z) ** 2 + p[8] * p[8]);
  const q = x / p[11] + p[7] * k * secant * Math.sin(rho * rho * p[10] - t * p[15]);
  const c = (rho / p[12] - t / p[13]) * fold;
  const cross = projection === 0 ? e * Math.sin(rho + k - t) * p[17] : k * Math.cos(rho + e + t) * p[17];
  return {
    x: q * Math.sin(c) * spread + cross,
    y: (q + y / p[18] + rho * p[19]) * Math.cos(c),
  };
}

function applyDevelopment(
  genome: CreatureGenome,
  point: EvaluatedPoint,
  index01: number,
  time: number,
  morph: MorphState,
): EvaluatedPoint {
  const [kind, baseAmount, baseFrequency, basePhase] = genome.development;
  const amount = baseAmount * morph.mutation;
  const frequency = baseFrequency * (0.82 + 0.18 * morph.texture);
  const phase = basePhase + (time * morph.motion + morph.phase) * 0.16 + morph.polarity * Math.PI * 0.5;
  const envelope = Math.sin(Math.PI * index01);
  let x = point.x * morph.tension;
  let y = point.y / Math.sqrt(morph.tension);

  if (kind === 0) {
    x += amount * Math.sin(frequency * y + phase) * envelope;
    y += amount * 0.45 * Math.cos(frequency * x - phase) * envelope;
  } else if (kind === 1) {
    x *= 1 + amount * 1.7 * Math.cos(frequency * y + phase);
    const mirrorSide = x / Math.sqrt(x * x + 0.04);
    y += amount * 0.5 * Math.sin(frequency * Math.abs(x) + phase) * mirrorSide;
  } else if (kind === 2) {
    const flow = Math.sin(frequency * (0.65 * y + 0.35 * x) + phase);
    const counterflow = Math.cos(frequency * (0.55 * x - 0.45 * y) - phase);
    x += amount * flow * (0.3 + Math.abs(y));
    y += amount * 0.24 * counterflow * (0.3 + Math.abs(x));
  } else if (kind === 3) {
    const orbit = frequency * TAU * index01;
    x += amount * Math.sin(orbit + phase) * (0.35 + Math.abs(y));
    y += amount * 0.55 * Math.cos(orbit - phase) * (0.25 + Math.abs(x));
  } else if (kind === 4) {
    x += amount * Math.sin(frequency * y + phase) * Math.cos(frequency * 0.5 * x - phase);
    y += amount * 0.7 * Math.sin(frequency * x - phase) * Math.cos(frequency * 0.5 * y + phase);
  } else {
    const angle = Math.atan2(y, x);
    const radius = Math.hypot(x, y);
    const appendages = Math.round(clamp(frequency, 2, 9));
    const growth = Math.min(0.28, amount * 2.15) * envelope * envelope;
    const chirality = Math.min(0.32, amount * 2.4) * envelope * envelope;
    const nextRadius = radius * (1 + growth * Math.cos(appendages * angle + phase));
    const nextAngle = angle + chirality * Math.sin((appendages - 1) * angle - phase);
    x = nextRadius * Math.cos(nextAngle);
    y = nextRadius * Math.sin(nextAngle);
  }

  x += morph.polarity * amount * 0.35 * envelope;

  // A second, bounded developmental layer transports the point cloud along a
  // smooth generated spine. It produces new posture without rotating the
  // source axes or breaking neighbouring points apart.
  const directionCode = genome.family + genome.modules.reduce((sum, module) => sum + module, 0);
  const direction = directionCode % 2 === 0 ? -1 : 1;
  let bend = direction * amount * (0.65 + 0.35 * Math.abs(morph.gesture));
  let sCurve = amount * 0.72 * morph.gesture;
  const segments = 1 + Math.floor(baseFrequency) % 3;
  const derivativeLimit = Math.PI * Math.abs(bend) + segments * Math.PI * Math.abs(sCurve);
  if (derivativeLimit > 0.86) {
    const reduction = 0.86 / derivativeLimit;
    bend *= reduction;
    sCurve *= reduction;
  }
  const spinePosition = clamp(y + 0.5, 0, 1);
  const centreline = bend * Math.sin(Math.PI * spinePosition + basePhase)
    + sCurve * Math.sin(segments * Math.PI * spinePosition - basePhase);
  const slope = Math.PI * bend * Math.cos(Math.PI * spinePosition + basePhase)
    + segments * Math.PI * sCurve * Math.cos(segments * Math.PI * spinePosition - basePhase);
  const normalX = 1 / Math.sqrt(1 + slope * slope);
  return {
    x: centreline + x * normalX,
    y: y - x * slope * normalX,
  };
}

function percentile(sorted: readonly number[], amount: number): number {
  if (sorted.length === 0) return 0;
  const position = clamp(amount, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

function robustBounds(points: readonly EvaluatedPoint[]) {
  const xs = points.map(({ x }) => x).sort((a, b) => a - b);
  const ys = points.map(({ y }) => y).sort((a, b) => a - b);
  return {
    minX: percentile(xs, 0.005),
    maxX: percentile(xs, 0.995),
    minY: percentile(ys, 0.005),
    maxY: percentile(ys, 0.995),
  };
}

interface CloudMetrics {
  readonly occupancy: number;
  readonly cohesion: number;
  readonly componentRatio: number;
  readonly concentration: number;
}

function measurePointCloud(points: readonly EvaluatedPoint[]): CloudMetrics {
  const bounds = robustBounds(points);
  const width = Math.max(0.0001, bounds.maxX - bounds.minX);
  const height = Math.max(0.0001, bounds.maxY - bounds.minY);
  const grid = new Uint16Array(QUALITY_GRID_SIZE * QUALITY_GRID_SIZE);
  for (const point of points) {
    const nx = (point.x - bounds.minX) / width;
    const ny = (point.y - bounds.minY) / height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
    const gx = Math.min(QUALITY_GRID_SIZE - 1, Math.floor(nx * QUALITY_GRID_SIZE));
    const gy = Math.min(QUALITY_GRID_SIZE - 1, Math.floor(ny * QUALITY_GRID_SIZE));
    grid[gy * QUALITY_GRID_SIZE + gx] += 1;
  }

  let occupied = 0;
  let neighbourCells = 0;
  let peak = 0;
  const active = new Uint8Array(grid.length);
  for (let cell = 0; cell < grid.length; cell += 1) {
    if (grid[cell] === 0) continue;
    active[cell] = 1;
    occupied += 1;
    peak = Math.max(peak, grid[cell]);
    const x = cell % QUALITY_GRID_SIZE;
    const y = Math.floor(cell / QUALITY_GRID_SIZE);
    let neighbours = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= QUALITY_GRID_SIZE || ny >= QUALITY_GRID_SIZE) continue;
        if (grid[ny * QUALITY_GRID_SIZE + nx] > 0) neighbours += 1;
      }
    }
    if (neighbours > 0) neighbourCells += 1;
  }

  const dilated = new Uint8Array(active.length);
  for (let cell = 0; cell < active.length; cell += 1) {
    if (!active[cell]) continue;
    const x = cell % QUALITY_GRID_SIZE;
    const y = Math.floor(cell / QUALITY_GRID_SIZE);
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx >= 0 && ny >= 0 && nx < QUALITY_GRID_SIZE && ny < QUALITY_GRID_SIZE) {
          dilated[ny * QUALITY_GRID_SIZE + nx] = 1;
        }
      }
    }
  }

  const visited = new Uint8Array(dilated.length);
  let largestComponent = 0;
  for (let start = 0; start < dilated.length; start += 1) {
    if (!dilated[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    let size = 0;
    while (queue.length > 0) {
      const cell = queue.pop()!;
      size += 1;
      const x = cell % QUALITY_GRID_SIZE;
      const y = Math.floor(cell / QUALITY_GRID_SIZE);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= QUALITY_GRID_SIZE || ny >= QUALITY_GRID_SIZE) continue;
        const next = ny * QUALITY_GRID_SIZE + nx;
        if (dilated[next] && !visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    largestComponent = Math.max(largestComponent, size);
  }

  const dilatedCount = dilated.reduce((sum, value) => sum + value, 0);
  return {
    occupancy: occupied / grid.length,
    cohesion: occupied === 0 ? 0 : neighbourCells / occupied,
    componentRatio: dilatedCount === 0 ? 0 : largestComponent / dilatedCount,
    concentration: points.length === 0 ? 1 : peak / points.length,
  };
}

function analyseCandidate(genome: CreatureGenome): QualityResult {
  const frames = [0.35, 1.9, 3.45, 5.1];
  const rawFrames: Array<Array<{ point: EvaluatedPoint; index01: number }>> = [];
  const allRawPoints: EvaluatedPoint[] = [];
  let finiteCount = 0;

  for (const frame of frames) {
    const samples: Array<{ point: EvaluatedPoint; index01: number }> = [];
    for (let sample = 0; sample < QUALITY_SAMPLE_COUNT; sample += 1) {
      const index01 = sample / (QUALITY_SAMPLE_COUNT - 1);
      const index = Math.round(index01 * (genome.sourcePointCount - 1));
      const point = evaluateRawPoint(genome, index, frame, DEFAULT_MORPH);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      finiteCount += 1;
      samples.push({ point, index01 });
      allRawPoints.push(point);
    }
    rawFrames.push(samples);
  }

  const finiteRatio = finiteCount / (QUALITY_SAMPLE_COUNT * frames.length);
  if (allRawPoints.length < QUALITY_SAMPLE_COUNT) {
    return { score: 0, accepted: false, centerX: 0, centerY: 0, normalization: 1, occupancy: 0, cohesion: 0, aspect: 0 };
  }

  const rawBounds = robustBounds(allRawPoints);
  const rawWidth = Math.max(0.0001, rawBounds.maxX - rawBounds.minX);
  const rawHeight = Math.max(0.0001, rawBounds.maxY - rawBounds.minY);
  let centerX = (rawBounds.minX + rawBounds.maxX) / 2;
  let centerY = (rawBounds.minY + rawBounds.maxY) / 2;
  let normalization = 1.05 / Math.max(rawWidth, rawHeight);

  const developedFrames = rawFrames.map((samples, frameIndex) => samples.map(({ point, index01 }) => {
    const normalized = {
      x: (point.x - centerX) * normalization,
      y: (point.y - centerY) * normalization,
    };
    return applyDevelopment(genome, normalized, index01, frames[frameIndex], DEFAULT_MORPH);
  }));
  const developedPoints = developedFrames.flat();
  const bounds = robustBounds(developedPoints);
  const width = Math.max(0.0001, bounds.maxX - bounds.minX);
  const height = Math.max(0.0001, bounds.maxY - bounds.minY);
  const aspect = width / height;
  const frameBounds = developedFrames.map(robustBounds);
  const metrics = developedFrames.map(measurePointCloud);
  const occupancy = metrics.reduce((sum, value) => sum + value.occupancy, 0) / metrics.length;
  const cohesion = metrics.reduce((sum, value) => sum + value.cohesion, 0) / metrics.length;
  const componentRatio = metrics.reduce((sum, value) => sum + value.componentRatio, 0) / metrics.length;
  const concentration = Math.max(...metrics.map((value) => value.concentration));
  const minOccupancy = Math.min(...metrics.map((value) => value.occupancy));
  const maxOccupancy = Math.max(...metrics.map((value) => value.occupancy));
  const minCohesion = Math.min(...metrics.map((value) => value.cohesion));
  const minComponentRatio = Math.min(...metrics.map((value) => value.componentRatio));
  const firstWidth = Math.max(0.0001, frameBounds[0].maxX - frameBounds[0].minX);
  const firstHeight = Math.max(0.0001, frameBounds[0].maxY - frameBounds[0].minY);
  const sizeChange = frameBounds.slice(1).reduce((largest, frame) => {
    const frameWidth = Math.max(0.0001, frame.maxX - frame.minX);
    const frameHeight = Math.max(0.0001, frame.maxY - frame.minY);
    return Math.max(largest, Math.abs(frameWidth / firstWidth - 1), Math.abs(frameHeight / firstHeight - 1));
  }, 0);

  const occupancyScore = 1 - clamp(Math.abs(occupancy - 0.19) / 0.2, 0, 1);
  const aspectScore = 1 - clamp(Math.abs(Math.log(aspect)) / Math.log(4), 0, 1);
  const motionScore = 1 - clamp(Math.abs(sizeChange - 0.12) / 0.45, 0, 1);
  const concentrationScore = 1 - clamp((concentration - 0.035) / 0.12, 0, 1);
  const score = finiteRatio * 0.14
    + occupancyScore * 0.2
    + cohesion * 0.18
    + componentRatio * 0.22
    + aspectScore * 0.12
    + motionScore * 0.08
    + concentrationScore * 0.06;
  const accepted = finiteRatio >= 0.995
    && aspect >= 0.28
    && aspect <= 3.5
    && minOccupancy >= 0.025
    && maxOccupancy <= 0.55
    && minCohesion >= 0.48
    && minComponentRatio >= 0.42
    && concentration <= 0.2
    && sizeChange <= 0.58;

  return { score, accepted, centerX, centerY, normalization, occupancy, cohesion, aspect };
}

export function scoreGenome(genome: CreatureGenome): number {
  return analyseCandidate(genome).score;
}

export function isGenomeAccepted(genome: CreatureGenome): boolean {
  return analyseCandidate(genome).accepted;
}

/**
 * Evaluates the generated equation and its developmental transform before the
 * final presence scale is applied. Keeping this stage explicit lets CPU
 * previews insert customMorph at the same point as the GPU pipeline.
 */
export function evaluateGenomePointBeforeScale(
  genome: CreatureGenome,
  index: number,
  time: number,
  morph: MorphState = DEFAULT_MORPH,
): EvaluatedPoint {
  const raw = evaluateRawPoint(genome, index, time, morph);
  const normalized = {
    x: (raw.x - genome.centerX) * genome.normalization,
    y: (raw.y - genome.centerY) * genome.normalization,
  };
  const developed = applyDevelopment(
    genome,
    normalized,
    index / Math.max(1, genome.sourcePointCount - 1),
    time,
    morph,
  );
  return developed;
}

export function evaluateGenomePoint(
  genome: CreatureGenome,
  index: number,
  time: number,
  morph: MorphState = DEFAULT_MORPH,
): EvaluatedPoint {
  const developed = evaluateGenomePointBeforeScale(genome, index, time, morph);
  return { x: developed.x * morph.scale, y: developed.y * morph.scale };
}

export function generateCreature(
  seed: number,
  requestedFamily?: number,
  avoidFamily?: number,
  forcedModules?: ProgramModules,
  forcedDevelopmentKind?: number,
): GeneratedCreature {
  const normalizedSeed = seed >>> 0;
  const family = requestedFamily === undefined
    ? chooseFamily(normalizedSeed, avoidFamily)
    : Math.round(clamp(requestedFamily, 0, EQUATION_FAMILY_NAMES.length - 1));
  const programRandom = mulberry32(normalizedSeed ^ Math.imul(family + 1, 0x85ebca6b));
  const selectedModules = forcedModules ?? moduleTuple(programRandom, family);
  const selectedDevelopmentKind = forcedDevelopmentKind
    ?? integer(programRandom, 0, DEVELOPMENT_NAMES.length - 1);
  let bestGenome: CreatureGenome | undefined;
  let bestQuality: QualityResult | undefined;

  const consider = (candidate: CreatureGenome): void => {
    const quality = analyseCandidate(candidate);
    if (!quality.accepted) return;
    if (!bestQuality || quality.score > bestQuality.score) {
      bestGenome = candidate;
      bestQuality = quality;
    }
  };

  for (let index = 0; index < CANDIDATE_COUNT; index += 1) {
    consider(createCandidate(
      normalizedSeed,
      family,
      index,
      selectedModules,
      selectedDevelopmentKind,
    ));
  }

  // A difficult module combination must never leak a rejected point cloud into
  // the interface. Broaden the deterministic search only when the primary
  // program produced no coherent specimen, and damp the added development
  // field while the alternative topology is evaluated.
  if (!bestGenome) {
    for (let offset = 0; offset < RESCUE_CANDIDATE_COUNT; offset += 1) {
      const candidate = createCandidate(
        normalizedSeed,
        family,
        CANDIDATE_COUNT + offset,
        forcedModules,
        forcedDevelopmentKind,
      );
      consider({
        ...candidate,
        development: [
          candidate.development[0],
          Math.min(candidate.development[1], 0.045),
          candidate.development[2],
          candidate.development[3],
        ],
      });
    }
  }

  if (!bestGenome || !bestQuality) {
    throw new Error('The equation generator did not find a coherent candidate.');
  }
  const genome: CreatureGenome = {
    ...bestGenome,
    centerX: bestQuality.centerX,
    centerY: bestQuality.centerY,
    normalization: bestQuality.normalization,
  };
  const paletteRandom = mulberry32(normalizedSeed ^ 0x63d83595);
  const hue = Math.floor(paletteRandom() * 360);
  const prefix = NAME_PREFIXES[Math.floor(paletteRandom() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(paletteRandom() * NAME_SUFFIXES.length)];
  return {
    genome,
    palette: {
      body: hslToHex(hue + range(paletteRandom, -14, 14), 0.15, 0.8),
      pulse: hslToHex(hue + range(paletteRandom, 46, 132), 0.88, 0.58),
    },
    name: `${prefix} ${EQUATION_FAMILY_NAMES[family]} ${suffix}`,
    score: bestQuality.score,
  };
}

export function generateRelatedCreature(parent: CreatureGenome, seed: number): GeneratedCreature {
  return generateCreature(seed, parent.family, undefined, parent.modules, parent.development[0]);
}

export function deriveVariationSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1_664_525) + 1_013_904_223) >>> 0;
}

export function normalizeMorph(candidate: Partial<Record<MorphKey, unknown>>): MorphState {
  return Object.fromEntries(
    MORPH_CONTROLS.map((control) => {
      const rawValue = candidate[control.key];
      const numericValue = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : control.defaultValue;
      const stepped = Math.round(numericValue / control.step) * control.step;
      return [control.key, clamp(stepped, control.min, control.max)];
    }),
  ) as unknown as MorphState;
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 0.01 && value !== 0) return value.toFixed(7).replace(/0+$/, '');
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function f(value: number): string {
  return formatNumber(value);
}

function formatDevelopmentEquation(genome: CreatureGenome, morph: MorphState): string {
  const [kind, baseAmount, baseFrequency, basePhase] = genome.development;
  const amount = baseAmount * morph.mutation;
  const frequency = baseFrequency * (0.82 + 0.18 * morph.texture);
  const phase = `${f(basePhase)} + 0.16 tau ${morph.polarity < 0 ? '-' : '+'} ${f(Math.abs(morph.polarity * Math.PI * 0.5))}`;
  const directionCode = genome.family + genome.modules.reduce((sum, module) => sum + module, 0);
  const direction = directionCode % 2 === 0 ? -1 : 1;
  const segments = 1 + Math.floor(baseFrequency) % 3;
  let mutation: string;
  if (kind === 0) {
    mutation = `x1 = x + mu Sin[nu y + phi] h;
y1 = y + 0.45 mu Cos[nu x1 - phi] h;`;
  } else if (kind === 1) {
    mutation = `x1 = x (1 + 1.7 mu Cos[nu y + phi]);
s1 = x1/Sqrt[x1^2 + 0.04];
y1 = y + 0.5 mu Sin[nu Abs[x1] + phi] s1;`;
  } else if (kind === 2) {
    mutation = `g1 = Sin[nu (0.65 y + 0.35 x) + phi];
g2 = Cos[nu (0.55 x - 0.45 y) - phi];
x1 = x + mu g1 (0.3 + Abs[y]);
y1 = y + 0.24 mu g2 (0.3 + Abs[x1]);`;
  } else if (kind === 3) {
    mutation = `a = 2 Pi nu u;
x1 = x + mu Sin[a + phi] (0.35 + Abs[y]);
y1 = y + 0.55 mu Cos[a - phi] (0.25 + Abs[x1]);`;
  } else if (kind === 4) {
    mutation = `x1 = x + mu Sin[nu y + phi] Cos[nu x/2 - phi];
y1 = y + 0.7 mu Sin[nu x1 - phi] Cos[nu y/2 + phi];`;
  } else {
    mutation = `a = ArcTan[x, y];  r0 = Sqrt[x^2 + y^2];
n0 = Round[Clip[nu, {2, 9}]];
gr = Min[0.28, 2.15 mu] h^2;
ch = Min[0.32, 2.4 mu] h^2;
r1 = r0 (1 + gr Cos[n0 a + phi]);
a1 = a + ch Sin[(n0 - 1) a - phi];
x1 = r1 Cos[a1];  y1 = r1 Sin[a1];`;
  }
  return `u = i/${Math.max(1, genome.sourcePointCount - 1)};
{x, y} = ${f(genome.normalization)} (P0 - {${f(genome.centerX)}, ${f(genome.centerY)}});
{x, y} = {${f(morph.tension)} x, y/Sqrt[${f(morph.tension)}]};
h = Sin[Pi u];  mu = ${f(amount)};  nu = ${f(frequency)};
phi = ${phase};
${mutation}

x1 = x1 + ${f(morph.polarity * amount * 0.35)} h;
b1 = ${direction} mu (0.65 + 0.35 Abs[${f(morph.gesture)}]);
b2 = 0.72 mu ${f(morph.gesture)};  n = ${segments};
er = Min[1, 0.86/Max[0.000001, Pi Abs[b1] + n Pi Abs[b2]]];
b1 = er b1;  b2 = er b2;
s = Clip[y1 + 0.5, {0, 1}];
g = b1 Sin[Pi s + ${f(basePhase)}] + b2 Sin[n Pi s - ${f(basePhase)}];
dg = Pi b1 Cos[Pi s + ${f(basePhase)}]
     + n Pi b2 Cos[n Pi s - ${f(basePhase)}];
nx = 1/Sqrt[1 + dg^2];

P = ${f(morph.scale)} {g + x1 nx, y1 - x1 dg nx};`;
}

export function formatBuilderEquation(genome: CreatureGenome, morph: MorphState): string {
  const p = genome.parameters;
  const [carrier, metric, phase, projection] = genome.modules;
  const spread = morph.reach;
  const fold = morph.fold;
  const detail = morph.texture;
  const resonance = morph.resonance;
  const lobes = morph.lobes;
  const tau = `tau = ${f(morph.motion)} t ${morph.phase < 0 ? '-' : '+'} ${f(Math.abs(morph.phase))};`;
  let equation: string;

  if (genome.family === 0) {
    const carrierPhase = carrier === 1 ? `x/${f(p[3] * 5.5)}` : `${f(p[3] * detail)} y`;
    const cross = carrier === 2 ? ` Cos[y/${f(p[5] * 0.85)}]` : '';
    const pole = projection === 1 ? ' + 0.22 k/(k^2 + 0.01)' : '';
    equation = `x = i + 1;  y = x/${f(p[0])};
k = (${f(p[1])} + ${f(p[2])} Sin[${carrierPhase} - ${f(p[4])} tau])
    Cos[x/${f(p[5])}]${cross};
e = y/${f(p[6])} - ${f(p[7])};
d = Sqrt[k^2 + e^2] + ${f(p[22])} Sin[${f(p[23] * detail)} y + 0.45 tau];
c = ${f(fold)} (${f(p[19])} d + ${f(p[20])} d^2 - ${f(p[21])} tau);

q = ${f(p[8])} Sin[${f(p[9] * lobes)} ArcTan[e, k]]
    + ${f(p[10])} Sin[${f(p[11] * detail)} k]${pole}
    + Sin[y/${f(p[12])}] k
      (${f(p[13])} + ${f(p[14] * resonance)} Sin[${f(p[15])} e - ${f(p[16])} d + 2 tau]);

P0 = {q + ${f(p[17] * spread)} Cos[c],
      ${projection === 0 ? '' : '-'}q Sin[c] ${projection === 0 ? '+' : '-'} ${f(p[18])} d};`;
  } else if (genome.family === 1) {
    const cross = carrier === 1 ? ` Cos[y/${f(p[4])}]` : '';
    const trig = projection === 0 ? 'Cos' : 'Sin';
    const lobe = phase === 0 ? 'e ' : '';
    const metricWave = metric === 0 ? ' + 0.13 Sin[tau]' : '';
    equation = `x = Mod[i, ${f(p[0])}];  y = i/${f(p[1])};
k = ${f(p[2])} Cos[x/${f(p[3])}]${cross};
e = y/${f(p[5])} - ${f(p[6])};
d = (k^2 + e^2)/${f(p[7])} + ${f(p[8])}${metricWave};
c = ${f(fold)} (${f(p[16])} d + ${f(p[17])} e - ${f(p[18])} tau);

q = ${f(p[9])} - ${f(p[10])} ${lobe}Sin[${f(p[11] * lobes)} ArcTan[e, k]]/d
    + k (${f(p[12])} + ${f(p[13] * resonance)} ${trig}[${f(p[14] * detail)} d^2 - ${f(p[19])} tau]);

P0 = {${f(spread)} q Sin[c], (q + ${f(p[15] * spread)} d) Cos[c]};`;
  } else if (genome.family === 2) {
    const divisor = metric === 0 ? f(p[9]) : 'd';
    const parity = phase === 0 ? 'Mod[i, 2]' : '1';
    const direction = projection === 0 ? '+' : '-';
    const envelope = carrier === 0
      ? `r = If[y < ${f(p[1])},
  ${f(p[2])} + ${f(p[2])} Sin[BitXor[Floor[y], ${f(p[19])}]],
  ${f(p[3])} + Cos[y]];`
      : `r = If[y < ${f(p[1])},
  ${f(p[2])} + 2 Sin[1.7 y],
  ${f(p[3])} + ${f(p[4])} y + Cos[y/2]];`;
    equation = `y = i/${f(p[0])};
${envelope}
k = r Cos[i ${direction} ${f(p[13])} tau];
e = y/${f(p[5])} - ${f(p[6])};
d = Sqrt[k^2 + e^2] + ${f(p[7])} Sin[e/${f(p[8])} ${direction} tau];
c = ${f(fold)} (${f(p[17])} d + ${parity} - ${f(p[18])} tau);

q = y k/${divisor}
    (${f(p[10])} + ${f(p[11] * resonance)} Sin[${f(p[12] * detail * lobes)} d + ${f(p[14])} y - 4 tau]);

P0 = {q + ${f(p[15] * spread)} Cos[c], q Sin[c] + ${f(p[16])} d};`;
  } else if (genome.family === 3) {
    const safeK = carrier === 1
      ? '\nks = If[Abs[k] >= 0.0001, k, If[k < 0, -0.0001, 0.0001]];'
      : '';
    const singular = carrier === 0
      ? `${f(p[7])} k/(k^2 + ${f(p[8] * p[8])})`
      : `${f(p[7])} Cos[${f(p[11])}/ks]`;
    const c = metric === 0
      ? `${f(fold)} (o/${f(p[18])} + e/${f(p[19])}) - tau/${f(p[20])}`
      : `${f(fold)} o e/${f(p[18])} - tau/${f(p[20])}`;
    const output = projection === 0
      ? `P0 = {${f(spread)} q Cos[c], (q + ${f(p[21])}) Sin[c] Cos[c] - q/3 + 30 o};`
      : `P0 = {${f(0.7 * spread)} q Sin[c], y/${f(p[21])} Cos[4 c - tau/2] - ${f(0.5 * p[22])} q Cos[c]};`;
    equation = `x = Mod[i, ${f(p[0])}];  y = i/${f(p[1])};
k = x/${f(p[2])} - ${f(p[3])};  e = y/${f(p[4])} + ${f(p[5])};${safeK}
o = Sqrt[k^2 + e^2]/${f(p[6])};
c = ${c};

q = ${f(p[10])} x + ${f(p[9])} + ${singular}
    + ${f(resonance)} o k
      (Cos[${f(p[12] * detail * lobes)} e]/${f(p[13])} + Cos[y/${f(p[14])}]/${f(p[15])})
      Sin[${f(p[16] * detail)} o - ${f(p[17])} tau];

${output}`;
  } else if (genome.family === 4) {
    const metricBlock = projection === 3
      ? `d = -${f(p[3] * resonance)} Abs[Sin[k/2] Cos[0.8 e]];`
      : projection === 2
        ? `o = Sqrt[k^2 + e^2]/11 Cos[Sin[k/2] Cos[e/2]];\nd = ${f(p[3] * resonance)} Cos[o];`
        : `o = Sqrt[k^2 + e^2]/${f(p[2])};\nd = ${f(p[3] * resonance)} Cos[${f(p[4])} o];`;
    let output: string;
    if (projection === 0) output = `P0 = {(x + ${f(p[6] * spread)} d k Sin[${f(p[5] * detail * lobes)} d - tau]
       + ${f(p[7])} k Sin[y/${f(p[8])} + tau])/2,
      ${f(p[9])} d + ${f(p[10])} (d - 2) Abs[Cos[d/2 - tau/2]] + d e};`;
    else if (projection === 1) output = `c = ${f(fold)} (${f(p[11])} (d + o) - ${f(p[12])} tau);
P0 = {${f(spread)} (k ArcTan[${f(p[13])} Cos[${f(p[14] * detail * lobes)} d]] + x/2) Cos[c],
      (k d Cos[o - d + tau] + y/2) Sin[c]};`;
    else if (projection === 2) output = `P0 = {(x + ${f(spread)} d k
       (Sin[${f(p[19] * detail * lobes)} d + tau] + Sin[y o^2]/${f(p[17])}))/${f(p[15])},
      ${f(p[18])} (y/3 - ${f(p[16])} d + ${f(p[17])} Cos[d + tau])};`;
    else output = `o = 2 - Sqrt[k^2 + e^2]/${f(p[2])};
P0 = {0.7 (x - 4 d k + d k Sin[d + tau]) + 2 k o,
      0.7 (y - d y/5 + d e Cos[d + tau + o] Sin[tau + d]) + e o};`;
    equation = `x = 100 + Mod[i, 200];  y = 100 + Floor[i/200];
k = x/${f(p[1])} - 25;  e = y/${f(p[1])} - 25;
${metricBlock}

${output}`;
  } else if (genome.family === 5) {
    const waveA = carrier === 1 ? 'Sin[k]' : 'Cos[k]';
    const waveB = carrier === 2 ? `Cos[y/${f(p[7])}]` : `Sin[y/${f(p[7])}]`;
    const echo = projection === 0 ? 'Cos[c/2]' : 'Sin[c/2]';
    equation = `x = Mod[i, ${f(p[0])}];  y = i/${f(p[1])};
k = x/${f(p[2])} - ${f(p[3])};
e = ${f(p[4])} ${waveA} + ${f(p[5])} ${waveB} + ${f(p[6])} Cos[k/${f(p[8])}];
d = Abs[e];
c = ${f(fold)} (y e/${f(p[16])} - tau/${f(p[17])} + d/${f(p[18])});

q = x/${f(p[9])} + ${f(p[10])}
    + d k (${f(p[11])} + ${f(p[12] * resonance)} Cos[${f(p[13] * detail * lobes)} d - ${f(p[14])} tau + y/${f(p[15])}]);

P0 = {${f(spread)} q Cos[c], (q/2 + ${f(p[19])} ${echo}) Sin[c] + ${f(p[20])} e};`;
  } else {
    const secant = carrier === 0 ? 'Cos[z]/(Cos[z]^2 + eps^2)' : 'Sin[z]/(Sin[z]^2 + eps^2)';
    const cross = projection === 0 ? 'e Sin[d + k - tau]' : 'k Cos[d + e + tau]';
    equation = `x = 99 + Mod[i, ${f(p[0])}];
y = 99 + ${f(p[20])} Floor[i/${f(p[0])}];
k = x/${f(p[2])} - ${f(p[3])};  e = y/${f(p[4])} - ${f(p[5])};
d = (k^2 + e^2)/${f(p[6])};
z = ${f(p[9] * detail * lobes)} y;  eps = ${f(p[8])};
sec = ${secant};
c = ${f(fold)} (d/${f(p[12])} - tau/${f(p[13])});

q = x/${f(p[11])} + ${f(p[7])} k sec Sin[${f(p[10])} d^2 - ${f(p[15])} tau];

P0 = {${f(spread)} q Sin[c] + ${f(p[17])} ${cross},
      (q + y/${f(p[18])} + ${f(p[19])} d) Cos[c]};`;
  }

  return `${tau}\n${equation}\n\n${formatDevelopmentEquation(genome, morph)}`;
}
