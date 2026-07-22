import {
  MORPH_KEYS,
  isGenomeAccepted,
  normalizeMorph,
  type BuilderPalette,
  type CreatureGenome,
  type MorphKey,
  type MorphState,
} from './builder-model';
import {
  IDENTITY_CUSTOM_MORPH,
  type CustomMorphExpression,
  type CustomMorphProgram,
} from './builder-code';
import { deriveLocomotionProfile, type LocomotionProfile } from './saver-motion';

export const CREATURE_SAVER_FORMAT = 'creature-saver';
export const CREATURE_SAVER_VERSION = 1;
/** Same-origin handoff key used only by the local browser preview route. */
export const CREATURE_SAVER_PREVIEW_KEY = 'creature-saver-preview-v1';

const HEX_COLOR = /^#[\da-f]{6}$/i;
const MAX_CUSTOM_MORPH_DEPTH = 12;
const MAX_CUSTOM_MORPH_ASSIGNMENTS = 12;

export type CreatureSaverOrigin = 'morphospace' | 'museum-working-copy';

export interface CreatureSaverPresetInput {
  readonly name: string;
  readonly genome: CreatureGenome;
  readonly morph: MorphState;
  readonly palette: BuilderPalette;
  readonly customMorph?: CustomMorphProgram;
  readonly origin?: CreatureSaverOrigin;
}

export interface CreatureSaverSpecimen {
  readonly name: string;
  readonly genome: CreatureGenome;
  readonly morph: MorphState;
  readonly palette: BuilderPalette;
  /** A bounded AST, never arbitrary JavaScript or arbitrary shader source. */
  readonly customMorph: CustomMorphProgram;
  readonly origin: CreatureSaverOrigin;
}

export interface CreatureSaverPresentation {
  readonly scale: number;
  readonly edgeMargin: number;
  readonly path: 'cross-current';
}

export interface CreatureSaverPreset {
  readonly format: typeof CREATURE_SAVER_FORMAT;
  readonly version: typeof CREATURE_SAVER_VERSION;
  readonly id: string;
  readonly specimen: CreatureSaverSpecimen;
  readonly locomotion: LocomotionProfile;
  readonly presentation: CreatureSaverPresentation;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cloneGenome(genome: CreatureGenome): CreatureGenome {
  return {
    seed: genome.seed >>> 0,
    family: Math.round(genome.family),
    modules: [...genome.modules] as CreatureGenome['modules'],
    development: [...genome.development] as CreatureGenome['development'],
    parameters: [...genome.parameters],
    sourcePointCount: Math.round(genome.sourcePointCount),
    normalization: genome.normalization,
    centerX: genome.centerX,
    centerY: genome.centerY,
  };
}

function cloneMorph(morph: MorphState): MorphState {
  return Object.fromEntries(MORPH_KEYS.map((key) => [key, morph[key]])) as MorphState;
}

function clonePalette(palette: BuilderPalette): BuilderPalette {
  return { body: palette.body.toLowerCase(), pulse: palette.pulse.toLowerCase() };
}

function cloneExpression(expression: CustomMorphExpression): CustomMorphExpression {
  if (expression.kind === 'number') return { kind: 'number', value: expression.value };
  if (expression.kind === 'variable') return { kind: 'variable', name: expression.name };
  if (expression.kind === 'unary') {
    return {
      kind: 'unary',
      operator: expression.operator,
      argument: cloneExpression(expression.argument),
    };
  }
  if (expression.kind === 'binary') {
    return {
      kind: 'binary',
      operator: expression.operator,
      left: cloneExpression(expression.left),
      right: cloneExpression(expression.right),
    };
  }
  return { kind: 'call', name: expression.name, argument: cloneExpression(expression.argument) };
}

function cloneCustomMorph(program: CustomMorphProgram): CustomMorphProgram {
  return {
    assignments: program.assignments.map(({ target, expression }) => ({
      target,
      expression: cloneExpression(expression),
    })),
  };
}

function validateExpression(value: unknown, depth = 0): value is CustomMorphExpression {
  if (!value || typeof value !== 'object' || depth > MAX_CUSTOM_MORPH_DEPTH) return false;
  const candidate = value as Partial<CustomMorphExpression>;
  if (candidate.kind === 'number') {
    const number = asFiniteNumber(candidate.value);
    return number !== undefined && Math.abs(number) <= 1_000;
  }
  if (candidate.kind === 'variable') {
    return candidate.name === 'x' || candidate.name === 'y' || candidate.name === 'u' || candidate.name === 'time';
  }
  if (candidate.kind === 'unary') {
    return (candidate.operator === '+' || candidate.operator === '-')
      && validateExpression(candidate.argument, depth + 1);
  }
  if (candidate.kind === 'binary') {
    return (candidate.operator === '+'
      || candidate.operator === '-'
      || candidate.operator === '*'
      || candidate.operator === '/')
      && validateExpression(candidate.left, depth + 1)
      && validateExpression(candidate.right, depth + 1);
  }
  if (candidate.kind === 'call') {
    return (candidate.name === 'sin'
      || candidate.name === 'cos'
      || candidate.name === 'abs'
      || candidate.name === 'sqrt')
      && validateExpression(candidate.argument, depth + 1);
  }
  return false;
}

function parseCustomMorph(value: unknown): CustomMorphProgram | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const assignments = (value as Partial<CustomMorphProgram>).assignments;
  if (!Array.isArray(assignments) || assignments.length > MAX_CUSTOM_MORPH_ASSIGNMENTS) return undefined;
  const valid = assignments.every((assignment) => (
    assignment
    && typeof assignment === 'object'
    && ((assignment as { target?: unknown }).target === 'x' || (assignment as { target?: unknown }).target === 'y')
    && validateExpression((assignment as { expression?: unknown }).expression)
  ));
  return valid ? cloneCustomMorph({ assignments: assignments as CustomMorphProgram['assignments'] }) : undefined;
}

function parseGenome(value: unknown): CreatureGenome | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<CreatureGenome>;
  if (
    !Number.isInteger(candidate.seed)
    || !Number.isInteger(candidate.family)
    || !Array.isArray(candidate.modules)
    || candidate.modules.length !== 4
    || !candidate.modules.every(Number.isFinite)
    || !Array.isArray(candidate.development)
    || candidate.development.length !== 4
    || !candidate.development.every(Number.isFinite)
    || !Array.isArray(candidate.parameters)
    || candidate.parameters.length !== 24
    || !candidate.parameters.every(Number.isFinite)
    || !Number.isFinite(candidate.sourcePointCount)
    || !Number.isFinite(candidate.normalization)
    || !Number.isFinite(candidate.centerX)
    || !Number.isFinite(candidate.centerY)
  ) {
    return undefined;
  }
  const genome = cloneGenome(candidate as CreatureGenome);
  if (genome.family < 0 || genome.family > 6 || genome.sourcePointCount < 1 || genome.sourcePointCount > 40_000) {
    return undefined;
  }
  return isGenomeAccepted(genome) ? genome : undefined;
}

function parseMorph(value: unknown): MorphState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<Record<MorphKey, unknown>>;
  if (!MORPH_KEYS.every((key) => Number.isFinite(candidate[key]))) return undefined;
  return normalizeMorph(candidate);
}

function parsePalette(value: unknown): BuilderPalette | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<BuilderPalette>;
  if (!HEX_COLOR.test(candidate.body ?? '') || !HEX_COLOR.test(candidate.pulse ?? '')) return undefined;
  return clonePalette(candidate as BuilderPalette);
}

function hash(value: string): string {
  let state = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    state ^= value.charCodeAt(index);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return state.toString(16).padStart(8, '0');
}

export function createCreatureSaverPreset(input: CreatureSaverPresetInput): CreatureSaverPreset {
  const specimen: CreatureSaverSpecimen = {
    name: input.name.trim().slice(0, 96) || 'Unnamed organism',
    genome: cloneGenome(input.genome),
    morph: cloneMorph(input.morph),
    palette: clonePalette(input.palette),
    customMorph: cloneCustomMorph(input.customMorph ?? IDENTITY_CUSTOM_MORPH),
    origin: input.origin ?? 'morphospace',
  };
  const locomotion = deriveLocomotionProfile(specimen.genome, specimen.morph, specimen.customMorph);
  const identity = JSON.stringify({ genome: specimen.genome, morph: specimen.morph, palette: specimen.palette });
  return {
    format: CREATURE_SAVER_FORMAT,
    version: CREATURE_SAVER_VERSION,
    id: `creature-${hash(identity)}`,
    specimen,
    locomotion,
    presentation: {
      scale: clamp(0.78 + (specimen.morph.scale - 1) * 0.18, 0.56, 0.92),
      edgeMargin: 0.24,
      path: 'cross-current',
    },
  };
}

export function serializeCreatureSaverPreset(preset: CreatureSaverPreset): string {
  return `${JSON.stringify(preset, null, 2)}\n`;
}

export function parseCreatureSaverPreset(source: string): CreatureSaverPreset | undefined {
  try {
    const candidate = JSON.parse(source) as Partial<CreatureSaverPreset>;
    if (candidate.format !== CREATURE_SAVER_FORMAT || candidate.version !== CREATURE_SAVER_VERSION) return undefined;
    if (!candidate.specimen || typeof candidate.specimen !== 'object') return undefined;
    const rawSpecimen = candidate.specimen as Partial<CreatureSaverSpecimen>;
    const genome = parseGenome(rawSpecimen.genome);
    const morph = parseMorph(rawSpecimen.morph);
    const palette = parsePalette(rawSpecimen.palette);
    const customMorph = parseCustomMorph(rawSpecimen.customMorph);
    if (
      !genome
      || !morph
      || !palette
      || !customMorph
      || typeof rawSpecimen.name !== 'string'
      || (rawSpecimen.origin !== 'morphospace' && rawSpecimen.origin !== 'museum-working-copy')
    ) {
      return undefined;
    }
    const expected = createCreatureSaverPreset({
      name: rawSpecimen.name,
      genome,
      morph,
      palette,
      customMorph,
      origin: rawSpecimen.origin,
    });
    if (candidate.id !== expected.id) return undefined;
    return expected;
  } catch {
    return undefined;
  }
}
