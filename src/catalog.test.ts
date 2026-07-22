import { describe, expect, it } from 'vitest';
import { EXHIBITS, formatExhibitNumber } from './catalog';

describe('creature catalogue', () => {
  it('keeps all supplied formulas addressable with stable numbering', () => {
    expect(EXHIBITS).toHaveLength(19);
    expect(EXHIBITS.map((exhibit) => exhibit.id)).toEqual(
      Array.from({ length: 19 }, (_, index) => index),
    );
    expect(EXHIBITS.every((exhibit) => exhibit.code.length > 80)).toBe(true);
    expect(formatExhibitNumber(0)).toBe('01');
    expect(formatExhibitNumber(18)).toBe('19');
    expect(EXHIBITS.map((exhibit) => exhibit.variant)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 20, 21,
    ]);
  });

  it('preserves the original point-domain sizes', () => {
    expect(EXHIBITS[0].pointCount).toBe(10_000);
    expect(EXHIBITS[1].pointCount).toBe(8_200);
    expect(EXHIBITS[18].pointCount).toBe(10_000);
    expect(Math.max(...EXHIBITS.map((exhibit) => exhibit.pointCount))).toBe(40_000);
  });

  it('presents every exhibit as a compact Wolfram-style equation block', () => {
    for (const exhibit of EXHIBITS.slice(1)) {
      expect(exhibit.code).not.toMatch(/\b(?:draw|point|background|stroke)\b/i);
      expect(exhibit.code).toMatch(/(?:Sin|Cos|Tan|Sqrt|Abs)\[/);
      expect(Math.max(...exhibit.code.split('\n').map((line) => line.length))).toBeLessThan(72);
    }
  });

  it('keeps the nineteenth code block limited to its form equation', () => {
    expect(EXHIBITS[18].code).not.toMatch(/UnitStep|Pick|RGBColor|Blend/);
    expect(EXHIBITS[18].code).toContain('875. - q Sin[d - t] - 39 d');
    expect(EXHIBITS[18].defaultBody).toBe('#8ea3b8');
    expect(EXHIBITS[18].defaultPulse).toBe('#ffb52e');
  });
});
