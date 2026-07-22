import { describe, expect, it } from 'vitest';
import { vertexShaderSource } from './shaders';

describe('creature shader orientation', () => {
  it('keeps every supplied equation in its original coordinate orientation', () => {
    expect(vertexShaderSource).not.toContain('mat2 rotation');
    expect(vertexShaderSource).toContain('uPose.xy*uViewport+local*pixelScale');
  });

  it('does not retain the three user-removed shader variants', () => {
    expect(vertexShaderSource).not.toMatch(/uVariant == (14|18|19)\b/);
  });

  it('colours only the nineteenth creature outside classification', () => {
    expect(vertexShaderSource).toContain('uVariant == 21');
    expect(vertexShaderSource).toContain('outside=step(15.0,edgeK*edgeK)');
    expect(vertexShaderSource).toContain('pulse=outside*colourPhase*colourPhase');
  });
});
