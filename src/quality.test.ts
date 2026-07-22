import { describe, expect, it } from 'vitest';
import { selectRenderProfile } from './quality';

describe('selectRenderProfile', () => {
  it('keeps the complete museum catalogue at full point density on desktop', () => {
    expect(
      selectRenderProfile({
        width: 1440,
        height: 900,
        hardwareConcurrency: 12,
      }),
    ).toEqual({
      creatureCount: 19,
      pointDensity: 1,
      maxDevicePixelRatio: 2,
      name: 'full',
    });
  });

  it('keeps every exhibit selectable while reducing point density on a small device', () => {
    expect(
      selectRenderProfile({
        width: 390,
        height: 844,
        hardwareConcurrency: 4,
      }),
    ).toMatchObject({
      creatureCount: 19,
      pointDensity: 0.55,
      maxDevicePixelRatio: 1.5,
      name: 'compact',
    });
  });
});
