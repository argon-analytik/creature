import { EXHIBITS } from './catalog';

export type Rgba = [red: number, green: number, blue: number, alpha: number];

export interface SwimArea {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface Creature {
  readonly id: number;
  readonly variant: number;
  readonly pointCount: number;
  x: number;
  y: number;
  size: number;
  pathAngle: number;
  pathSpeed: number;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  opacity: number;
  targetCenterX: number;
  targetCenterY: number;
  targetSize: number;
  targetRadiusX: number;
  targetRadiusY: number;
  targetOpacity: number;
  phase: number;
  pulseOffset: number;
  pulseSpeed: number;
  pulseWidth: number;
  baseColor: Rgba;
  pulseColor: Rgba;
}

interface DisplaySlot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly opacity: number;
}

const TAU = Math.PI * 2;
const DISPLAY_SLOTS: readonly DisplaySlot[] = [
  { x: 0.49, y: 0.5, size: 0.325, radiusX: 0.064, radiusY: 0.068, opacity: 1 },
  { x: 0.13, y: 0.17, size: 0.082, radiusX: 0.055, radiusY: 0.044, opacity: 0.22 },
  { x: 0.87, y: 0.18, size: 0.075, radiusX: 0.047, radiusY: 0.05, opacity: 0.2 },
  { x: 0.11, y: 0.5, size: 0.072, radiusX: 0.05, radiusY: 0.06, opacity: 0.18 },
  { x: 0.89, y: 0.51, size: 0.068, radiusX: 0.045, radiusY: 0.058, opacity: 0.17 },
  { x: 0.17, y: 0.83, size: 0.078, radiusX: 0.052, radiusY: 0.045, opacity: 0.19 },
  { x: 0.84, y: 0.83, size: 0.073, radiusX: 0.05, radiusY: 0.044, opacity: 0.17 },
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function visibleIds(selectedId: number, count: number): readonly number[] {
  return [
    selectedId,
    wrapIndex(selectedId - 1, count),
    wrapIndex(selectedId + 1, count),
    wrapIndex(selectedId - 2, count),
    wrapIndex(selectedId + 2, count),
    wrapIndex(selectedId - 3, count),
    wrapIndex(selectedId + 3, count),
  ];
}

function slotInArea(slot: DisplaySlot, area: SwimArea) {
  const width = Math.max(0.01, area.maxX - area.minX);
  const height = Math.max(0.01, area.maxY - area.minY);

  return {
    centerX: area.minX + slot.x * width,
    centerY: area.minY + slot.y * height,
    size: slot.size,
    radiusX: slot.radiusX * width,
    radiusY: slot.radiusY * height,
    opacity: slot.opacity,
  };
}

function pathPosition(creature: Creature, angle: number): readonly [number, number] {
  const harmonic = creature.id * 1.73;

  return [
    creature.centerX +
      creature.radiusX * (Math.cos(angle) + 0.16 * Math.cos(2 * angle + harmonic)),
    creature.centerY +
      creature.radiusY * (Math.sin(angle) + 0.1 * Math.sin(3 * angle - harmonic)),
  ];
}

function updatePose(creature: Creature): void {
  const [x, y] = pathPosition(creature, creature.pathAngle);

  creature.x = x;
  creature.y = y;
}

export function hexToRgba(hex: string, alpha: number): Rgba {
  const normalized = /^#[\da-f]{6}$/i.test(hex) ? hex.slice(1) : 'ffffff';
  const value = Number.parseInt(normalized, 16);

  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    Math.max(0, Math.min(alpha, 1)),
  ];
}

export function createSchool(
  count = EXHIBITS.length,
  seed = 0xc0ffee,
  area: SwimArea = { minX: 0, maxX: 1, minY: 0, maxY: 1 },
): Creature[] {
  const safeCount = Math.max(1, Math.min(Math.floor(count), EXHIBITS.length));
  const random = mulberry32(seed);
  const school = EXHIBITS.slice(0, safeCount).map((exhibit): Creature => ({
    id: exhibit.id,
    variant: exhibit.variant,
    pointCount: exhibit.pointCount,
    x: 0.5,
    y: 0.5,
    size: 0.04,
    pathAngle: random() * TAU,
    pathSpeed: 0.044 + random() * 0.02,
    centerX: 0.5,
    centerY: 0.5,
    radiusX: 0.02,
    radiusY: 0.02,
    opacity: 0,
    targetCenterX: 0.5,
    targetCenterY: 0.5,
    targetSize: 0.04,
    targetRadiusX: 0.02,
    targetRadiusY: 0.02,
    targetOpacity: 0,
    phase: random() * TAU,
    pulseOffset: random(),
    pulseSpeed: 0.064 + random() * 0.022,
    pulseWidth: 0.052 + random() * 0.018,
    baseColor: hexToRgba(exhibit.defaultBody, 0.72),
    pulseColor: hexToRgba(exhibit.defaultPulse, 0.98),
  }));

  layoutSchool(school, 0, area, true);
  return school;
}

export function layoutSchool(
  creatures: Creature[],
  selectedId: number,
  area: SwimArea,
  immediate = false,
): void {
  const ids = visibleIds(selectedId, creatures.length);
  const assignments = new Map(ids.map((id, slotIndex) => [id, slotIndex]));

  for (const creature of creatures) {
    const slotIndex = assignments.get(creature.id);

    if (slotIndex === undefined) {
      creature.targetOpacity = 0;
      if (immediate) creature.opacity = 0;
      continue;
    }

    const target = slotInArea(DISPLAY_SLOTS[slotIndex], area);
    creature.targetCenterX = target.centerX;
    creature.targetCenterY = target.centerY;
    creature.targetSize = target.size;
    creature.targetRadiusX = target.radiusX;
    creature.targetRadiusY = target.radiusY;
    creature.targetOpacity = target.opacity;

    if (!immediate && creature.opacity >= 0.005) {
      continue;
    }

    creature.centerX = creature.targetCenterX;
    creature.centerY = creature.targetCenterY;
    creature.size = creature.targetSize;
    creature.radiusX = creature.targetRadiusX;
    creature.radiusY = creature.targetRadiusY;
    creature.opacity = immediate ? creature.targetOpacity : 0;
    updatePose(creature);
  }
}

export function setCreaturePalette(
  creatures: Creature[],
  id: number,
  bodyHex: string,
  pulseHex: string,
): void {
  const creature = creatures.find((candidate) => candidate.id === id);

  if (!creature) {
    return;
  }

  creature.baseColor = hexToRgba(bodyHex, 0.72);
  creature.pulseColor = hexToRgba(pulseHex, 0.98);
}

export function stepSchool(
  creatures: Creature[],
  deltaSeconds: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion) {
    return;
  }

  const delta = Math.max(0, Math.min(deltaSeconds, 0.05));
  const layoutBlend = 1 - Math.exp(-delta * 1.65);

  for (const creature of creatures) {
    creature.centerX += (creature.targetCenterX - creature.centerX) * layoutBlend;
    creature.centerY += (creature.targetCenterY - creature.centerY) * layoutBlend;
    creature.size += (creature.targetSize - creature.size) * layoutBlend;
    creature.radiusX += (creature.targetRadiusX - creature.radiusX) * layoutBlend;
    creature.radiusY += (creature.targetRadiusY - creature.radiusY) * layoutBlend;
    creature.opacity += (creature.targetOpacity - creature.opacity) * layoutBlend;
    creature.pathAngle = (creature.pathAngle + creature.pathSpeed * delta) % TAU;

    const [nextX, nextY] = pathPosition(creature, creature.pathAngle);
    creature.x = nextX;
    creature.y = nextY;

  }
}
