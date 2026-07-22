import './style.css';
import { EXHIBITS, formatExhibitNumber } from './catalog';
import { resolveLocale, SUPPORTED_LOCALES, TRANSLATIONS, type Locale } from './i18n';
import {
  buildP5Export,
  createMuseumTransfer,
  encodeMuseumTransfer,
  MUSEUM_TRANSFER_KEY,
} from './museum-transfer';
import { selectRenderProfile } from './quality';
import { CreatureRenderer } from './renderer';
import {
  createSchool,
  layoutSchool,
  setCreaturePalette,
  stepSchool,
  type SwimArea,
} from './school';

interface Palette {
  body: string;
  pulse: string;
}

const PALETTE_STORAGE_KEY = 'creature-museum-palettes-v3';
const LOCALE_STORAGE_KEY = 'creature-locale-v1';
const HEX_COLOR = /^#[\da-f]{6}$/i;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error('Required element ' + selector + ' was not found.');
  return element;
}

function getSwimArea(): SwimArea {
  return window.matchMedia('(max-width: 900px)').matches
    ? { minX: 0.03, maxX: 0.97, minY: 0.05, maxY: 0.95 }
    : { minX: 0.015, maxX: 0.605, minY: 0.045, maxY: 0.955 };
}

function loadPalettes(): Palette[] {
  const defaults = EXHIBITS.map((exhibit) => ({
    body: exhibit.defaultBody,
    pulse: exhibit.defaultPulse,
  }));

  try {
    const saved = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) ?? 'null') as unknown;
    if (!Array.isArray(saved)) return defaults;

    return defaults.map((fallback, index) => {
      const candidate = saved[index] as Partial<Palette> | undefined;
      return {
        body: candidate && HEX_COLOR.test(candidate.body ?? '') ? candidate.body! : fallback.body,
        pulse:
          candidate && HEX_COLOR.test(candidate.pulse ?? '') ? candidate.pulse! : fallback.pulse,
      };
    });
  } catch {
    return defaults;
  }
}

function storePalettes(palettes: readonly Palette[]): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes));
  } catch {
    // Palette changes still work for the current visit when storage is unavailable.
  }
}

async function writeClipboardText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard access is unavailable.');
  }
}

const main = requireElement<HTMLElement>('main');
const canvas = requireElement<HTMLCanvasElement>('#creature-canvas');
const renderStatus = requireElement<HTMLParagraphElement>('#render-status');
const pageDescription = requireElement<HTMLMetaElement>('#page-description');
const experience = requireElement<HTMLElement>('#experience');
const mobileExperienceSlot = requireElement<HTMLElement>('#mobile-experience-slot');
const languagePicker = requireElement<HTMLElement>('#language-picker');
const languageButtons = Array.from(
  languagePicker.querySelectorAll<HTMLButtonElement>('button[data-locale]'),
);
const essayTitle = requireElement<HTMLHeadingElement>('#essay-title');
const essayOpening = [
  requireElement<HTMLParagraphElement>('#essay-opening-1'),
  requireElement<HTMLParagraphElement>('#essay-opening-2'),
] as const;
const ruleIntro = requireElement<HTMLParagraphElement>('#rule-intro');
const essayClosing = [
  requireElement<HTMLParagraphElement>('#essay-closing-1'),
  requireElement<HTMLParagraphElement>('#essay-closing-2'),
  requireElement<HTMLParagraphElement>('#essay-closing-3'),
  requireElement<HTMLParagraphElement>('#essay-closing-4'),
  requireElement<HTMLParagraphElement>('#essay-closing-5'),
] as const;
const selector = requireElement<HTMLElement>('#creature-switcher');
const sourceCode = requireElement<HTMLElement>('#creature-code');
const paletteEditor = requireElement<HTMLElement>('#palette-editor');
const paletteTitle = requireElement<HTMLElement>('#palette-title');
const bodyLabel = requireElement<HTMLElement>('#body-label');
const pulseLabel = requireElement<HTMLElement>('#pulse-label');
const bodyColor = requireElement<HTMLInputElement>('#body-color');
const pulseColor = requireElement<HTMLInputElement>('#pulse-color');
const copyP5 = requireElement<HTMLButtonElement>('#copy-p5');
const resetPalette = requireElement<HTMLButtonElement>('#reset-palette');
const openMorphospace = requireElement<HTMLButtonElement>('#open-morphospace');
const credit = requireElement<HTMLElement>('#credit');
const p5By = requireElement<HTMLElement>('#p5-by');
const wolframBy = requireElement<HTMLElement>('#wolfram-by');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayoutPreference = window.matchMedia('(max-width: 900px)');

function syncExperiencePlacement(): void {
  if (mobileLayoutPreference.matches) {
    mobileExperienceSlot.append(experience);
  } else {
    main.prepend(experience);
  }
}

syncExperiencePlacement();

const profile = selectRenderProfile({
  width: window.innerWidth,
  height: window.innerHeight,
  hardwareConcurrency: navigator.hardwareConcurrency || 0,
});
const school = createSchool(profile.creatureCount, 0xc0ffee, getSwimArea());
const palettes = loadPalettes();
const selectorButtons: HTMLButtonElement[] = [];

for (const creature of school) {
  const palette = palettes[creature.id];
  setCreaturePalette(school, creature.id, palette.body, palette.pulse);
}

canvas.dataset.profile = profile.name;
canvas.dataset.creatures = String(EXHIBITS.length);
canvas.dataset.maxPoints = String(Math.max(...EXHIBITS.map((exhibit) => exhibit.pointCount)));

let reducedMotion = motionPreference.matches;
let selectedId = 0;
function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  } catch {
    // Browser language remains the fallback when storage is unavailable.
  }
  return resolveLocale(navigator.languages);
}

let currentLocale = loadLocale();
let elapsedSeconds = 2.7;
let previousFrame = performance.now();
let animationFrame = 0;
let renderer: CreatureRenderer | undefined;
let rendererState: 'ready' | 'lost' | 'unsupported' = 'unsupported';
let copyFeedbackTimer = 0;

function applyLocale(locale: Locale): void {
  currentLocale = locale;
  const translation = TRANSLATIONS[locale];

  document.documentElement.lang = locale;
  document.body.dataset.locale = locale;
  document.title = translation.documentTitle;
  pageDescription.content = translation.description;
  experience.setAttribute('aria-label', translation.experienceLabel);
  languagePicker.setAttribute('aria-label', translation.languageLabel);
  languageButtons.forEach((button) => {
    const isCurrent = button.dataset.locale === locale;
    button.classList.toggle('is-current', isCurrent);
    button.setAttribute('aria-pressed', String(isCurrent));
  });
  essayTitle.textContent = translation.title;
  essayOpening.forEach((paragraph, index) => {
    paragraph.textContent = translation.opening[index];
  });
  ruleIntro.textContent = translation.ruleIntro;
  essayClosing.forEach((paragraph, index) => {
    paragraph.textContent = translation.closing[index];
  });
  selector.setAttribute('aria-label', translation.catalogLabel);
  paletteEditor.setAttribute('aria-label', translation.paletteLabel);
  paletteTitle.textContent = translation.palette;
  bodyLabel.textContent = translation.body;
  pulseLabel.textContent = translation.pulse;
  copyP5.textContent = translation.copyP5;
  resetPalette.textContent = translation.reset;
  openMorphospace.textContent = translation.openMorphospace;
  credit.setAttribute('aria-label', translation.attributionLabel);
  p5By.textContent = translation.p5By;
  wolframBy.textContent = translation.wolframBy;
  selectorButtons.forEach((button, index) => {
    button.setAttribute('aria-label', translation.showCreature(formatExhibitNumber(index)));
  });

  if (rendererState !== 'ready') {
    renderStatus.textContent =
      rendererState === 'lost' ? translation.renderLost : translation.renderUnsupported;
  }
}

function setRendererState(state: 'ready' | 'lost' | 'unsupported'): void {
  rendererState = state;
  canvas.dataset.renderer = state;

  if (state === 'ready') {
    renderStatus.hidden = true;
    document.body.classList.add('is-ready');
    return;
  }

  document.body.classList.remove('is-ready');
  renderStatus.hidden = false;
  const translation = TRANSLATIONS[currentLocale];
  renderStatus.textContent = state === 'lost' ? translation.renderLost : translation.renderUnsupported;
}

try {
  renderer = new CreatureRenderer(canvas, {
    pointDensity: profile.pointDensity,
    maxDevicePixelRatio: profile.maxDevicePixelRatio,
    onStateChange: setRendererState,
  });
} catch (error) {
  console.error(error);
  setRendererState('unsupported');
}

function selectExhibit(id: number, immediate = false): void {
  selectedId = ((id % EXHIBITS.length) + EXHIBITS.length) % EXHIBITS.length;
  const exhibit = EXHIBITS[selectedId];
  const palette = palettes[selectedId];

  layoutSchool(school, selectedId, getSwimArea(), immediate || reducedMotion);
  sourceCode.textContent = exhibit.code;
  bodyColor.value = palette.body;
  pulseColor.value = palette.pulse;
  document.documentElement.style.setProperty('--accent', palette.pulse);

  selectorButtons.forEach((button, index) => {
    const isSelected = index === selectedId;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });

  if (!immediate) {
    selectorButtons[selectedId]?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }
}

EXHIBITS.forEach((exhibit) => {
  const button = document.createElement('button');
  button.className = 'exhibit-button';
  button.type = 'button';
  button.role = 'tab';
  button.textContent = formatExhibitNumber(exhibit.id);
  button.setAttribute(
    'aria-label',
    TRANSLATIONS[currentLocale].showCreature(formatExhibitNumber(exhibit.id)),
  );
  button.addEventListener('click', () => selectExhibit(exhibit.id));
  button.addEventListener('keydown', (event) => {
    let nextId: number | undefined;

    if (event.key === 'ArrowRight') nextId = exhibit.id + 1;
    if (event.key === 'ArrowLeft') nextId = exhibit.id - 1;
    if (event.key === 'Home') nextId = 0;
    if (event.key === 'End') nextId = EXHIBITS.length - 1;
    if (nextId === undefined) return;

    event.preventDefault();
    selectExhibit(nextId);
    selectorButtons[((nextId % EXHIBITS.length) + EXHIBITS.length) % EXHIBITS.length].focus();
  });
  selector.append(button);
  selectorButtons.push(button);
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const locale = button.dataset.locale as Locale;
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Language still changes for the current visit when storage is unavailable.
    }
    applyLocale(locale);
  });
});

function updateSelectedPalette(): void {
  applyPalette(selectedId, { body: bodyColor.value, pulse: pulseColor.value });
}

function applyPalette(id: number, palette: Palette): void {
  palettes[id] = palette;
  setCreaturePalette(school, id, palette.body, palette.pulse);

  if (id === selectedId) {
    bodyColor.value = palette.body;
    pulseColor.value = palette.pulse;
    document.documentElement.style.setProperty('--accent', palette.pulse);
  }

  storePalettes(palettes);
}

bodyColor.addEventListener('input', updateSelectedPalette);
pulseColor.addEventListener('input', updateSelectedPalette);
bodyColor.addEventListener('change', updateSelectedPalette);
pulseColor.addEventListener('change', updateSelectedPalette);
copyP5.addEventListener('click', async () => {
  const output = buildP5Export(EXHIBITS[selectedId], palettes[selectedId]);

  try {
    await writeClipboardText(output);
    copyP5.textContent = TRANSLATIONS[currentLocale].copiedP5;
  } catch {
    copyP5.textContent = TRANSLATIONS[currentLocale].copyFailed;
  }

  window.clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = window.setTimeout(() => {
    copyP5.textContent = TRANSLATIONS[currentLocale].copyP5;
  }, 1_600);
});
openMorphospace.addEventListener('click', () => {
  const transfer = createMuseumTransfer(EXHIBITS[selectedId], palettes[selectedId]);
  let target = '/morphospace/?import=museum';
  try {
    sessionStorage.setItem(MUSEUM_TRANSFER_KEY, encodeMuseumTransfer(transfer));
  } catch {
    const parameters = new URLSearchParams({
      import: 'museum',
      exhibit: String(transfer.exhibitId),
      variant: String(transfer.variant),
      points: String(transfer.pointCount),
      body: transfer.palette.body,
      pulse: transfer.palette.pulse,
    });
    target = `/morphospace/?${parameters.toString()}`;
  }
  window.location.assign(target);
});
resetPalette.addEventListener('click', () => {
  const exhibit = EXHIBITS[selectedId];
  applyPalette(selectedId, {
    body: exhibit.defaultBody,
    pulse: exhibit.defaultPulse,
  });
});

function drawFrame(now: number): void {
  const deltaSeconds = document.hidden ? 0 : (now - previousFrame) / 1_000;
  previousFrame = now;

  if (!reducedMotion) {
    elapsedSeconds += Math.max(0, Math.min(deltaSeconds, 0.05));
  }

  stepSchool(school, deltaSeconds, reducedMotion);
  renderer?.render(school, elapsedSeconds);

  if (!canvas.dataset.ready && renderer) canvas.dataset.ready = 'true';
  animationFrame = window.requestAnimationFrame(drawFrame);
}

function handleMotionPreference(event: MediaQueryListEvent): void {
  reducedMotion = event.matches;
  previousFrame = performance.now();
  if (reducedMotion) layoutSchool(school, selectedId, getSwimArea(), true);
}

motionPreference.addEventListener('change', handleMotionPreference);
document.addEventListener('visibilitychange', () => {
  previousFrame = performance.now();
});
window.addEventListener('resize', () => {
  layoutSchool(school, selectedId, getSwimArea(), reducedMotion);
});
mobileLayoutPreference.addEventListener('change', () => {
  syncExperiencePlacement();
  layoutSchool(school, selectedId, getSwimArea(), reducedMotion);
});
window.addEventListener(
  'pagehide',
  (event) => {
    if (event.persisted) return;
    window.cancelAnimationFrame(animationFrame);
    motionPreference.removeEventListener('change', handleMotionPreference);
    renderer?.dispose();
  },
);
window.addEventListener('pageshow', () => {
  previousFrame = performance.now();
});

applyLocale(currentLocale);
selectExhibit(0, true);
animationFrame = window.requestAnimationFrame(drawFrame);
