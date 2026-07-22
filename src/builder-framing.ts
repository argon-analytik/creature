import {
  evaluateGenomePointBeforeScale,
  type CreatureGenome,
  type EvaluatedPoint,
  type MorphState,
} from './builder-model';

/**
 * A translation and uniform scale in the creature's existing coordinate system.
 * Applying the frame never rotates, mirrors, or independently stretches an axis.
 */
export interface BuilderFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly sampleCount: number;
  readonly finiteRatio: number;
}

export interface PointFrameOptions {
  /** Fraction discarded at each side of both axes. */
  readonly trimQuantile?: number;
  /** Desired size of the longest robust axis after applying the frame. */
  readonly fitSpan?: number;
  /** Avoids an excessive zoom when a cloud temporarily collapses. */
  readonly minimumSpan?: number;
}

export interface BuilderFrameOptions extends PointFrameOptions {
  /** Total CPU samples across all temporal offsets. Clamped to 128...1,024. */
  readonly sampleCount?: number;
  /**
   * Nearby animation phases included in the measurement. The default looks a
   * little ahead so an intermittently refreshed frame does not trail motion.
   */
  readonly timeOffsets?: readonly number[];
  /**
   * Optional finite-safe post-development transform for the editable customMorph
   * program. It runs before `morph.scale`, matching the WebGL and p5.js order.
   */
  readonly pointTransform?: (
    point: EvaluatedPoint,
    index01: number,
    time: number,
  ) => EvaluatedPoint;
}

const DEFAULT_SAMPLE_COUNT = 960;
const DEFAULT_TRIM_QUANTILE = 0.006;
const DEFAULT_FIT_SPAN = 1.06;
const DEFAULT_MINIMUM_SPAN = 0.08;
const DEFAULT_TIME_OFFSETS = [-0.08, 0, 0.22] as const;
// The square stage exposes roughly +/-0.694 in equation coordinates. Keep a
// little headroom for interpolation and point radius around the sampled cloud.
const GUARDED_HALF_SPAN = 0.65;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function quantile(sorted: readonly number[], amount: number): number {
  if (sorted.length === 0) return 0;
  const position = clamp(amount, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

function normalizedPointOptions(options: PointFrameOptions): Required<PointFrameOptions> {
  return {
    trimQuantile: clamp(options.trimQuantile ?? DEFAULT_TRIM_QUANTILE, 0, 0.2),
    fitSpan: clamp(options.fitSpan ?? DEFAULT_FIT_SPAN, 0.25, 2),
    minimumSpan: clamp(options.minimumSpan ?? DEFAULT_MINIMUM_SPAN, 0.0001, 2),
  };
}

/**
 * Measures robust axis-aligned bounds for an already evaluated point cloud.
 * A small quantile trim prevents a singular point from shrinking the creature.
 */
export function measurePointFrame(
  points: readonly EvaluatedPoint[],
  options: PointFrameOptions = {},
): BuilderFrame {
  const normalized = normalizedPointOptions(options);
  const finitePoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (finitePoints.length === 0) {
    return {
      centerX: 0,
      centerY: 0,
      scale: 1,
      width: 0,
      height: 0,
      sampleCount: 0,
      finiteRatio: 0,
    };
  }

  const xs = finitePoints.map((point) => point.x).sort((left, right) => left - right);
  const ys = finitePoints.map((point) => point.y).sort((left, right) => left - right);
  const minimumX = quantile(xs, normalized.trimQuantile);
  const maximumX = quantile(xs, 1 - normalized.trimQuantile);
  const minimumY = quantile(ys, normalized.trimQuantile);
  const maximumY = quantile(ys, 1 - normalized.trimQuantile);
  const width = Math.max(0, maximumX - minimumX);
  const height = Math.max(0, maximumY - minimumY);
  const longestSpan = Math.max(normalized.minimumSpan, width, height);
  const centerX = (minimumX + maximumX) / 2;
  const centerY = (minimumY + maximumY) / 2;
  const robustScale = normalized.fitSpan / longestSpan;

  // Preserve the robust centre and primary fit, but also constrain scale by a
  // wider guard quantile. This catches legitimate thin appendages without
  // allowing one isolated singular sample to collapse the whole creature.
  const guardQuantile = Math.min(
    normalized.trimQuantile,
    Math.max(normalized.trimQuantile / 3, 1 / finitePoints.length),
  );
  const guardMinimumX = quantile(xs, guardQuantile);
  const guardMaximumX = quantile(xs, 1 - guardQuantile);
  const guardMinimumY = quantile(ys, guardQuantile);
  const guardMaximumY = quantile(ys, 1 - guardQuantile);
  const guardRadius = Math.max(
    normalized.minimumSpan / 2,
    Math.abs(guardMinimumX - centerX),
    Math.abs(guardMaximumX - centerX),
    Math.abs(guardMinimumY - centerY),
    Math.abs(guardMaximumY - centerY),
  );
  const scale = Math.min(robustScale, GUARDED_HALF_SPAN / guardRadius);

  return {
    centerX,
    centerY,
    scale,
    width,
    height,
    sampleCount: finitePoints.length,
    finiteRatio: finitePoints.length / points.length,
  };
}

function sampleJitter(seed: number, sample: number, frame: number): number {
  let value = (seed ^ Math.imul(sample + 1, 0x9e3779b9) ^ Math.imul(frame + 1, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

function radicalInverseBase2(value: number): number {
  let bits = value >>> 0;
  bits = ((bits << 16) | (bits >>> 16)) >>> 0;
  bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
  bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
  bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
  bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
  return bits / 4_294_967_296;
}

function sampledSourceIndex(
  genome: CreatureGenome,
  sample: number,
  samplesThisPhase: number,
  frame: number,
): number {
  // Families whose source is a flattened 2D lattice need both axes sampled
  // independently. A 1D stride can repeatedly hit the same modulo columns and
  // miss a narrow secant fan or appendage completely.
  if ([1, 3, 4, 5, 6].includes(genome.family)) {
    const columns = Math.max(1, Math.round(genome.parameters[0]));
    const rows = Math.max(1, Math.ceil(genome.sourcePointCount / columns));
    const phaseOffset = (genome.seed + Math.imul(frame + 1, 0x9e3779b9)) >>> 0;
    const column = (sample + phaseOffset) % columns;
    const rowSequence = radicalInverseBase2((sample + 1 + phaseOffset) >>> 0);
    const row = Math.min(rows - 1, Math.floor(rowSequence * rows));
    const gridIndex = row * columns + column;
    if (gridIndex < genome.sourcePointCount) return gridIndex;
  }

  const position = (sample + sampleJitter(genome.seed, sample, frame)) / samplesThisPhase;
  return Math.min(
    genome.sourcePointCount - 1,
    Math.max(0, Math.floor(position * genome.sourcePointCount)),
  );
}

/**
 * Samples the current generated equation at a small set of nearby animation
 * phases. Call this intermittently (for example every 180-250 ms), then smooth
 * `centerX`, `centerY`, and `scale` in the render loop. The returned transform
 * is axis-aligned: `(point - center) * scale`.
 */
export function measureBuilderFrame(
  genome: CreatureGenome,
  morph: MorphState,
  time: number,
  options: BuilderFrameOptions = {},
): BuilderFrame {
  const requestedSampleCount = Number.isFinite(options.sampleCount)
    ? Math.round(options.sampleCount ?? DEFAULT_SAMPLE_COUNT)
    : DEFAULT_SAMPLE_COUNT;
  const sampleCount = clamp(requestedSampleCount, 128, 1_024);
  const configuredOffsets = options.timeOffsets ?? DEFAULT_TIME_OFFSETS;
  const timeOffsets = configuredOffsets.filter(Number.isFinite);
  const phases = timeOffsets.length > 0 ? timeOffsets : [0];
  const points: EvaluatedPoint[] = [];
  const baseSamplesPerPhase = Math.floor(sampleCount / phases.length);
  let remainder = sampleCount % phases.length;

  for (let frame = 0; frame < phases.length; frame += 1) {
    const samplesThisPhase = baseSamplesPerPhase + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    for (let sample = 0; sample < samplesThisPhase; sample += 1) {
      const index = sampledSourceIndex(genome, sample, samplesThisPhase, frame);
      const frameTime = time + phases[frame];
      const developed = evaluateGenomePointBeforeScale(genome, index, frameTime, morph);
      const transformed = options.pointTransform
        ? options.pointTransform(
            developed,
            index / Math.max(1, genome.sourcePointCount - 1),
            frameTime,
          )
        : developed;
      points.push({
        x: transformed.x * morph.scale,
        y: transformed.y * morph.scale,
      });
    }
  }

  return measurePointFrame(points, options);
}

/** Applies a measured frame without changing the creature's source axes. */
export function applyBuilderFrame(point: EvaluatedPoint, frame: BuilderFrame): EvaluatedPoint {
  return {
    x: (point.x - frame.centerX) * frame.scale,
    y: (point.y - frame.centerY) * frame.scale,
  };
}

/**
 * Smooths a frame while keeping scale interpolation multiplicative. A renderer
 * can use a higher amount when `target.scale` is smaller to zoom out promptly.
 */
export function interpolateBuilderFrame(
  current: BuilderFrame,
  target: BuilderFrame,
  amount: number,
): BuilderFrame {
  const mix = clamp(amount, 0, 1);
  const safeCurrentScale = Math.max(0.000001, current.scale);
  const safeTargetScale = Math.max(0.000001, target.scale);
  return {
    centerX: current.centerX + (target.centerX - current.centerX) * mix,
    centerY: current.centerY + (target.centerY - current.centerY) * mix,
    scale: Math.exp(
      Math.log(safeCurrentScale) + (Math.log(safeTargetScale) - Math.log(safeCurrentScale)) * mix,
    ),
    width: current.width + (target.width - current.width) * mix,
    height: current.height + (target.height - current.height) * mix,
    sampleCount: target.sampleCount,
    finiteRatio: target.finiteRatio,
  };
}
