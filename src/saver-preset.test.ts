import { describe, expect, it } from 'vitest';
import { generateCreature } from './builder-model';
import { IDENTITY_CUSTOM_MORPH } from './builder-code';
import {
  createCreatureSaverPreset,
  parseCreatureSaverPreset,
  serializeCreatureSaverPreset,
} from './saver-preset';

describe('Creature saver preset', () => {
  const generated = generateCreature(0x5a7e1c9d);
  const input = {
    name: generated.name,
    genome: generated.genome,
    morph: {
      scale: 1,
      reach: 1,
      fold: 1,
      lobes: 1,
      tension: 1,
      mutation: 1,
      gesture: 0,
      resonance: 1,
      texture: 1,
      polarity: 0,
      phase: 0,
      motion: 1,
      pulse: 1,
      density: 16_000,
    },
    palette: { body: '#d4d4d0', pulse: '#54d7ff' },
    customMorph: IDENTITY_CUSTOM_MORPH,
  } as const;

  it('round-trips a bounded specimen without embedding arbitrary executable code', () => {
    const preset = createCreatureSaverPreset(input);
    const restored = parseCreatureSaverPreset(serializeCreatureSaverPreset(preset));

    expect(restored).toEqual(preset);
    expect(serializeCreatureSaverPreset(preset)).not.toContain('vertexShaderSource');
    expect(restored?.locomotion.confidence).toBeGreaterThanOrEqual(0);
  });

  it('rejects tampered data rather than accepting a different genome under the same id', () => {
    const preset = createCreatureSaverPreset(input);
    const tampered = JSON.parse(serializeCreatureSaverPreset(preset)) as { specimen: { palette: { pulse: string } } };
    tampered.specimen.palette.pulse = '#ff0000';

    expect(parseCreatureSaverPreset(JSON.stringify(tampered))).toBeUndefined();
  });

  it('rejects executable-looking custom payloads instead of treating them as a transform', () => {
    const preset = createCreatureSaverPreset(input);
    const tampered = JSON.parse(serializeCreatureSaverPreset(preset)) as {
      specimen: { customMorph: unknown };
    };
    tampered.specimen.customMorph = {
      assignments: [{ target: 'x', expression: { kind: 'javascript', source: 'alert(1)' } }],
    };

    expect(parseCreatureSaverPreset(JSON.stringify(tampered))).toBeUndefined();
  });
});
