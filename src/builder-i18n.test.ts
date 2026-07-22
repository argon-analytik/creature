import { afterEach, describe, expect, it, vi } from 'vitest';
import { MORPH_KEYS } from './builder-model';
import {
  BUILDER_LOCALES,
  BUILDER_TRANSLATIONS,
  getBuilderTranslation,
  isBuilderLocale,
  resolveBuilderLocale,
} from './builder-i18n';

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe('builder translations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides every supported builder locale with the invariant mode name', () => {
    expect(BUILDER_LOCALES).toEqual(['en', 'de', 'da', 'fr', 'it', 'ja', 'es']);
    expect(Object.keys(BUILDER_TRANSLATIONS)).toEqual(BUILDER_LOCALES);

    for (const locale of BUILDER_LOCALES) {
      const translation = BUILDER_TRANSLATIONS[locale];
      expect(translation.brandMode).toBe('MORPHOSPACE');
      expect(translation.intro.body.length).toBeGreaterThan(50);
      expect(translation.code.tabs.wolfram).toBe('Wolfram');
      expect(translation.code.tabs.p5js).toBe('p5.js');
      expect(translation.code.tabs.webgl).toContain('WebGL');
      expect(translation.development.transformations).toHaveLength(6);
      expect(translation.evolution.description.length).toBeGreaterThan(5);
      expect(collectStrings(translation).every((text) => text.trim().length > 0)).toBe(true);
    }
  });

  it('covers every adjustable morphology gene in every language', () => {
    const expectedKeys = [...MORPH_KEYS].sort();
    for (const translation of Object.values(BUILDER_TRANSLATIONS)) {
      expect(Object.keys(translation.controls).sort()).toEqual(expectedKeys);
      for (const control of Object.values(translation.controls)) {
        expect(control.label).not.toBe('');
        expect(control.description).toMatch(/[.!。]$/);
      }
    }
  });

  it('keeps the reset action compact in every language', () => {
    expect(BUILDER_LOCALES.map((locale) => BUILDER_TRANSLATIONS[locale].actions.reset)).toEqual([
      'Reset',
      'Zurücksetzen',
      'Nulstil',
      'Réinitialiser',
      'Ripristina',
      'リセット',
      'Restablecer',
    ]);
  });

  it('resolves exact and regional browser languages in preference order', () => {
    expect(resolveBuilderLocale(['de-CH'])).toBe('de');
    expect(resolveBuilderLocale(['pt-BR', 'fr-CH', 'en'])).toBe('fr');
    expect(resolveBuilderLocale(['JA-jp'])).toBe('ja');
    expect(resolveBuilderLocale(['es-MX'])).toBe('es');
  });

  it('falls back to English when no browser language is supported', () => {
    expect(resolveBuilderLocale([])).toBe('en');
    expect(resolveBuilderLocale(['pt-BR', 'nl-NL'])).toBe('en');
    expect(getBuilderTranslation(['xx'])).toBe(BUILDER_TRANSLATIONS.en);
  });

  it('auto-detects the browser language when none is passed', () => {
    vi.stubGlobal('navigator', { languages: ['it-CH', 'en-US'], language: 'it-CH' });
    expect(resolveBuilderLocale()).toBe('it');
    expect(getBuilderTranslation()).toBe(BUILDER_TRANSLATIONS.it);
  });

  it('uses Swiss orthography for the German copy', () => {
    const germanCopy = collectStrings(BUILDER_TRANSLATIONS.de).join(' ');
    expect(germanCopy).not.toContain('ß');
    expect(germanCopy).toContain('Gesamtgrösse');
    expect(germanCopy).toContain('einfliesst');
  });

  it('exposes typed locale and live status helpers', () => {
    expect(isBuilderLocale('da')).toBe(true);
    expect(isBuilderLocale('pt')).toBe(false);
    expect(BUILDER_TRANSLATIONS.en.specimen.genome('00c0ffee')).toBe('genome 00c0ffee');
    expect(BUILDER_TRANSLATIONS.fr.code.compileFailed('erreur')).toContain('erreur');
    expect(BUILDER_TRANSLATIONS.ja.fineTuning.geneCount(14)).toContain('14');
  });
});
