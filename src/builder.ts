import './builder.css';
import { EXHIBITS, formatExhibitNumber } from './catalog';
import {
  DEFAULT_MORPH,
  DEVELOPMENT_NAMES,
  MORPH_CONTROLS,
  deriveVariationSeed,
  generateCreature,
  generateRelatedCreature,
  normalizeMorph,
  type BuilderPalette,
  type CreatureGenome,
  type GeneratedCreature,
  type MorphKey,
  type MorphState,
} from './builder-model';
import { BuilderRenderer } from './builder-renderer';
import {
  BUILDER_TRANSLATIONS,
  isBuilderLocale,
  resolveBuilderLocale,
  type BuilderLocale,
  type CodeTab,
} from './builder-i18n';
import {
  generateBuilderCodeSources,
  evaluateCustomMorph,
  formatWolframCustomMorph,
  IDENTITY_CUSTOM_MORPH,
  parseEditableWebGL,
  type BuilderCodeSources,
  type CustomMorphProgram,
} from './builder-code';
import {
  buildP5Export,
  createMuseumTransfer,
  decodeMuseumTransfer,
  MUSEUM_TRANSFER_KEY,
  parseMuseumTransfer,
  type MuseumTransfer,
} from './museum-transfer';
import {
  interpolateBuilderFrame,
  measureBuilderFrame,
  type BuilderFrame,
} from './builder-framing';
import {
  CREATURE_SAVER_PREVIEW_KEY,
  createCreatureSaverPreset,
  serializeCreatureSaverPreset,
} from './saver-preset';

interface BuilderState {
  readonly genome: CreatureGenome;
  readonly name: string;
  readonly score: number;
  readonly morph: MorphState;
  readonly palette: BuilderPalette;
  readonly generatedPalette: BuilderPalette;
  readonly customMorph: CustomMorphProgram;
  readonly museumSource?: MuseumTransfer;
}

interface ControlView {
  readonly input: HTMLInputElement;
  readonly output: HTMLOutputElement;
}

type EvolutionMode = 'close' | 'bold' | 'strange';

const STORAGE_KEY = 'creature-generator-v4';
const LOCALE_STORAGE_KEY = 'creature-locale-v1';
const HEX_COLOR = /^#[\da-f]{6}$/i;
const MAX_UNDO_STATES = 40;

function loadLocale(): BuilderLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isBuilderLocale(stored)) return stored;
  } catch {
    // Browser languages remain the fallback when storage is unavailable.
  }
  return resolveBuilderLocale(navigator.languages);
}

const currentLocale = loadLocale();
const translation = BUILDER_TRANSLATIONS[currentLocale];

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required builder element ${selector} was not found.`);
  return element;
}

function randomSeed(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0];
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

function generateSafely(factory: (seed: number) => GeneratedCreature, initialSeed = randomSeed()): GeneratedCreature {
  let seed = initialSeed;
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return factory(seed);
    } catch (error) {
      lastError = error;
      seed = deriveVariationSeed(seed);
    }
  }
  try {
    return factory(0x12345678);
  } catch (error) {
    throw lastError ?? error;
  }
}

function stateFromGenerated(generated: GeneratedCreature): BuilderState {
  return {
    genome: generated.genome,
    name: generated.name,
    score: generated.score,
    morph: { ...DEFAULT_MORPH },
    palette: { ...generated.palette },
    generatedPalette: { ...generated.palette },
    customMorph: IDENTITY_CUSTOM_MORPH,
  };
}

function stateFromMuseum(transfer: MuseumTransfer): BuilderState {
  const generated = generateSafely(
    (seed) => generateCreature(seed, undefined, transfer.exhibitId % 7),
    (0x6d757365 ^ Math.imul(transfer.variant + 1, 0x9e3779b9)) >>> 0,
  );
  return {
    ...stateFromGenerated(generated),
    genome: {
      ...generated.genome,
      development: [
        generated.genome.development[0],
        0,
        generated.genome.development[2],
        generated.genome.development[3],
      ],
    },
    name: `MUSEUM ${formatExhibitNumber(transfer.exhibitId)} · WORKING COPY`,
    morph: normalizeMorph({
      ...DEFAULT_MORPH,
      density: Math.min(28_000, transfer.pointCount),
    }),
    palette: { ...transfer.palette },
    generatedPalette: { ...transfer.palette },
    museumSource: transfer,
  };
}

function cloneState(state: BuilderState): BuilderState {
  return {
    genome: {
      ...state.genome,
      modules: [...state.genome.modules],
      development: [...state.genome.development],
      parameters: [...state.genome.parameters],
    },
    name: state.name,
    score: state.score,
    morph: { ...state.morph },
    palette: { ...state.palette },
    generatedPalette: { ...state.generatedPalette },
    customMorph: state.customMorph,
    museumSource: state.museumSource
      ? {
          ...state.museumSource,
          palette: { ...state.museumSource.palette },
        }
      : undefined,
  };
}

function isFiniteNumberArray(value: unknown, length: number): value is number[] {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isCreatureGenome(value: unknown): value is CreatureGenome {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CreatureGenome>;
  return typeof candidate.seed === 'number'
    && Number.isFinite(candidate.seed)
    && typeof candidate.family === 'number'
    && Number.isFinite(candidate.family)
    && isFiniteNumberArray(candidate.modules, 4)
    && isFiniteNumberArray(candidate.development, 4)
    && isFiniteNumberArray(candidate.parameters, 24)
    && typeof candidate.sourcePointCount === 'number'
    && Number.isFinite(candidate.sourcePointCount)
    && typeof candidate.normalization === 'number'
    && candidate.normalization > 0
    && typeof candidate.centerX === 'number'
    && Number.isFinite(candidate.centerX)
    && typeof candidate.centerY === 'number'
    && Number.isFinite(candidate.centerY);
}

function normalizePalette(
  candidate: Partial<Record<keyof BuilderPalette, unknown>>,
  fallback: BuilderPalette,
): BuilderPalette {
  return {
    body:
      typeof candidate.body === 'string' && HEX_COLOR.test(candidate.body)
        ? candidate.body
        : fallback.body,
    pulse:
      typeof candidate.pulse === 'string' && HEX_COLOR.test(candidate.pulse)
        ? candidate.pulse
        : fallback.pulse,
  };
}

function loadState(imported?: MuseumTransfer): BuilderState {
  if (imported) return stateFromMuseum(imported);
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      genome?: unknown;
      name?: unknown;
      score?: unknown;
      morph?: Partial<Record<MorphKey, unknown>>;
      palette?: Partial<Record<keyof BuilderPalette, unknown>>;
      generatedPalette?: Partial<Record<keyof BuilderPalette, unknown>>;
      customWebGL?: unknown;
      museumExhibitId?: unknown;
    } | null;
    if (
      !parsed
      || !isCreatureGenome(parsed.genome)
      || typeof parsed.name !== 'string'
      || typeof parsed.score !== 'number'
      || !Number.isFinite(parsed.score)
    ) {
      throw new Error('No valid stored generator state.');
    }
    const fallbackPalette = normalizePalette(parsed.generatedPalette ?? {}, {
      body: '#d4d4d0',
      pulse: '#54d7ff',
    });
    const morph = normalizeMorph(parsed.morph ?? {});
    const palette = normalizePalette(parsed.palette ?? {}, fallbackPalette);
    let customMorph = IDENTITY_CUSTOM_MORPH;
    if (typeof parsed.customWebGL === 'string') {
      const customResult = parseEditableWebGL(parsed.customWebGL, parsed.genome);
      if (customResult.ok) customMorph = customResult.state.customMorph;
    }
    const exhibit = Number.isInteger(parsed.museumExhibitId)
      ? EXHIBITS[parsed.museumExhibitId as number]
      : undefined;
    return {
      genome: parsed.genome,
      name: parsed.name,
      score: parsed.score,
      morph,
      palette,
      generatedPalette: fallbackPalette,
      customMorph,
      museumSource: exhibit
        ? createMuseumTransfer(exhibit, palette)
        : undefined,
    };
  } catch {
    return stateFromGenerated(generateSafely((seed) => generateCreature(seed)));
  }
}

function consumeMuseumTransfer(): MuseumTransfer | undefined {
  let transfer: MuseumTransfer | undefined;
  try {
    transfer = decodeMuseumTransfer(sessionStorage.getItem(MUSEUM_TRANSFER_KEY));
    sessionStorage.removeItem(MUSEUM_TRANSFER_KEY);
  } catch {
    // The URL fallback below remains available when session storage is blocked.
  }

  const parameters = new URLSearchParams(window.location.search);
  if (!transfer && parameters.get('import') === 'museum') {
    transfer = parseMuseumTransfer({
      version: 1,
      kind: 'museum-exhibit',
      exhibitId: Number(parameters.get('exhibit')),
      variant: Number(parameters.get('variant')),
      pointCount: Number(parameters.get('points')),
      palette: {
        body: parameters.get('body') ?? '',
        pulse: parameters.get('pulse') ?? '',
      },
    });
  }

  if (parameters.get('import') === 'museum') {
    window.history.replaceState(null, '', '/morphospace/');
  }
  if (!transfer) return undefined;
  const exhibit = EXHIBITS[transfer.exhibitId];
  if (
    !exhibit
    || exhibit.variant !== transfer.variant
    || exhibit.pointCount !== transfer.pointCount
  ) {
    return undefined;
  }
  return transfer;
}

function formatControlValue(key: MorphKey, value: number): string {
  if (key === 'density') return Math.round(value).toLocaleString(currentLocale);
  if (key === 'gesture' || key === 'polarity' || key === 'phase') {
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '');
}

const canvas = requireElement<HTMLCanvasElement>('#builder-canvas');
const stage = requireElement<HTMLElement>('.builder-stage');
const layout = requireElement<HTMLElement>('.builder-layout');
const inspector = requireElement<HTMLElement>('#builder-inspector');
const mobileStageSlot = requireElement<HTMLElement>('#mobile-stage-slot');
const renderStatus = requireElement<HTMLParagraphElement>('#builder-render-status');
const pageDescription = requireElement<HTMLMetaElement>('#builder-page-description');
const saveStatus = requireElement<HTMLElement>('#save-status');
const generatedName = requireElement<HTMLElement>('#generated-name');
const genomeId = requireElement<HTMLElement>('#genome-id');
const stagePoints = requireElement<HTMLElement>('#stage-points');
const formControls = requireElement<HTMLElement>('#form-controls');
const surfaceControls = requireElement<HTMLElement>('#surface-controls');
const presenceControls = requireElement<HTMLElement>('#presence-controls');
const transformationOptions = requireElement<HTMLElement>('#transformation-options');
const evolutionOptions = requireElement<HTMLElement>('#evolution-options');
const formField = requireElement<HTMLButtonElement>('#form-field');
const bodyColor = requireElement<HTMLInputElement>('#builder-body-color');
const pulseColor = requireElement<HTMLInputElement>('#builder-pulse-color');
const previewScreensaver = requireElement<HTMLButtonElement>('#preview-screensaver');
const downloadScreensaver = requireElement<HTMLButtonElement>('#download-screensaver');
const screensaverStatus = requireElement<HTMLParagraphElement>('#screensaver-status');
const generateButton = requireElement<HTMLButtonElement>('#generate-builder');
const varyButton = requireElement<HTMLButtonElement>('#vary-builder');
const undoButton = requireElement<HTMLButtonElement>('#undo-builder');
const resetButton = requireElement<HTMLButtonElement>('#reset-builder');
const wolframCode = requireElement<HTMLElement>('#builder-wolfram-code');
const p5Code = requireElement<HTMLElement>('#builder-p5-code');
const webglCode = requireElement<HTMLTextAreaElement>('#builder-webgl-code');
const webglStatus = requireElement<HTMLElement>('#webgl-status');
const runWebgl = requireElement<HTMLButtonElement>('#run-webgl');
const resetWebgl = requireElement<HTMLButtonElement>('#reset-webgl');
const copyCode = requireElement<HTMLButtonElement>('#copy-code');
const codeTabs = requireElement<HTMLElement>('#code-tabs');
const codeTabButtons = [...codeTabs.querySelectorAll<HTMLButtonElement>('button[data-code-view]')];
const codePanels = [...document.querySelectorAll<HTMLElement>('[data-code-panel]')];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayoutPreference = window.matchMedia('(max-width: 900px)');

function generateCodeSourcesForState(candidate: BuilderState): BuilderCodeSources {
  const generated = generateBuilderCodeSources(
    candidate.genome,
    candidate.morph,
    candidate.palette,
    candidate.customMorph,
  );
  if (!candidate.museumSource) return generated;
  const exhibit = EXHIBITS[candidate.museumSource.exhibitId];
  if (!exhibit) return generated;
  const number = formatExhibitNumber(exhibit.id);
  return {
    ...generated,
    wolfram: `(* Museum ${number} · editable Morphospace working copy *)\n${exhibit.code}\n\n${formatWolframCustomMorph(candidate.customMorph)}`,
    p5js: `${buildP5Export(exhibit, candidate.palette)}\n// Morphospace tuning is represented in the editable WebGL module.\n`,
    webgl: `// Museum ${number} · exact archive equation used as the immutable base.\n// This is a separate working copy; edits never alter the museum exhibit.\n${generated.webgl}`,
  };
}

const initialMuseumTransfer = consumeMuseumTransfer();
let state = loadState(initialMuseumTransfer);
let renderedMorph: Record<MorphKey, number> = { ...state.morph };
let interactionStart: BuilderState | undefined;
let saveTimer = 0;
let generationTimer = 0;
let elapsedSeconds = 2.7;
let previousFrame = performance.now();
let animationFrame = 0;
let renderer: BuilderRenderer | undefined;
let evolutionMode: EvolutionMode = 'bold';
let activeCodeTab: CodeTab = 'wolfram';
let webglDraftDirty = false;
let codeSources: BuilderCodeSources = generateCodeSourcesForState(state);
let copyFeedbackTimer = 0;
let frameMeasureTimer = 0;
let targetFrame: BuilderFrame = measureCurrentFrame(state.morph, elapsedSeconds);
let renderedFrame: BuilderFrame = targetFrame;
const undoStack: BuilderState[] = [];
const controlViews = new Map<MorphKey, ControlView>();

function measureCurrentFrame(morph: MorphState, time: number): BuilderFrame {
  if (state.museumSource) {
    return {
      centerX: 0,
      centerY: 0,
      scale: 1,
      width: 1,
      height: 1,
      sampleCount: 0,
      finiteRatio: 1,
    };
  }
  return measureBuilderFrame(state.genome, morph, time, {
    pointTransform: (point, index01, frameTime) => (
      evaluateCustomMorph(state.customMorph, point, index01, frameTime)
    ),
  });
}

function resetMeasuredFrame(morph: MorphState = state.morph): void {
  targetFrame = measureCurrentFrame(morph, elapsedSeconds);
  renderedFrame = targetFrame;
  frameMeasureTimer = performance.now();
}

function syncStagePlacement(): void {
  if (mobileLayoutPreference.matches) {
    mobileStageSlot.after(stage);
  } else {
    layout.insertBefore(stage, inspector);
  }
}

function syncMobileHeaderVisibility(): void {
  document.body.classList.toggle(
    'is-builder-scrolled',
    mobileLayoutPreference.matches && window.scrollY > 24,
  );
}

function syncResponsiveLayout(): void {
  syncStagePlacement();
  syncMobileHeaderVisibility();
}

syncResponsiveLayout();
window.addEventListener('scroll', syncMobileHeaderVisibility, { passive: true });

function setRenderState(next: 'ready' | 'lost' | 'unsupported'): void {
  canvas.dataset.renderer = next;
  if (next === 'ready') {
    document.body.classList.add('is-rendering');
    renderStatus.hidden = true;
    return;
  }
  document.body.classList.remove('is-rendering');
  renderStatus.hidden = false;
  renderStatus.textContent =
    next === 'lost'
      ? translation.status.renderLost
      : translation.status.renderUnsupported;
}

try {
  renderer = new BuilderRenderer(canvas, setRenderState);
} catch (error) {
  console.error(error);
  setRenderState('unsupported');
}

function storeState(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        genome: state.genome,
        name: state.name,
        score: state.score,
        morph: state.morph,
        palette: state.palette,
        generatedPalette: state.generatedPalette,
        customWebGL: generateCodeSourcesForState(state).webgl,
        museumExhibitId: state.museumSource?.exhibitId,
      }),
    );
    saveStatus.textContent = translation.status.saving;
    saveStatus.classList.add('is-saving');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveStatus.textContent = translation.status.savedLocally;
      saveStatus.classList.remove('is-saving');
    }, 520);
  } catch {
    saveStatus.textContent = translation.status.storageUnavailable;
  }
}

function remember(previous: BuilderState): void {
  undoStack.push(cloneState(previous));
  if (undoStack.length > MAX_UNDO_STATES) undoStack.shift();
  undoButton.disabled = false;
}

function updateRangeProgress(input: HTMLInputElement): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const progress = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--range-progress', `${progress}%`);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalized(value: number, min: number, max: number): number {
  return clamp01((value - min) / (max - min));
}

function formFieldPosition(morph: MorphState): { x: number; y: number } {
  const x = normalized(morph.reach, 0.68, 1.42);
  const y = (
    normalized(morph.mutation, 0, 1.65)
    + normalized(morph.resonance, 0.55, 1.5)
    + normalized(morph.texture, 0.72, 1.34)
    + normalized(morph.lobes, 0.65, 1.55)
  ) / 4;
  return { x, y };
}

function syncFormField(): void {
  const { x, y } = formFieldPosition(state.morph);
  formField.style.setProperty('--field-x', `${x * 100}%`);
  formField.style.setProperty('--field-y', `${y * 100}%`);
  formField.setAttribute(
    'aria-label',
    `${translation.formField.ariaLabel}. ${Math.round(x * 100)}% / ${Math.round(y * 100)}%.`,
  );
}

function applyFormField(x: number, y: number): void {
  const span = clamp01(x);
  const wildness = clamp01(y);
  state = {
    ...state,
    morph: normalizeMorph({
      ...state.morph,
      scale: 0.86 + 0.27 * span,
      reach: 0.68 + 0.74 * span,
      fold: 0.72 + 0.7 * (0.32 * span + 0.68 * wildness),
      lobes: 0.65 + 0.9 * wildness,
      tension: 1.32 - 0.55 * span,
      mutation: 0.22 + 1.43 * wildness,
      gesture: (span - 0.5) * 2 * (0.32 + 0.68 * wildness),
      resonance: 0.55 + 0.95 * wildness,
      texture: 0.72 + 0.62 * wildness,
    }),
  };
  syncView();
  storeState();
}

function selectRadioButton(container: HTMLElement, selected: HTMLButtonElement): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>('button[role="radio"]')) {
    const active = button === selected;
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

function enableRadioArrowKeys(container: HTMLElement): void {
  container.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0 || buttons.length === 0) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const next = buttons[(current + direction + buttons.length) % buttons.length];
    next.focus();
    next.click();
  });
}

function setText(id: string, value: string): void {
  requireElement<HTMLElement>(`#${id}`).textContent = value;
}

function applyTranslation(): void {
  document.documentElement.lang = currentLocale;
  document.body.dataset.locale = currentLocale;
  document.title = translation.documentTitle;
  pageDescription.content = translation.description;
  requireElement<HTMLElement>('#builder-brand').setAttribute('aria-label', translation.backToMuseum);
  requireElement<HTMLElement>('#museum-link').setAttribute('aria-label', translation.backToMuseum);
  stage.setAttribute('aria-label', translation.stageLabel);
  setText('builder-kicker', translation.intro.kicker);
  setText('builder-title', translation.intro.title);
  setText('builder-intro-copy', translation.intro.body);
  requireElement<HTMLElement>('#builder-actions').setAttribute('aria-label', translation.actions.label);
  generateButton.textContent = translation.actions.generate;
  setText('vary-builder-label', translation.actions.mutate);
  undoButton.textContent = translation.actions.undo;
  resetButton.textContent = translation.actions.reset;
  setText('evolution-title', translation.evolution.title);
  setText('evolution-hint', translation.evolution.description);
  evolutionOptions.setAttribute('aria-label', translation.evolution.ariaLabel);
  setText('evolution-close', translation.evolution.modes.close);
  setText('evolution-bold', translation.evolution.modes.bold);
  setText('evolution-strange', translation.evolution.modes.strange);
  setText('form-field-title', translation.formField.title);
  setText('form-field-hint', translation.formField.description);
  setText('field-ordered', translation.formField.ordered);
  setText('field-wild', translation.formField.wild);
  setText('field-compact', translation.formField.compact);
  setText('field-expansive', translation.formField.expansive);
  setText('transformation-title', translation.development.title);
  setText('transformation-hint', translation.development.description);
  transformationOptions.setAttribute('aria-label', translation.development.ariaLabel);
  setText('fine-tuning-label', translation.fineTuning.title);
  setText('fine-tuning-hint', translation.fineTuning.geneCount(MORPH_CONTROLS.length));
  setText('form-controls-title', translation.groups.form.title);
  setText('form-controls-hint', translation.groups.form.description);
  setText('surface-controls-title', translation.groups.structure.title);
  setText('surface-controls-hint', translation.groups.structure.description);
  setText('presence-controls-title', translation.groups.life.title);
  setText('presence-controls-hint', translation.groups.life.description);
  setText('builder-palette-title', translation.colour.title);
  setText('palette-hint', translation.colour.description);
  setText('builder-body-label', translation.colour.body);
  setText('builder-pulse-label', translation.colour.pulse);
  setText('screensaver-title', translation.screensaver.title);
  setText('screensaver-hint', translation.screensaver.description);
  previewScreensaver.textContent = translation.screensaver.preview;
  downloadScreensaver.textContent = translation.screensaver.download;
  setText('code-laboratory-title', translation.code.title);
  setText('code-laboratory-hint', translation.code.description);
  codeTabs.setAttribute('aria-label', translation.code.tabLabel);
  codeTabButtons.forEach((button) => {
    const tab = button.dataset.codeView as CodeTab;
    button.textContent = translation.code.tabs[tab];
    button.setAttribute('aria-label', translation.code.tabDescriptions[tab]);
  });
  copyCode.textContent = translation.code.copy;
  requireElement<HTMLElement>('#webgl-editor-label').textContent = translation.code.editorLabel;
  runWebgl.textContent = translation.code.apply;
  resetWebgl.textContent = translation.code.reset;
  requireElement<HTMLElement>('#builder-credit').setAttribute('aria-label', translation.attribution.label);
  setText('builder-p5-by', translation.attribution.p5By);
  setText('builder-wolfram-by', translation.attribution.wolframBy);
  saveStatus.textContent = translation.status.savedLocally;
}

function refreshCodeSources(syncEditor = true): void {
  codeSources = generateCodeSourcesForState(state);
  wolframCode.textContent = codeSources.wolfram;
  p5Code.textContent = codeSources.p5js;
  if (syncEditor && !webglDraftDirty) webglCode.value = codeSources.webgl;
}

function syncView(syncEditor = true): void {
  for (const control of MORPH_CONTROLS) {
    const view = controlViews.get(control.key);
    if (!view) continue;
    const value = state.morph[control.key];
    view.input.value = String(value);
    view.output.value = formatControlValue(control.key, value);
    updateRangeProgress(view.input);
  }
  bodyColor.value = state.palette.body;
  pulseColor.value = state.palette.pulse;
  document.documentElement.style.setProperty('--builder-accent', state.palette.pulse);
  generatedName.textContent = state.name;
  genomeId.textContent = state.museumSource
    ? `MUSEUM ${formatExhibitNumber(state.museumSource.exhibitId)}`
    : translation.specimen.genome(state.genome.seed.toString(16).padStart(8, '0'));
  const sourcePointCount = state.museumSource?.pointCount ?? state.genome.sourcePointCount;
  const pointCount = Math.min(
    Math.round(state.morph.density),
    sourcePointCount,
  ).toLocaleString(currentLocale);
  stagePoints.textContent = translation.specimen.points(pointCount);
  requireElement<HTMLElement>('#points-label').textContent = '';
  stage.dataset.family = String(state.genome.family);
  stage.dataset.program = state.genome.modules.join('.');
  stage.dataset.development = String(state.genome.development[0]);
  stage.dataset.seed = String(state.genome.seed);
  stage.dataset.score = state.score.toFixed(3);
  stage.dataset.source = state.museumSource ? 'museum' : 'generated';
  refreshCodeSources(syncEditor);
  for (const button of transformationOptions.querySelectorAll<HTMLButtonElement>('button')) {
    const selected = Number(button.dataset.kind) === state.genome.development[0];
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  for (const button of evolutionOptions.querySelectorAll<HTMLButtonElement>('button')) {
    const selected = button.dataset.mode === evolutionMode;
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  syncFormField();
  undoButton.disabled = undoStack.length === 0;
}

function installCustomMorph(
  webglInjection: string,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  if (!renderer) {
    return { ok: false, error: translation.status.renderUnsupported };
  }
  return renderer.setCustomMorph(webglInjection);
}

function applyState(next: BuilderState, rememberCurrent = true): boolean {
  const candidate = cloneState(next);
  const nextSources = generateCodeSourcesForState(candidate);
  const compileResult = installCustomMorph(nextSources.webglInjection);
  if (!compileResult.ok) {
    console.error('The stored custom morph could not be compiled.', compileResult.error);
    setEditorStatus(translation.code.compileFailed(compileResult.error), true);
    return false;
  }
  interactionStart = undefined;
  if (rememberCurrent) remember(state);
  state = candidate;
  resetMeasuredFrame();
  syncView();
  storeState();
  return true;
}

function showGenerated(next: BuilderState): void {
  window.clearTimeout(generationTimer);
  stage.classList.add('is-generating');
  if (!applyState(next)) {
    stage.classList.remove('is-generating');
    return;
  }
  renderedMorph = { ...state.morph };
  generationTimer = window.setTimeout(() => stage.classList.remove('is-generating'), 180);
}

function showGeneratedSafely(
  factory: (seed: number) => GeneratedCreature,
  preserveTuning = false,
  initialSeed = randomSeed(),
): void {
  try {
    const generated = generateSafely(factory, initialSeed);
    const next = stateFromGenerated(generated);
    showGenerated(preserveTuning
      ? {
          ...next,
          morph: { ...state.morph },
          palette: { ...state.palette },
          generatedPalette: { ...state.palette },
          customMorph: state.customMorph,
          museumSource: state.museumSource,
          name: state.museumSource ? state.name : next.name,
        }
      : next);
  } catch (error) {
    console.error('The generator could not find a coherent form.', error);
    saveStatus.textContent = translation.status.noCoherentForm;
    saveStatus.classList.remove('is-saving');
    stage.classList.remove('is-generating');
  }
}

function beginInteraction(): void {
  if (!interactionStart) interactionStart = cloneState(state);
}

function finishInteraction(): void {
  if (!interactionStart) return;
  remember(interactionStart);
  interactionStart = undefined;
}

applyTranslation();

for (const control of MORPH_CONTROLS) {
  const label = document.createElement('label');
  label.className = 'morph-control';
  const meta = document.createElement('span');
  meta.className = 'control-meta';
  const name = document.createElement('span');
  name.className = 'control-name';
  name.textContent = translation.controls[control.key].label;
  const output = document.createElement('output');
  output.className = 'control-value';
  output.htmlFor = `morph-${control.key}`;
  meta.append(name, output);

  const input = document.createElement('input');
  input.id = `morph-${control.key}`;
  input.type = 'range';
  input.min = String(control.min);
  input.max = String(control.max);
  input.step = String(control.step);
  input.setAttribute('aria-description', translation.controls[control.key].description);
  input.addEventListener('pointerdown', beginInteraction);
  input.addEventListener('keydown', beginInteraction);
  input.addEventListener('input', () => {
    state = {
      ...state,
      morph: normalizeMorph({ ...state.morph, [control.key]: Number(input.value) }),
    };
    syncView();
    storeState();
  });
  input.addEventListener('change', finishInteraction);
  input.addEventListener('blur', finishInteraction);
  label.append(meta, input);
  controlViews.set(control.key, { input, output });
  const target = control.group === 'form'
    ? formControls
    : control.group === 'surface'
      ? surfaceControls
      : presenceControls;
  target.append(label);
}

for (const [kind, transformation] of DEVELOPMENT_NAMES.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.role = 'radio';
  button.dataset.kind = String(kind);
  button.textContent = translation.development.transformations[kind] ?? transformation;
  button.addEventListener('click', () => {
    if (state.genome.development[0] === kind) return;
    applyState({
      ...state,
      genome: {
        ...state.genome,
        development: [
          kind,
          state.museumSource && state.genome.development[1] === 0
            ? 0.075
            : state.genome.development[1],
          state.genome.development[2],
          state.genome.development[3],
        ],
      },
    });
  });
  transformationOptions.append(button);
}

for (const button of evolutionOptions.querySelectorAll<HTMLButtonElement>('button')) {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    if (mode !== 'close' && mode !== 'bold' && mode !== 'strange') return;
    evolutionMode = mode;
    selectRadioButton(evolutionOptions, button);
  });
}

for (const group of [transformationOptions, evolutionOptions]) {
  enableRadioArrowKeys(group);
}

function formFieldPoint(clientX: number, clientY: number): { x: number; y: number } {
  const bounds = formField.getBoundingClientRect();
  return {
    x: clamp01((clientX - bounds.left) / Math.max(1, bounds.width)),
    y: clamp01((clientY - bounds.top) / Math.max(1, bounds.height)),
  };
}

formField.addEventListener('pointerdown', (event) => {
  beginInteraction();
  formField.setPointerCapture(event.pointerId);
  const point = formFieldPoint(event.clientX, event.clientY);
  applyFormField(point.x, point.y);
});
formField.addEventListener('pointermove', (event) => {
  if (!formField.hasPointerCapture(event.pointerId)) return;
  const point = formFieldPoint(event.clientX, event.clientY);
  applyFormField(point.x, point.y);
});
formField.addEventListener('pointerup', (event) => {
  if (formField.hasPointerCapture(event.pointerId)) formField.releasePointerCapture(event.pointerId);
  finishInteraction();
});
formField.addEventListener('pointercancel', finishInteraction);
formField.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
  event.preventDefault();
  beginInteraction();
  const current = formFieldPosition(state.morph);
  const step = event.shiftKey ? 0.12 : 0.04;
  if (event.key === 'Home') applyFormField(0.5, 0.5);
  else if (event.key === 'ArrowLeft') applyFormField(current.x - step, current.y);
  else if (event.key === 'ArrowRight') applyFormField(current.x + step, current.y);
  else if (event.key === 'ArrowUp') applyFormField(current.x, current.y - step);
  else applyFormField(current.x, current.y + step);
});
formField.addEventListener('keyup', finishInteraction);

function updatePalette(): void {
  state = {
    ...state,
    palette: normalizePalette(
      { body: bodyColor.value, pulse: pulseColor.value },
      state.generatedPalette,
    ),
  };
  syncView();
  storeState();
}

function currentScreensaverPreset(): string {
  return serializeCreatureSaverPreset(createCreatureSaverPreset({
    name: state.name,
    genome: state.genome,
    morph: state.morph,
    palette: state.palette,
    customMorph: state.customMorph,
    origin: state.museumSource ? 'museum-working-copy' : 'morphospace',
  }));
}

function setScreensaverStatus(message: string): void {
  screensaverStatus.hidden = false;
  screensaverStatus.textContent = message;
}

function downloadScreensaverPreset(): void {
  const source = currentScreensaverPreset();
  const stem = state.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52) || 'creature';
  const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${stem}.creature`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setScreensaverStatus(translation.screensaver.exported);
}

function previewScreensaverPreset(): void {
  try {
    localStorage.setItem(CREATURE_SAVER_PREVIEW_KEY, currentScreensaverPreset());
    const preview = window.open('/saver/', '_blank');
    if (!preview) throw new Error('The preview window was blocked.');
    // Keep this same-origin preview isolated while retaining a reliable popup
    // result across browsers (some return null when `noopener` is requested).
    preview.opener = null;
    setScreensaverStatus(translation.status.savedLocally);
  } catch (error) {
    console.error('The screensaver preview could not be opened.', error);
    setScreensaverStatus(translation.screensaver.previewUnavailable);
  }
}

for (const input of [bodyColor, pulseColor]) {
  input.addEventListener('pointerdown', beginInteraction);
  input.addEventListener('input', updatePalette);
  input.addEventListener('change', () => {
    updatePalette();
    finishInteraction();
  });
  input.addEventListener('blur', finishInteraction);
}

previewScreensaver.addEventListener('click', previewScreensaverPreset);
downloadScreensaver.addEventListener('click', downloadScreensaverPreset);

function selectCodeTab(tab: CodeTab, focus = false): void {
  activeCodeTab = tab;
  for (const button of codeTabButtons) {
    const selected = button.dataset.codeView === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  }
  for (const panel of codePanels) panel.hidden = panel.dataset.codePanel !== tab;
}

for (const button of codeTabButtons) {
  button.addEventListener('click', () => selectCodeTab(button.dataset.codeView as CodeTab));
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = codeTabButtons.indexOf(button);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? codeTabButtons.length - 1
        : (current + (event.key === 'ArrowLeft' ? -1 : 1) + codeTabButtons.length) % codeTabButtons.length;
    selectCodeTab(codeTabButtons[next].dataset.codeView as CodeTab, true);
  });
}

function setEditorStatus(message: string, error = false): void {
  webglStatus.textContent = message;
  webglStatus.title = message;
  webglStatus.classList.toggle('is-error', error);
}

function applyWebGLDraft(): boolean {
  if (!webglDraftDirty && webglCode.value === codeSources.webgl) {
    setEditorStatus(translation.code.synchronised);
    return true;
  }
  const result = parseEditableWebGL(webglCode.value, state.genome);
  if (!result.ok) {
    const diagnostic = result.diagnostics[0];
    setEditorStatus(
      `${translation.code.invalid} ${diagnostic.line}:${diagnostic.column} · ${diagnostic.message}`,
      true,
    );
    return false;
  }
  const applied = applyState({
    ...state,
    morph: result.state.morph,
    palette: result.state.palette,
    customMorph: result.state.customMorph,
  });
  if (!applied) return false;
  webglDraftDirty = false;
  setEditorStatus(translation.code.applied);
  return true;
}

webglCode.addEventListener('input', () => {
  webglDraftDirty = true;
  setEditorStatus(translation.code.pending);
});
runWebgl.addEventListener('click', () => {
  applyWebGLDraft();
});

resetWebgl.addEventListener('click', () => {
  webglDraftDirty = false;
  if (applyState({ ...state, customMorph: IDENTITY_CUSTOM_MORPH })) {
    setEditorStatus(translation.code.synchronised);
  }
});

copyCode.addEventListener('click', async () => {
  const value = activeCodeTab === 'wolfram'
    ? codeSources.wolfram
    : activeCodeTab === 'p5js'
      ? codeSources.p5js
      : webglCode.value;
  window.clearTimeout(copyFeedbackTimer);
  try {
    await writeClipboardText(value);
    copyCode.textContent = translation.code.copied;
  } catch {
    copyCode.textContent = translation.code.copyFailed;
  }
  copyFeedbackTimer = window.setTimeout(() => {
    copyCode.textContent = translation.code.copy;
  }, 1_350);
});

generateButton.addEventListener('click', () => {
  showGeneratedSafely((seed) => generateCreature(seed, undefined, state.genome.family));
});

varyButton.addEventListener('click', () => {
  showGeneratedSafely((requestedSeed) => {
    let seed = requestedSeed;
    if (evolutionMode === 'close') return generateRelatedCreature(state.genome, seed);
    if (evolutionMode === 'strange') return generateCreature(seed, undefined, state.genome.family);

    let generated = generateCreature(seed, state.genome.family);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const sameModules = generated.genome.modules.every((module, index) => module === state.genome.modules[index]);
      const sameDevelopment = generated.genome.development[0] === state.genome.development[0];
      if (!sameModules || !sameDevelopment) break;
      seed = deriveVariationSeed(seed);
      generated = generateCreature(seed, state.genome.family);
    }
    return generated;
  }, true, deriveVariationSeed(state.genome.seed));
});

undoButton.addEventListener('click', () => {
  const previous = undoStack.pop();
  if (!previous) return;
  if (!applyState(previous, false)) {
    undoStack.push(previous);
    undoButton.disabled = false;
    return;
  }
  renderedMorph = { ...state.morph };
});

resetButton.addEventListener('click', () => {
  applyState({
    ...state,
    morph: { ...DEFAULT_MORPH },
    palette: { ...state.generatedPalette },
  });
});

function drawFrame(now: number): void {
  const deltaSeconds = document.hidden ? 0 : Math.min(0.05, Math.max(0, (now - previousFrame) / 1_000));
  previousFrame = now;
  const reducedMotion = motionPreference.matches;
  if (!reducedMotion) elapsedSeconds += deltaSeconds;
  const easing = reducedMotion ? 1 : 1 - Math.exp(-deltaSeconds * 8);

  for (const control of MORPH_CONTROLS) {
    renderedMorph[control.key] += (state.morph[control.key] - renderedMorph[control.key]) * easing;
  }

  if (now - frameMeasureTimer >= 190) {
    targetFrame = measureCurrentFrame(renderedMorph, elapsedSeconds);
    frameMeasureTimer = now;
  }
  const frameSpeed = targetFrame.scale < renderedFrame.scale ? 9 : 3.4;
  const frameEasing = reducedMotion ? 1 : 1 - Math.exp(-deltaSeconds * frameSpeed);
  renderedFrame = interpolateBuilderFrame(renderedFrame, targetFrame, frameEasing);

  renderer?.render(
    state.genome,
    renderedMorph,
    state.palette,
    elapsedSeconds,
    renderedFrame,
    state.museumSource,
  );
  animationFrame = window.requestAnimationFrame(drawFrame);
}

document.addEventListener('visibilitychange', () => {
  previousFrame = performance.now();
});
window.addEventListener(
  'pagehide',
  (event) => {
    if (event.persisted) return;
    window.cancelAnimationFrame(animationFrame);
    renderer?.dispose();
  },
);
window.addEventListener('pageshow', () => {
  previousFrame = performance.now();
  syncMobileHeaderVisibility();
});
mobileLayoutPreference.addEventListener('change', syncResponsiveLayout);

syncView();
if (initialMuseumTransfer) storeState();
selectCodeTab('wolfram');
const initialCompile = installCustomMorph(codeSources.webglInjection);
if (!initialCompile.ok) {
  setEditorStatus(translation.code.compileFailed(initialCompile.error), true);
} else {
  setEditorStatus(translation.code.synchronised);
}
animationFrame = window.requestAnimationFrame(drawFrame);
