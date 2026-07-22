import {
  evaluateGenomePointBeforeScale,
  type CreatureGenome,
  type MorphState,
} from './builder-model';
import { evaluateCustomMorph, type CustomMorphProgram } from './builder-code';

export interface LocomotionProfile {
  readonly forward: readonly [number, number];
  readonly confidence: number;
  readonly cadence: number;
  readonly speed: number;
  readonly curvature: number;
}

export interface ScreenSaverPose {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly scale: number;
  readonly tangent: readonly [number, number];
}

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalize(x: number, y: number): readonly [number, number] {
  const length = Math.hypot(x, y);
  return length > 0.000001 ? [x / length, y / length] : [1, 0];
}

function quantile(values: readonly number[], amount: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = clamp(amount, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] * (1 - (position - lower)) + sorted[upper] * (position - lower);
}

function pseudoRandom(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Finds a stable, source-axis preserving local forward direction. The sign is
 * inferred from the more compact endpoint when geometry is decisive, with a
 * topology-derived fallback for symmetrical forms.
 */
export function deriveLocomotionProfile(
  genome: CreatureGenome,
  morph: MorphState,
  customMorph: CustomMorphProgram,
): LocomotionProfile {
  const count = Math.min(640, Math.max(192, Math.round(genome.sourcePointCount / 26)));
  const points: Array<readonly [number, number]> = [];
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = Math.min(
      genome.sourcePointCount - 1,
      Math.floor(pseudoRandom(genome.seed, index) * genome.sourcePointCount),
    );
    const point = evaluateGenomePointBeforeScale(genome, sourceIndex, 1.73, morph);
    const transformed = evaluateCustomMorph(
      customMorph,
      point,
      sourceIndex / Math.max(1, genome.sourcePointCount - 1),
      1.73,
    );
    if (Number.isFinite(transformed.x) && Number.isFinite(transformed.y)) {
      points.push([transformed.x * morph.scale, transformed.y * morph.scale]);
    }
  }

  if (points.length < 24) {
    return { forward: [1, 0], confidence: 0, cadence: 1, speed: 0.05, curvature: 0.08 };
  }

  const meanX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const point of points) {
    const dx = point[0] - meanX;
    const dy = point[1] - meanY;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const axis = normalize(Math.cos(angle), Math.sin(angle));
  const normal: readonly [number, number] = [-axis[1], axis[0]];
  const projections = points.map((point) => (
    (point[0] - meanX) * axis[0] + (point[1] - meanY) * axis[1]
  ));
  const low = quantile(projections, 0.18);
  const high = quantile(projections, 0.82);
  const lowSide = points.filter((_, index) => projections[index] <= low);
  const highSide = points.filter((_, index) => projections[index] >= high);
  const transverseSpread = (side: readonly (readonly [number, number])[]) => {
    if (side.length === 0) return 0;
    const values = side.map((point) => Math.abs((point[0] - meanX) * normal[0] + (point[1] - meanY) * normal[1]));
    return quantile(values, 0.72);
  };
  const lowSpread = transverseSpread(lowSide);
  const highSpread = transverseSpread(highSide);
  const totalSpread = Math.max(0.0001, lowSpread + highSpread);
  const geometryBias = (highSpread - lowSpread) / totalSpread;
  const topologySign = (genome.family + genome.modules.reduce((sum, value) => sum + value, 0) + genome.development[0]) % 2 === 0
    ? 1
    : -1;
  // The more compact endpoint reads as the leading end. Symmetric forms retain
  // a deterministic topology direction so repeated exports do not flip.
  const sign = Math.abs(geometryBias) >= 0.12 ? (geometryBias > 0 ? -1 : 1) : topologySign;
  const forward = normalize(axis[0] * sign, axis[1] * sign);
  const elongation = Math.abs(xx - yy) / Math.max(0.0001, xx + yy);
  const confidence = clamp(0.32 + Math.abs(geometryBias) * 0.42 + elongation * 0.26, 0, 1);
  const cadence = clamp(0.78 + morph.motion * 0.56 + (genome.development[2] % 3) * 0.09, 0.72, 1.72);
  const speed = clamp(0.028 + morph.motion * 0.022 + morph.pulse * 0.004, 0.035, 0.075);
  const curvature = clamp(0.045 + Math.abs(morph.gesture) * 0.06 + genome.development[1] * 0.3, 0.045, 0.14);
  return { forward, confidence, cadence, speed, curvature };
}

function cubicPoint(
  progress: number,
  start: readonly [number, number],
  controlA: readonly [number, number],
  controlB: readonly [number, number],
  end: readonly [number, number],
): readonly [number, number] {
  const inverse = 1 - progress;
  return [
    inverse ** 3 * start[0] + 3 * inverse ** 2 * progress * controlA[0] + 3 * inverse * progress ** 2 * controlB[0] + progress ** 3 * end[0],
    inverse ** 3 * start[1] + 3 * inverse ** 2 * progress * controlA[1] + 3 * inverse * progress ** 2 * controlB[1] + progress ** 3 * end[1],
  ];
}

function cubicTangent(
  progress: number,
  start: readonly [number, number],
  controlA: readonly [number, number],
  controlB: readonly [number, number],
  end: readonly [number, number],
): readonly [number, number] {
  const inverse = 1 - progress;
  return normalize(
    3 * inverse ** 2 * (controlA[0] - start[0])
      + 6 * inverse * progress * (controlB[0] - controlA[0])
      + 3 * progress ** 2 * (end[0] - controlB[0]),
    3 * inverse ** 2 * (controlA[1] - start[1])
      + 6 * inverse * progress * (controlB[1] - controlA[1])
      + 3 * progress ** 2 * (end[1] - controlB[1]),
  );
}

/**
 * Crosses the display once, turns only beyond its edges, then starts a new
 * current. A caller may reverse the inferred polarity without mutating the
 * specimen itself.
 */
export function sampleScreenSaverPose(
  profile: LocomotionProfile,
  seconds: number,
  aspectRatio: number,
  scale: number,
  reverse = false,
): ScreenSaverPose {
  const duration = 1 / Math.max(0.0001, profile.speed);
  const cycle = seconds / duration;
  const wholeCycles = Math.floor(cycle);
  const rawProgress = cycle - wholeCycles;
  const phase = ((wholeCycles * 0.61803398875) % 1) * TAU;
  // This is an integral of a positive velocity modulation: progress remains
  // monotonic while the deformation cadence gently changes the forward speed.
  const progress = clamp(
    rawProgress + 0.055 * (Math.sin(TAU * rawProgress * profile.cadence + phase) - Math.sin(phase)) / TAU,
    0,
    1,
  );
  const drift = Math.sin(phase * 1.7) * profile.curvature;
  const start: readonly [number, number] = [-0.28, 0.5 - drift * 0.7];
  const controlA: readonly [number, number] = [0.22, 0.5 + drift];
  const controlB: readonly [number, number] = [0.78, 0.5 - drift * 0.72];
  const end: readonly [number, number] = [1.28, 0.5 + drift * 0.46];
  const [x, y] = cubicPoint(progress, start, controlA, controlB, end);
  const tangent = cubicTangent(progress, start, controlA, controlB, end);
  const localAngle = Math.atan2(profile.forward[1], profile.forward[0]) + (reverse ? Math.PI : 0);
  // The shader's local mathematical y-axis is inverted when it is mapped to
  // canvas pixels. Convert the screen-space travel tangent back into that
  // coordinate system before rotating the specimen. This keeps its inferred
  // leading end on the current instead of merely translating an unrotated form.
  const screenAngle = Math.atan2(tangent[1] * Math.max(0.1, aspectRatio), tangent[0]);
  return {
    x,
    y,
    angle: -screenAngle - localAngle,
    scale,
    tangent,
  };
}
