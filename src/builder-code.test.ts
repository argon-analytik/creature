import { describe, expect, it } from 'vitest';
import {
  IDENTITY_CUSTOM_MORPH,
  evaluateCustomMorph,
  formatEditableWebGL,
  formatP5CustomMorph,
  formatWebGLInjection,
  formatWolframCustomMorph,
  generateBuilderCodeSources,
  parseEditableWebGL,
} from './builder-code';
import {
  DEFAULT_MORPH,
  EQUATION_FAMILY_NAMES,
  generateCreature,
  type BuilderPalette,
} from './builder-model';

const palette: BuilderPalette = { body: '#ccddee', pulse: '#ff6600' };
const specimen = generateCreature(0x51c0ffee, 4);

function withCustomBody(source: string, body: readonly string[]): string {
  return source.replace(
    '  return vec2(x, y);',
    `${body.map((line) => `  ${line}`).join('\n')}\n  return vec2(x, y);`,
  );
}

describe('builder code views', () => {
  it('round-trips the generated editable source without losing state', () => {
    const source = formatEditableWebGL(DEFAULT_MORPH, palette);
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.morph).toEqual(DEFAULT_MORPH);
    expect(result.state.palette).toEqual(palette);
    expect(result.state.customMorph).toEqual(IDENTITY_CUSTOM_MORPH);
    expect(result.sources.webgl).toBe(source);
    expect(result.sources.wolfram).toContain('(* Editable custom morph *)');
    expect(result.sources.p5js).toContain('function setup()');
    expect(result.sources.p5js).toContain('function draw()');
  });

  it('synchronises edited constants, colours and custom maths across all three views', () => {
    let source = formatEditableWebGL(DEFAULT_MORPH, palette)
      .replace('const float MORPH_REACH = 1.0;', 'const float MORPH_REACH = 1.27;')
      .replace(/const vec3 BODY_COLOR = .*;/, 'const vec3 BODY_COLOR = vec3(1.0, 0.5019608, 0.0);')
      .replace(/const vec3 PULSE_COLOR = .*;/, 'const vec3 PULSE_COLOR = vec3(0.0, 0.6666667, 1.0);');
    source = withCustomBody(source, [
      'x = x + 0.18 * sin(6.283185 * u + time);',
      'y = y - 0.07 * cos(abs(x) + sqrt(y * y));',
    ]);

    const result = parseEditableWebGL(source, specimen.genome);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.morph.reach).toBe(1.27);
    expect(result.state.palette).toEqual({ body: '#ff8000', pulse: '#00aaff' });
    expect(result.state.customMorph.assignments).toHaveLength(2);
    expect(result.sources.webglInjection).toContain('sqrt(abs(');
    expect(result.sources.webglInjection).toContain('isnan(result)');
    expect(result.sources.p5js).toContain('Math.sin');
    expect(result.sources.p5js).toContain('Math.sqrt(Math.abs(');
    expect(result.sources.p5js).toContain('const BODY_COLOR = [255,128,0];');
    expect(result.sources.wolfram).toContain('Sin[');
    expect(result.sources.wolfram).toContain('Sqrt[Abs[');
    expect(result.sources.wolfram).not.toMatch(/\btime\b/);
    expect(result.sources.wolfram).not.toMatch(/BODY_COLOR|PULSE_COLOR|PointSize|RGBColor/);
  });

  it('normalises division and square roots before shader injection', () => {
    const source = withCustomBody(formatEditableWebGL(DEFAULT_MORPH, palette), [
      'x = x / (abs(y) + 0.000001);',
      'y = sqrt(x - time);',
    ]);
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sources.webglInjection).toContain('safeMorphDiv(');
    expect(result.sources.webglInjection).toContain('sqrt(abs(');
    expect(result.sources.webglInjection).toContain('softenMorphCoordinate(');
    expect(result.sources.p5js).toContain('safeMorphDiv(');
    expect(result.sources.wolfram).toContain('SafeDiv[');
  });

  it('rejects unsupported GLSL with an exact source location', () => {
    const base = formatEditableWebGL(DEFAULT_MORPH, palette);
    const source = withCustomBody(base, ['x = x + tan(time);']);
    const expectedLine = source.split('\n').findIndex((line) => line.includes('tan(time)')) + 1;
    const expectedColumn = source.split('\n')[expectedLine - 1].indexOf('tan') + 1;
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toEqual([{
      line: expectedLine,
      column: expectedColumn,
      message: 'Unsupported identifier tan.',
    }]);
  });

  it('rejects statements outside the bounded x/y assignment language', () => {
    const source = withCustomBody(formatEditableWebGL(DEFAULT_MORPH, palette), [
      'float z = x;',
    ]);
    const expectedLine = source.split('\n').findIndex((line) => line.includes('float z')) + 1;
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0].line).toBe(expectedLine);
    expect(result.diagnostics[0].column).toBe(3);
    expect(result.diagnostics[0].message).toContain('Only x/y assignments');
  });

  it('reports out-of-range morph and colour constants instead of clamping silently', () => {
    const source = formatEditableWebGL(DEFAULT_MORPH, palette)
      .replace('const float MORPH_SCALE = 1.0;', 'const float MORPH_SCALE = 12.0;')
      .replace(/const vec3 PULSE_COLOR = .*;/, 'const vec3 PULSE_COLOR = vec3(0.0, 1.2, 0.0);');
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map(({ message }) => message)).toEqual([
      'MORPH_SCALE must be between 0.78 and 1.18.',
      'PULSE_COLOR components must be between 0 and 1.',
    ]);
    expect(result.diagnostics.every(({ line, column }) => line > 0 && column > 0)).toBe(true);
  });

  it('requires the complete fixed constant surface and rejects invented constants', () => {
    const source = formatEditableWebGL(DEFAULT_MORPH, palette)
      .replace('const float MORPH_FOLD = 1.0;\n', '')
      .replace(
        'const float MORPH_REACH = 1.0;',
        'const float MORPH_REACH = 1.0;\nconst float SECRET_NOISE = 0.5;',
      );
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map(({ message }) => message)).toEqual([
      'Unsupported constant SECRET_NOISE.',
      'Missing constant MORPH_FOLD.',
    ]);
  });

  it('limits custom program size before it can reach the shader compiler', () => {
    const assignments = Array.from({ length: 13 }, (_, index) => (
      `x = x + ${index + 1}.0 * 0.0001;`
    ));
    const source = withCustomBody(formatEditableWebGL(DEFAULT_MORPH, palette), assignments);
    const result = parseEditableWebGL(source, specimen.genome);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0].message).toBe('customMorph supports at most 12 assignments.');
  });

  it('generates copy-ready selected-family p5 sketches for every topology', () => {
    for (let family = 0; family < EQUATION_FAMILY_NAMES.length; family += 1) {
      const generated = generateCreature(71_000 + family, family);
      const sources = generateBuilderCodeSources(generated.genome, DEFAULT_MORPH, palette);
      expect(sources.p5js).toContain(`const FAMILY = ${family};`);
      expect(sources.p5js).toContain(`const SOURCE_POINTS = ${generated.genome.sourcePointCount};`);
      expect(sources.p5js).toContain('const raw = basePoint(index, time);');
      expect(sources.p5js).toContain('const custom = customMorph(developed, u, time);');
      expect(sources.webgl).toContain('vec2 customMorph(vec2 point, float u, float time)');
      expect(sources.webglInjection).not.toContain('eval');
    }
  });

  it('exports the continuous phase-flow development without a hard split gate', () => {
    const generated = generateCreature(72_002, 2, undefined, undefined, 2);
    const sources = generateBuilderCodeSources(generated.genome, DEFAULT_MORPH, palette);

    expect(sources.p5js).toContain('0.65 * y + 0.35 * x');
    expect(sources.p5js).toContain('0.55 * x - 0.45 * y');
    expect(sources.p5js).not.toContain('Math.tanh');
    expect(sources.wolfram).toContain('0.65 y + 0.35 x');
    expect(sources.wolfram).toContain('0.55 x - 0.45 y');
    expect(sources.wolfram).not.toContain('Tanh');
  });

  it('exports the bilateral lens with a smooth centre instead of a sign seam', () => {
    const generated = generateCreature(72_001, 2, undefined, undefined, 1);
    const sources = generateBuilderCodeSources(generated.genome, DEFAULT_MORPH, palette);

    expect(sources.p5js).toContain('x / Math.sqrt(x * x + 0.04)');
    expect(sources.p5js).not.toContain('Math.sign');
    expect(sources.wolfram).toContain('x1/Sqrt[x1^2 + 0.04]');
    expect(sources.wolfram).not.toContain('Sign[x1]');
  });

  it('exports standalone custom appendices for direct integration', () => {
    expect(formatWebGLInjection(IDENTITY_CUSTOM_MORPH)).toContain('vec2 customMorph');
    expect(formatP5CustomMorph(IDENTITY_CUSTOM_MORPH)).toContain('function customMorph');
    expect(formatWolframCustomMorph(IDENTITY_CUSTOM_MORPH)).toContain('{x, y} = P;');
  });

  it('evaluates the same finite-safe custom program for CPU auto framing', () => {
    const source = withCustomBody(formatEditableWebGL(DEFAULT_MORPH, palette), [
      'x = x + 0.25 * sin(time);',
      'y = y / (abs(x) + 0.000001);',
    ]);
    const result = parseEditableWebGL(source, specimen.genome);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const point = evaluateCustomMorph(result.state.customMorph, { x: 0.5, y: 0.2 }, 0.4, Math.PI / 2);
    expect(point.x).toBeCloseTo(0.75, 7);
    expect(point.y).toBeCloseTo(0.2 / 0.75, 6);
  });

  it('softens extreme custom coordinates without flattening them against a wall', () => {
    const near = evaluateCustomMorph(IDENTITY_CUSTOM_MORPH, { x: 2, y: -2 }, 0, 0);
    const far = evaluateCustomMorph(IDENTITY_CUSTOM_MORPH, { x: 12, y: -12 }, 0, 0);
    const webgl = formatWebGLInjection(IDENTITY_CUSTOM_MORPH);
    const p5js = formatP5CustomMorph(IDENTITY_CUSTOM_MORPH);
    const wolfram = formatWolframCustomMorph(IDENTITY_CUSTOM_MORPH);

    expect(far.x).toBeGreaterThan(near.x);
    expect(far.y).toBeLessThan(near.y);
    expect(webgl).not.toContain('return clamp(result');
    expect(p5js).not.toContain('constrain(x');
    expect(wolfram).not.toContain('P = Clip[');
  });
});
