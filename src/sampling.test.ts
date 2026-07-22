import { describe, expect, it } from 'vitest';
import { createPointIndices, MAX_POINTS } from './sampling';

describe('point sampling', () => {
  it('creates stable GPU vertex indices for shader-side domain sampling', () => {
    const indices = createPointIndices(6_000);

    expect(indices).toHaveLength(6_000);
    expect(indices[0]).toBe(0);
    expect(indices.at(-1)).toBe(5_999);
    expect(indices[3_000]).toBe(3_000);
  });

  it('supports the largest 40,000-point source and clamps unsafe counts', () => {
    expect(createPointIndices(0)).toHaveLength(1);
    expect(createPointIndices(MAX_POINTS + 1)).toHaveLength(MAX_POINTS);
  });
});
