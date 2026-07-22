import { describe, expect, it } from 'vitest';
import { EXHIBITS } from './catalog';
import {
  buildMuseumEquationShaderSource,
  buildP5Export,
  createMuseumTransfer,
  decodeMuseumTransfer,
  encodeMuseumTransfer,
} from './museum-transfer';

describe('museum to Morphospace transfer', () => {
  it('round-trips a versioned exhibit and its edited palette', () => {
    const transfer = createMuseumTransfer(EXHIBITS[4], {
      body: '#ABCDEF',
      pulse: '#123456',
    });

    expect(decodeMuseumTransfer(encodeMuseumTransfer(transfer))).toEqual({
      version: 1,
      kind: 'museum-exhibit',
      exhibitId: 4,
      variant: EXHIBITS[4].variant,
      pointCount: EXHIBITS[4].pointCount,
      palette: { body: '#abcdef', pulse: '#123456' },
    });
  });

  it('rejects malformed or unbounded transfer values', () => {
    expect(decodeMuseumTransfer('{"kind":"museum-exhibit"}')).toBeUndefined();
    expect(decodeMuseumTransfer(JSON.stringify({
      version: 1,
      kind: 'museum-exhibit',
      exhibitId: 0,
      variant: 0,
      pointCount: -10,
      palette: { body: 'red', pulse: '#ffffff' },
    }))).toBeUndefined();
  });

  it('adapts the exact museum equation core without museum page uniforms', () => {
    const source = buildMuseumEquationShaderSource();
    expect(source).toContain('vec2 evaluateMuseumCreature(int variant, float index, float t)');
    expect(source).toContain('float museumSourceTime(int variant, float elapsed, float phase)');
    expect(source).toContain('const float PI = 3.141592653589793;');
    expect(source).not.toContain('uVariant');
    expect(source).not.toContain('uMotion');
  });

  it('exports every exhibit as a compact p5.js sketch', () => {
    for (const exhibit of EXHIBITS) {
      const source = buildP5Export(exhibit, {
        body: exhibit.defaultBody,
        pulse: exhibit.defaultPulse,
      });
      expect(source).toContain('createCanvas');
      expect(source).toContain(`creature ${String(exhibit.id + 1).padStart(2, '0')}`);
      expect(source).toContain(`const CREATURE_BODY = '${exhibit.defaultBody.toLowerCase()}'`);
      expect(source).toContain(`const CREATURE_PULSE = '${exhibit.defaultPulse.toLowerCase()}'`);
      expect(source).toContain('plotCreaturePoint(');
      expect(() => new Function(source)).not.toThrow();
    }
  });
});
