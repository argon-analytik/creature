import { describe, expect, it } from 'vitest';
import {
  createSchool,
  layoutSchool,
  setCreaturePalette,
  stepSchool,
} from './school';

describe('creature museum school', () => {
  it('is deterministic and contains the curated 19-exhibit catalogue', () => {
    expect(createSchool(19, 1234)).toEqual(createSchool(19, 1234));
    expect(createSchool().map((creature) => creature.variant)).toEqual(
      [...Array.from({ length: 14 }, (_, index) => index), 15, 16, 17, 20, 21],
    );
  });

  it('shows one focus exhibit plus six quiet neighbours', () => {
    const school = createSchool();

    expect(school.filter((creature) => creature.targetOpacity > 0)).toHaveLength(7);
    expect(school[0].targetOpacity).toBe(1);

    layoutSchool(school, 12, { minX: 0, maxX: 0.6, minY: 0, maxY: 1 }, true);

    expect(school[12].targetOpacity).toBe(1);
    expect(school[12].size).toBeCloseTo(0.325);
    expect(school.filter((creature) => creature.targetOpacity > 0)).toHaveLength(7);
  });

  it('freezes motion and applies selection immediately for reduced motion', () => {
    const school = createSchool();
    const before = structuredClone(school);

    stepSchool(school, 0.05, true);
    expect(school).toEqual(before);

    layoutSchool(school, 4, { minX: 0, maxX: 1, minY: 0, maxY: 1 }, true);
    expect(school[4].opacity).toBe(1);
    expect(school.filter((creature) => creature.opacity > 0)).toHaveLength(7);
  });

  it('moves subtly along the museum path without changing source orientation state', () => {
    const school = createSchool();
    const creature = school[0];
    const startX = creature.x;
    const startY = creature.y;

    stepSchool(school, 0.05, false);

    expect(Math.hypot(creature.x - startX, creature.y - startY)).toBeGreaterThan(0);
    expect('heading' in creature).toBe(false);
  });

  it('caps a delayed frame and keeps every numeric render value finite', () => {
    const expected = createSchool(19, 987);
    const delayed = createSchool(19, 987);

    stepSchool(expected, 0.05, false);
    stepSchool(delayed, 30, false);

    expect(delayed[0].x).toBeCloseTo(expected[0].x, 10);
    expect(delayed[0].y).toBeCloseTo(expected[0].y, 10);
    expect(
      delayed.every((creature) =>
        Object.values(creature)
          .filter((value) => typeof value === 'number')
          .every(Number.isFinite),
      ),
    ).toBe(true);
  });

  it('changes only the requested exhibit palette', () => {
    const school = createSchool();
    const untouched = structuredClone(school[1]);

    setCreaturePalette(school, 0, '#123456', '#abcdef');

    expect(school[0].baseColor.slice(0, 3)).toEqual([
      0x12 / 255,
      0x34 / 255,
      0x56 / 255,
    ]);
    expect(school[0].pulseColor.slice(0, 3)).toEqual([
      0xab / 255,
      0xcd / 255,
      0xef / 255,
    ]);
    expect(school[1]).toEqual(untouched);
  });
});
