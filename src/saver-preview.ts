import './saver-preview.css';
import { evaluateCustomMorph, formatWebGLInjection } from './builder-code';
import { measureBuilderFrame, type BuilderFrame } from './builder-framing';
import { BuilderRenderer } from './builder-renderer';
import { sampleScreenSaverPose } from './saver-motion';
import {
  CREATURE_SAVER_PREVIEW_KEY,
  parseCreatureSaverPreset,
  type CreatureSaverPreset,
} from './saver-preset';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required screensaver element ${selector} was not found.`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#saver-canvas');
const renderStatus = requireElement<HTMLParagraphElement>('#saver-render-status');
const name = requireElement<HTMLElement>('#saver-name');
const reverseButton = requireElement<HTMLButtonElement>('#saver-reverse');
const fullscreenButton = requireElement<HTMLButtonElement>('#saver-fullscreen');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function readPreset(): CreatureSaverPreset | undefined {
  try {
    return parseCreatureSaverPreset(localStorage.getItem(CREATURE_SAVER_PREVIEW_KEY) ?? '');
  } catch {
    return undefined;
  }
}

const preset = readPreset();
if (!preset) {
  renderStatus.hidden = false;
  renderStatus.textContent = 'Open this preview from Morphospace after choosing a specimen.';
  reverseButton.hidden = true;
  fullscreenButton.hidden = true;
} else {
  name.textContent = preset.specimen.name;
}

let renderer: BuilderRenderer | undefined;
let reversed = false;
let start = performance.now();
let animationFrame = 0;
let measuredFrame: BuilderFrame | undefined;
let nextFrameMeasurement = 0;

function setRenderState(next: 'ready' | 'lost' | 'unsupported'): void {
  if (next === 'ready') {
    document.body.classList.add('is-rendering');
    renderStatus.hidden = true;
    return;
  }
  document.body.classList.remove('is-rendering');
  renderStatus.hidden = false;
  renderStatus.textContent = next === 'lost'
    ? 'The graphics context was interrupted. The preview will return automatically.'
    : 'This preview needs a browser with WebGL 2 support.';
}

if (preset) {
  try {
    renderer = new BuilderRenderer(canvas, setRenderState);
    const morphResult = renderer.setCustomMorph(formatWebGLInjection(preset.specimen.customMorph));
    if (!morphResult.ok) throw new Error(morphResult.error);
  } catch (error) {
    console.error(error);
    setRenderState('unsupported');
  }
}

function render(now: number): void {
  if (!preset || !renderer) return;
  const aspect = Math.max(0.1, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  const seconds = reducedMotion.matches
    ? 0.42 / preset.locomotion.speed
    : (now - start) / 1_000;
  const pose = sampleScreenSaverPose(
    preset.locomotion,
    seconds,
    aspect,
    preset.presentation.scale,
    reversed,
  );
  if (!measuredFrame || now >= nextFrameMeasurement) {
    measuredFrame = measureBuilderFrame(
      preset.specimen.genome,
      preset.specimen.morph,
      seconds * preset.locomotion.cadence,
      {
        pointTransform: (point, index01, frameTime) => (
          evaluateCustomMorph(preset.specimen.customMorph, point, index01, frameTime)
        ),
      },
    );
    nextFrameMeasurement = now + 260;
  }
  renderer.render(
    preset.specimen.genome,
    preset.specimen.morph,
    preset.specimen.palette,
    seconds * preset.locomotion.cadence,
    measuredFrame,
    undefined,
    pose,
  );
  animationFrame = window.requestAnimationFrame(render);
}

reverseButton.addEventListener('click', () => {
  reversed = !reversed;
  reverseButton.setAttribute('aria-pressed', String(reversed));
  reverseButton.textContent = reversed ? 'Use inferred direction' : 'Reverse direction';
});

fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    console.error('Fullscreen was unavailable.', error);
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) start = performance.now();
});
window.addEventListener('pagehide', () => {
  window.cancelAnimationFrame(animationFrame);
  renderer?.dispose();
});

if (preset && renderer) animationFrame = window.requestAnimationFrame(render);
