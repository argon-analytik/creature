import { describe, expect, it } from 'vitest';
import { resolveLocale, SUPPORTED_LOCALES, TRANSLATIONS } from './i18n';

describe('museum translations', () => {
  it('selects the first supported browser language and falls back to English', () => {
    expect(resolveLocale(['de-CH', 'fr-CH'])).toBe('de');
    expect(resolveLocale(['nb-NO', 'ja-JP'])).toBe('ja');
    expect(resolveLocale(['pt-BR'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });

  it('ships complete copy for all seven requested locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'de', 'da', 'fr', 'it', 'ja', 'es']);

    for (const locale of SUPPORTED_LOCALES) {
      const translation = TRANSLATIONS[locale];
      expect(translation.title.length).toBeGreaterThan(10);
      expect(translation.opening).toHaveLength(2);
      expect(translation.closing).toHaveLength(5);
      expect([...translation.opening, ...translation.closing].every((text) => text.length > 35)).toBe(true);
    }
  });

  it('uses Swiss typography in German, French, and Italian', () => {
    const german = JSON.stringify(TRANSLATIONS.de);
    expect(german).not.toContain('ß');
    expect(german).not.toContain('Geist');

    for (const locale of ['de', 'fr', 'it'] as const) {
      const copy = JSON.stringify(TRANSLATIONS[locale]);
      expect(copy).toContain('«');
      expect(copy).toContain('»');
    }
  });

  it('avoids literal mind metaphors in translated essays', () => {
    expect(JSON.stringify(TRANSLATIONS.da)).not.toContain('sindet');
    expect(JSON.stringify(TRANSLATIONS.fr)).not.toContain('l’esprit');
    expect(JSON.stringify(TRANSLATIONS.it)).not.toContain('la mente');
    expect(JSON.stringify(TRANSLATIONS.ja)).not.toContain('心');
    expect(JSON.stringify(TRANSLATIONS.es)).not.toContain('la mente');
  });
});
