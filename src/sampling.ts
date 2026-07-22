export const MAX_POINTS = 40_000;

export function createPointIndices(requestedPointCount: number): Float32Array {
  const pointCount = Math.max(1, Math.min(Math.floor(requestedPointCount), MAX_POINTS));
  const indices = new Float32Array(pointCount);

  for (let index = 0; index < pointCount; index += 1) {
    indices[index] = index;
  }

  return indices;
}
