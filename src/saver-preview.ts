import './saver-preview.css';
import { evaluateCustomMorph, formatWebGLInjection } from './builder-code';
import { measureBuilderFrame } from './builder-framing';
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
let elapsedSeconds = preset ? 0.14 / Math.max(0.0001, preset.locomotion.speed) : 0;
let previousFrame = performance.now();
let animationFrame = 0;

// A screen saver should never appear to twitch because its camera is chasing
// a changing point cloud. Measure several phases once and keep that shared
// frame for the complete preview. The creature may still deform and swim, but
// its presentation remains spatially coherent.
const measuredFrame = preset
  ? measureBuilderFrame(
      preset.specimen.genome,
      preset.specimen.morph,
      0,
      {
        sampleCount: 1_024,
        timeOffsets: [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3],
        fitSpan: 1,
        pointTransform: (point, index01, frameTime) => (
          evaluateCustomMorph(preset.specimen.customMorph, point, index01, frameTime)
        ),
      },
    )
  : undefined;

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
  const deltaSeconds = document.hidden
    ? 0
    : Math.min(0.05, Math.max(0, (now - previousFrame) / 1_000));
  previousFrame = now;
  if (!reducedMotion.matches) elapsedSeconds += deltaSeconds;
  const aspect = Math.max(0.1, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  const seconds = reducedMotion.matches
    ? 0.42 / preset.locomotion.speed
    : elapsedSeconds;
  const pose = sampleScreenSaverPose(
    preset.locomotion,
    seconds,
    aspect,
    preset.presentation.scale,
    reversed,
  );
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
  previousFrame = performance.now();
});
window.addEventListener('pagehide', () => {
  window.cancelAnimationFrame(animationFrame);
  renderer?.dispose();
});

if (preset && renderer) animationFrame = window.requestAnimationFrame(render);
