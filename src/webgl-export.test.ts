import { describe, expect, it } from 'vitest';
import { EXHIBITS } from './catalog';
import { buildWebGLExport } from './webgl-export';

describe('WebGL export', () => {
  it('includes the selected creature and customised palette', () => {
    const output = buildWebGLExport(EXHIBITS[18], { body: '#123456', pulse: '#abcdef' });

    expect(output).toContain('creature 19');
    expect(output).toContain('variant: 21');
    expect(output).toContain("bodyHex: '#123456'");
    expect(output).toContain("pulseHex: '#abcdef'");
    expect(output).toContain('bodyColor: [0.070588, 0.203922, 0.337255, 1.000000]');
    expect(output).toContain('export const vertexShaderSource');
    expect(output).toContain('export const fragmentShaderSource');
  });
});
