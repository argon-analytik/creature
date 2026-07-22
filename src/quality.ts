export interface RenderProfileInput {
  width: number;
  height: number;
  hardwareConcurrency: number;
}

export interface RenderProfile {
  creatureCount: number;
  pointDensity: number;
  maxDevicePixelRatio: number;
  name: 'compact' | 'balanced' | 'full';
}

export function selectRenderProfile(input: RenderProfileInput): RenderProfile {
  const shortestEdge = Math.min(input.width, input.height);
  const lowCoreDevice = input.hardwareConcurrency > 0 && input.hardwareConcurrency <= 4;

  if (shortestEdge < 640 || lowCoreDevice) {
    return {
      creatureCount: EXHIBITS.length,
      pointDensity: 0.55,
      maxDevicePixelRatio: 1.5,
      name: 'compact',
    };
  }

  if (shortestEdge < 820) {
    return {
      creatureCount: EXHIBITS.length,
      pointDensity: 0.75,
      maxDevicePixelRatio: 1.75,
      name: 'balanced',
    };
  }

  return {
    creatureCount: EXHIBITS.length,
    pointDensity: 1,
    maxDevicePixelRatio: 2,
    name: 'full',
  };
}
import { EXHIBITS } from './catalog';
