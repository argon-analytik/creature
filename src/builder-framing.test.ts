import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MORPH,
  evaluateGenomePoint,
  generateCreature,
  normalizeMorph,
} from './builder-model';
import {
  applyBuilderFrame,
  interpolateBuilderFrame,
  measureBuilderFrame,
  measurePointFrame,
} from './builder-framing';

describe('Morphospace auto framing', () => {
  it('centres a cloud with a uniform axis-preserving transform', () => {
    const points = Array.from({ length: 401 }, (_, index) => ({
      x: 11 + (index % 41) / 10,
      y: -7 + Math.floor(index / 41) / 5,
    }));
    const frame = measurePointFrame(points, { trimQuantile: 0, fitSpan: 1 });
    const transformed = points.map((point) => applyBuilderFrame(point, frame));
    const minimumX = Math.min(...transformed.map((point) => point.x));
    const maximumX = Math.max(...transformed.map((point) => point.x));
    const minimumY = Math.min(...transformed.map((point) => point.y));
    const maximumY = Math.max(...transformed.map((point) => point.y));

    expect((minimumX + maximumX) / 2).toBeCloseTo(0, 10);
    expect((minimumY + maximumY) / 2).toBeCloseTo(0, 10);
    expect(Math.max(maximumX - minimumX, maximumY - minimumY)).toBeCloseTo(1, 10);
    expect(frame.scale).toBeGreaterThan(0);
  });

  it('ignores isolated singular outliers instead of shrinking the form', () => {
    const body = Array.from({ length: 500 }, (_, index) => ({
      x: 4 + Math.sin(index * 0.17),
      y: -3 + 0.6 * Math.cos(index * 0.11),
    }));
    const frame = measurePointFrame([
      ...body,
      { x: -90_000, y: 120_000 },
      { x: 75_000, y: -80_000 },
    ]);

    expect(frame.centerX).toBeCloseTo(4, 1);
    expect(frame.centerY).toBeCloseTo(-3, 1);
    expect(frame.width).toBeLessThan(2.1);
    expect(frame.height).toBeLessThan(1.3);
    expect(frame.scale).toBeGreaterThan(0.4);
  });

  it('measures every topology deterministically at edited morph extremes', () => {
    const morph = normalizeMorph({
      scale: 1.18,
      reach: 1.42,
      fold: 1.31,
      mutation: 1.65,
      gesture: -0.9,
      polarity: 0.45,
      phase: 2.8,
      motion: 1.6,
    });

    for (let family = 0; family < 7; family += 1) {
      const genome = generateCreature(81_000 + family, family).genome;
      const first = measureBuilderFrame(genome, morph, 4.2);
      const repeated = measureBuilderFrame(genome, morph, 4.2);

      expect(repeated).toEqual(first);
      expect(first.sampleCount).toBe(960);
      expect(first.finiteRatio).toBeGreaterThan(0.99);
      expect(Number.isFinite(first.centerX)).toBe(true);
      expect(Number.isFinite(first.centerY)).toBe(true);
      expect(first.scale).toBeGreaterThan(0);
      expect(Math.max(first.width, first.height) * first.scale).toBeLessThanOrEqual(1.06 + 1e-8);
    }
  });

  it('keeps dense Secant Fan ground truth inside the shader viewport', () => {
    const genome = generateCreature(25_602, 6).genome;
    const time = 9;
    const frame = measureBuilderFrame(genome, DEFAULT_MORPH, time);
    const transformed = Array.from({ length: genome.sourcePointCount }, (_, index) => (
      applyBuilderFrame(evaluateGenomePoint(genome, index, time, DEFAULT_MORPH), frame)
    ));
    const sortedAbsoluteXs = transformed.map(({ x }) => Math.abs(x)).sort((a, b) => a - b);
    const sortedAbsoluteYs = transformed.map(({ y }) => Math.abs(y)).sort((a, b) => a - b);
    const quantile = (sorted: readonly number[], amount: number): number => {
      const position = amount * (sorted.length - 1);
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      const fraction = position - lower;
      return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
    };
    const denseCloudExtent = Math.max(
      quantile(sortedAbsoluteXs, 0.994),
      quantile(sortedAbsoluteYs, 0.994),
    );
    // The vertex shader maps local coordinates with min(viewport) * 0.72,
    // leaving this axis-aligned half-span visible on a square canvas.
    const shaderVisibleExtent = 0.5 / 0.72;

    expect(denseCloudExtent).toBeLessThanOrEqual(shaderVisibleExtent);
  });

  it('clamps work and allows a single current-time phase', () => {
    const genome = generateCreature(420, 0).genome;
    const frame = measureBuilderFrame(genome, DEFAULT_MORPH, 1.5, {
      sampleCount: 12,
      timeOffsets: [0],
    });

    expect(frame.sampleCount).toBe(128);
    expect(frame.finiteRatio).toBe(1);
  });

  it('smooths translation and positive scale without introducing rotation data', () => {
    const start = measurePointFrame([{ x: -1, y: -1 }, { x: 1, y: 1 }]);
    const end = measurePointFrame([{ x: 8, y: -6 }, { x: 12, y: 2 }]);
    const halfway = interpolateBuilderFrame(start, end, 0.5);

    expect(halfway.centerX).toBeCloseTo((start.centerX + end.centerX) / 2, 10);
    expect(halfway.centerY).toBeCloseTo((start.centerY + end.centerY) / 2, 10);
    expect(halfway.scale).toBeCloseTo(Math.sqrt(start.scale * end.scale), 10);
    expect(Object.keys(halfway)).not.toContain('rotation');
  });

  it('includes a bounded editable post-transform in its centre measurement', () => {
    const genome = generateCreature(731, 3).genome;
    const base = measureBuilderFrame(genome, DEFAULT_MORPH, 2, { timeOffsets: [0] });
    const shifted = measureBuilderFrame(genome, DEFAULT_MORPH, 2, {
      timeOffsets: [0],
      pointTransform: (point) => ({ x: point.x + 0.6, y: point.y - 0.25 }),
    });
    expect(shifted.centerX - base.centerX).toBeCloseTo(0.6, 8);
    expect(shifted.centerY - base.centerY).toBeCloseTo(-0.25, 8);
    expect(shifted.scale).toBeCloseTo(base.scale, 8);
  });

  it('runs the editable transform before the final presence scale', () => {
    const genome = generateCreature(7_311, 3).genome;
    const morph = normalizeMorph({ scale: 1.18 });
    const base = measureBuilderFrame(genome, morph, 2, { timeOffsets: [0] });
    const shifted = measureBuilderFrame(genome, morph, 2, {
      timeOffsets: [0],
      pointTransform: (point) => ({ x: point.x + 0.25, y: point.y - 0.1 }),
    });

    expect(shifted.centerX - base.centerX).toBeCloseTo(0.25 * morph.scale, 8);
    expect(shifted.centerY - base.centerY).toBeCloseTo(-0.1 * morph.scale, 8);
  });
});
