import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MORPH,
  EQUATION_FAMILY_NAMES,
  MORPH_CONTROLS,
  deriveVariationSeed,
  evaluateGenomePoint,
  formatBuilderEquation,
  generateCreature,
  generateRelatedCreature,
  isGenomeAccepted,
  normalizeMorph,
} from './builder-model';

function silhouette(genome: ReturnType<typeof generateCreature>['genome']): Uint8Array {
  const gridSize = 18;
  const cells = new Uint8Array(gridSize * gridSize);
  const points = Array.from({ length: 720 }, (_, sample) => {
    const index = Math.round(sample / 719 * (genome.sourcePointCount - 1));
    return evaluateGenomePoint(genome, index, 1.7);
  });
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.0001, maxX - minX);
  const height = Math.max(0.0001, maxY - minY);
  for (const point of points) {
    const x = Math.min(gridSize - 1, Math.floor((point.x - minX) / width * gridSize));
    const y = Math.min(gridSize - 1, Math.floor((point.y - minY) / height * gridSize));
    cells[y * gridSize + x] = 1;
  }
  return cells;
}

function silhouetteDistance(left: Uint8Array, right: Uint8Array): number {
  let union = 0;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] || right[index]) union += 1;
    if (left[index] !== right[index]) difference += 1;
  }
  return union === 0 ? 0 : difference / union;
}

describe('equation-program creature generator', () => {
  it('produces deterministic programs across seven genuinely different topologies', () => {
    const first = generateCreature(0x12345678);
    const repeated = generateCreature(0x12345678);
    const generated = EQUATION_FAMILY_NAMES.map((_, family) => generateCreature(100 + family, family));

    expect(repeated).toEqual(first);
    expect(generated.map(({ genome }) => genome.family)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set(generated.map(({ genome }) => genome.modules.join(':'))).size).toBeGreaterThan(3);
    expect(new Set(generated.map(({ genome }) => genome.development[0])).size).toBeGreaterThan(2);
    expect(generated.every(({ genome }) => genome.parameters.length === 24)).toBe(true);
  });

  it('selects finite, bounded candidates and derives a robust view', () => {
    for (let family = 0; family < EQUATION_FAMILY_NAMES.length; family += 1) {
      const generated = generateCreature(0xdecafbad + family, family);
      const { genome } = generated;
      expect(generated.score).toBeGreaterThan(0.35);
      expect(isGenomeAccepted(genome)).toBe(true);
      expect(genome.normalization).toBeGreaterThan(0);
      expect(Number.isFinite(genome.centerX)).toBe(true);
      expect(Number.isFinite(genome.centerY)).toBe(true);
      for (let sample = 0; sample < 64; sample += 1) {
        const index = Math.round(sample / 63 * (genome.sourcePointCount - 1));
        const point = evaluateGenomePoint(genome, index, 1.2);
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });

  it('produces materially different silhouettes rather than renamed metadata', () => {
    const silhouettes = EQUATION_FAMILY_NAMES.map((_, family) => (
      silhouette(generateCreature(35_000 + family, family).genome)
    ));
    const distances: number[] = [];
    for (let left = 0; left < silhouettes.length; left += 1) {
      for (let right = left + 1; right < silhouettes.length; right += 1) {
        distances.push(silhouetteDistance(silhouettes[left], silhouettes[right]));
      }
    }

    expect(Math.min(...distances)).toBeGreaterThan(0.12);
    expect(distances.reduce((sum, distance) => sum + distance, 0) / distances.length).toBeGreaterThan(0.34);
  });

  it('avoids the previous topology for a new specimen', () => {
    const current = generateCreature(501);
    const next = generateCreature(deriveVariationSeed(current.genome.seed), undefined, current.genome.family);
    expect(next.genome.family).not.toBe(current.genome.family);
  });

  it('keeps a related form in the same compatible program topology', () => {
    const parent = generateCreature(777, 4);
    const related = generateRelatedCreature(parent.genome, deriveVariationSeed(parent.genome.seed));

    expect(related.genome.family).toBe(parent.genome.family);
    expect(related.genome.modules).toEqual(parent.genome.modules);
    expect(related.genome.development[0]).toBe(parent.genome.development[0]);
    expect(related.genome.parameters).not.toEqual(parent.genome.parameters);
    expect(isGenomeAccepted(related.genome)).toBe(true);
  });

  it('keeps semantic tuning inside conservative post-generation ranges', () => {
    const normalized = normalizeMorph({ scale: 50, reach: -10, fold: Number.NaN });

    expect(normalized.scale).toBe(1.18);
    expect(normalized.reach).toBe(0.68);
    expect(normalized.fold).toBe(DEFAULT_MORPH.fold);
    for (const control of MORPH_CONTROLS) {
      expect(DEFAULT_MORPH[control.key]).toBeGreaterThanOrEqual(control.min);
      expect(DEFAULT_MORPH[control.key]).toBeLessThanOrEqual(control.max);
    }
  });

  it('formats the generated program as mathematics rather than renderer styling', () => {
    for (let family = 0; family < EQUATION_FAMILY_NAMES.length; family += 1) {
      const equation = formatBuilderEquation(generateCreature(9_000 + family, family).genome, DEFAULT_MORPH);
      expect(equation).toMatch(/[kedo] =/);
      expect(equation).toContain('P0 =');
      expect(equation).toContain('P =');
      expect(equation).toContain('mu =');
      expect(equation).not.toMatch(/RGBColor|PointSize|Opacity|Body|Pulse|head\[|limb\[/);
      expect(Math.max(...equation.split('\n').map((line) => line.length))).toBeLessThan(132);
    }
  });
});
