import type { Exhibit } from './catalog';
import { fragmentShaderSource, vertexShaderSource } from './shaders';

interface ExportPalette {
  readonly body: string;
  readonly pulse: string;
}

function hexToRgbUnit(hex: string): readonly [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    1,
  ];
}

export function buildWebGLExport(exhibit: Exhibit, palette: ExportPalette): string {
  const bodyColor = hexToRgbUnit(palette.body);
  const pulseColor = hexToRgbUnit(palette.pulse);

  return `// creature ${String(exhibit.id + 1).padStart(2, '0')} — WebGL 2 export
// https://creature.argio.ch/

export const creature = Object.freeze({
  variant: ${exhibit.variant},
  pointCount: ${exhibit.pointCount},
  bodyHex: '${palette.body.toLowerCase()}',
  pulseHex: '${palette.pulse.toLowerCase()}',
  bodyColor: [${bodyColor.map((channel) => channel.toFixed(6)).join(', ')}],
  pulseColor: [${pulseColor.map((channel) => channel.toFixed(6)).join(', ')}],
});

export const vertexShaderSource = ${JSON.stringify(vertexShaderSource)};

export const fragmentShaderSource = ${JSON.stringify(fragmentShaderSource)};
`;
}
