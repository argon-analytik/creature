import type { BuilderPalette, CreatureGenome, MorphState } from './builder-model';
import type { BuilderFrame } from './builder-framing';
import { buildMuseumEquationShaderSource, type MuseumTransfer } from './museum-transfer';
import { createPointIndices, MAX_POINTS } from './sampling';
import { hexToRgba } from './school';

const DEFAULT_CUSTOM_MORPH_INJECTION = `float safeMorphDiv(float numerator, float denominator) {
  return numerator * denominator / max(denominator * denominator, 0.000001);
}

vec2 customMorph(vec2 point, float u, float time) {
  return point;
}`;

const MUSEUM_EQUATION_SHADER_SOURCE = buildMuseumEquationShaderSource();

const vertexShaderTemplate = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in float aVertexIndex;

uniform vec2 uViewport;
uniform float uTime;
uniform float uDevicePixelRatio;
uniform float uPointCount;
uniform float uSourcePointCount;
uniform int uFamily;
uniform int uMuseumVariant;
uniform ivec4 uModules;
uniform vec4 uP0;
uniform vec4 uP1;
uniform vec4 uP2;
uniform vec4 uP3;
uniform vec4 uP4;
uniform vec4 uP5;
uniform vec4 uView;
uniform vec4 uDevelopment;
uniform vec4 uMorphA;
uniform vec4 uMorphB;
uniform vec4 uMorphC;
uniform vec4 uMorphD;
uniform vec4 uBodyColor;
uniform vec4 uPulseColor;
uniform vec3 uFrame;
uniform vec4 uScreenPose;

out vec4 vColor;

#define p0 uP0.x
#define p1 uP0.y
#define p2 uP0.z
#define p3 uP0.w
#define p4 uP1.x
#define p5 uP1.y
#define p6 uP1.z
#define p7 uP1.w
#define p8 uP2.x
#define p9 uP2.y
#define p10 uP2.z
#define p11 uP2.w
#define p12 uP3.x
#define p13 uP3.y
#define p14 uP3.z
#define p15 uP3.w
#define p16 uP4.x
#define p17 uP4.y
#define p18 uP4.z
#define p19 uP4.w
#define p20 uP5.x
#define p21 uP5.y
#define p22 uP5.z
#define p23 uP5.w

float safe(float value) {
  if (abs(value) >= 0.0001) return value;
  return value < 0.0 ? -0.0001 : 0.0001;
}

float safePole(float value, float epsilon) {
  return value / (value * value + epsilon * epsilon);
}

${MUSEUM_EQUATION_SHADER_SOURCE}

vec2 evaluateCreature(float index, float time) {
  int carrier = uModules.x;
  int metric = uModules.y;
  int phase = uModules.z;
  int projection = uModules.w;
  float detail = uMorphB.w;
  float t = time * uMorphC.z + uMorphC.y;
  float spread = uMorphA.y;
  float fold = uMorphA.z;
  float lobes = uMorphA.w;
  float interference = uMorphB.z;

  if (uFamily == 0) {
    float x = index + 1.0;
    float y = x / p0;
    float carrierPhase = carrier == 1 ? x / (p3 * 5.5) : y * p3;
    float cross = carrier == 2 ? cos(y / (p5 * 0.85)) : 1.0;
    float k = (p1 + p2 * sin(carrierPhase * detail - t * p4)) * cos(x / p5) * cross;
    float e = y / p6 - p7;
    float d = length(vec2(k, e)) + p22 * sin(y * p23 * detail + t * 0.45);
    float theta = atan(k, e);
    float pole = projection == 1 ? 0.22 * safePole(k, 0.1) : 0.0;
    float nested = sin(y / p12) * k * (p13 + p14 * interference * sin(p15 * e - p16 * d + 2.0 * t));
    float q = p8 * sin(p9 * lobes * theta) + p10 * sin(p11 * k * detail) + pole + nested;
    float c = (p19 * d + p20 * d * d - t * p21) * fold;
    float xOut = q + p17 * spread * cos(c);
    float yOut = q * sin(c) + p18 * d;
    return projection == 0 ? vec2(xOut, yOut) : vec2(xOut, -yOut);
  }

  if (uFamily == 1) {
    float x = mod(index, p0);
    float y = index / p1;
    float cross = carrier == 1 ? cos(y / p4) : 1.0;
    float k = p2 * cos(x / p3) * cross;
    float e = y / p5 - p6;
    float d = (k * k + e * e) / p7 + p8 + (metric == 0 ? 0.13 * sin(t) : 0.0);
    float theta = atan(k, e);
    float lobeCarrier = phase == 0 ? e : 1.0;
    float wave = projection == 0
      ? cos(d * d * p14 * detail - t * p19)
      : sin(d * d * p14 * detail - t * p19);
    float q = p9 - p10 * lobeCarrier * sin(theta * p11 * lobes) / safe(d)
      + k * (p12 + p13 * interference * wave);
    float c = (p16 * d + p17 * e - t * p18) * fold;
    return vec2(q * sin(c) * spread, (q + p15 * d * spread) * cos(c));
  }

  if (uFamily == 2) {
    float y = index / p0;
    float mask = float(int(floor(y)) ^ int(p19));
    float lowEnvelope = p2 + (carrier == 0 ? p2 * sin(mask) : 2.0 * sin(y * 1.7));
    float highEnvelope = carrier == 0 ? p3 + cos(y) : p3 + y * p4 + cos(y / 2.0);
    float envelope = y < p1 ? lowEnvelope : highEnvelope;
    float direction = projection == 0 ? 1.0 : -1.0;
    float k = envelope * cos(index + direction * t * p13);
    float e = y / p5 - p6;
    float d = length(vec2(k, e)) + p7 * sin(e / p8 + direction * t);
    float divisor = metric == 0 ? p9 : safe(d);
    float q = y * k / divisor
      * (p10 + p11 * interference * sin(d * p12 * detail * lobes + y * p14 - 4.0 * t));
    float parity = phase == 0 ? mod(index, 2.0) : 1.0;
    float c = (p17 * d + parity - t * p18) * fold;
    return vec2(q + p15 * spread * cos(c), q * sin(c) + p16 * d);
  }

  if (uFamily == 3) {
    float x = mod(index, p0);
    float y = index / p1;
    float k = x / p2 - p3;
    float e = y / p4 + p5;
    float o = length(vec2(k, e)) / p6;
    float singular = carrier == 0 ? p7 * safePole(k, p8) : p7 * cos(p11 / safe(k));
    float q = p10 * x + p9 + singular
      + o * k * (cos(e * p12 * detail * lobes) / p13 + cos(y / p14) / p15)
        * interference * sin(o * p16 * detail - t * p17);
    float c = (metric == 0 ? o / p18 + e / p19 : o * e / p18) * fold - t / p20;
    if (projection == 0) {
      return vec2(
        q * cos(c) * spread,
        (q + p21) * sin(c) * cos(c) - q / 3.0 + 30.0 * o
      );
    }
    return vec2(
      0.7 * q * sin(c) * spread,
      y / p21 * cos(4.0 * c - t / 2.0) - 0.5 * q * cos(c) * p22
    );
  }

  if (uFamily == 4) {
    float columns = p0;
    float x = 100.0 + mod(index, columns);
    float y = 100.0 + floor(index / columns);
    float k = x / p1 - 25.0;
    float e = y / p1 - 25.0;
    float r = length(vec2(k, e));
    float o = r / p2;
    float d;
    if (carrier == 0) d = p3 * cos(o * p4);
    else if (carrier == 1) {
      o = (r / 11.0) * cos(sin(k / 2.0) * cos(e / 2.0));
      d = p3 * cos(o);
    }
    else d = -p3 * abs(sin(k / 2.0) * cos(e * 0.8));
    d *= interference;
    if (projection == 0) {
      return vec2(
        (x + spread * d * k * p6 * sin(d * p5 * detail * lobes - t) + k * p7 * sin(y / p8 + t)) / 2.0,
        p9 * d + p10 * (d - 2.0) * abs(cos(d / 2.0 - t / 2.0)) + d * e
      );
    }
    if (projection == 1) {
      float c = ((d + o) * p11 - t * p12) * fold;
      return vec2(
        (k * atan(p13 * cos(d * p14 * detail * lobes)) + x / 2.0) * cos(c) * spread,
        (k * d * cos(o - d + t) + y / 2.0) * sin(c)
      );
    }
    if (projection == 2) {
      return vec2(
        (x + spread * d * k * (sin(d * p19 * detail * lobes + t) + sin(y * o * o) / p17)) / p15,
        (y / 3.0 - p16 * d + p17 * cos(d + t)) * p18
      );
    }
    float signedO = 2.0 - r / p2;
    return vec2(
      0.7 * (x - 4.0 * d * k + d * k * sin(d + t)) + 2.0 * k * signedO,
      0.7 * (y - d * y / 5.0 + d * e * cos(d + t + signedO) * sin(t + d)) + e * signedO
    );
  }

  if (uFamily == 5) {
    float x = mod(index, p0);
    float y = index / p1;
    float k = x / p2 - p3;
    float waveA = carrier == 1 ? sin(k) : cos(k);
    float waveB = carrier == 2 ? cos(y / p7) : sin(y / p7);
    float e = p4 * waveA + p5 * waveB + p6 * cos(k / p8);
    float d = abs(e);
    float q = x / p9 + p10
      + d * k * (p11 + p12 * interference * cos(d * p13 * detail * lobes - p14 * t + y / p15));
    float c = (y * e / p16 - t / p17 + d / p18) * fold;
    float echo = projection == 0 ? cos(c / 2.0) : sin(c / 2.0);
    return vec2(
      q * cos(c) * spread,
      (q / 2.0 + p19 * echo) * sin(c) + p20 * e
    );
  }

  float columns = p0;
  float x = 99.0 + mod(index, columns);
  float y = 99.0 + floor(index / columns) * p20;
  float k = x / p2 - p3;
  float e = y / p4 - p5;
  float rho = (k * k + e * e) / p6;
  float z = y * p9 * detail * lobes;
  float cosine = cos(z);
  float sine = sin(z);
  float secant = carrier == 0
    ? cosine / (cosine * cosine + p8 * p8)
    : sine / (sine * sine + p8 * p8);
  float q = x / p11 + p7 * k * secant * sin(rho * rho * p10 - t * p15);
  float c = (rho / p12 - t / p13) * fold;
  float cross = projection == 0
    ? e * sin(rho + k - t) * p17
    : k * cos(rho + e + t) * p17;
  return vec2(
    q * sin(c) * spread + cross,
    (q + y / p18 + rho * p19) * cos(c)
  );
}

vec2 applyDevelopment(vec2 point, float index01, float time) {
  int kind = int(uDevelopment.x + 0.5);
  float amount = uDevelopment.y * uMorphB.y;
  float frequency = uDevelopment.z * (0.82 + 0.18 * uMorphB.w);
  float phase = uDevelopment.w
    + (time * uMorphC.z + uMorphC.y) * 0.16
    + uMorphC.x * 1.57079632679;
  float envelope = sin(3.14159265359 * index01);
  float tension = uMorphB.x;
  float x = point.x * tension;
  float y = point.y / sqrt(tension);

  if (kind == 0) {
    x += amount * sin(frequency * y + phase) * envelope;
    y += amount * 0.45 * cos(frequency * x - phase) * envelope;
  } else if (kind == 1) {
    x *= 1.0 + amount * 1.7 * cos(frequency * y + phase);
    float mirrorSide = x / sqrt(x * x + 0.04);
    y += amount * 0.5 * sin(frequency * abs(x) + phase) * mirrorSide;
  } else if (kind == 2) {
    float flow = sin(frequency * (0.65 * y + 0.35 * x) + phase);
    float counterflow = cos(frequency * (0.55 * x - 0.45 * y) - phase);
    x += amount * flow * (0.3 + abs(y));
    y += amount * 0.24 * counterflow * (0.3 + abs(x));
  } else if (kind == 3) {
    float orbit = frequency * 6.28318530718 * index01;
    x += amount * sin(orbit + phase) * (0.35 + abs(y));
    y += amount * 0.55 * cos(orbit - phase) * (0.25 + abs(x));
  } else if (kind == 4) {
    x += amount * sin(frequency * y + phase) * cos(frequency * 0.5 * x - phase);
    y += amount * 0.7 * sin(frequency * x - phase) * cos(frequency * 0.5 * y + phase);
  } else {
    float angle = atan(y, x);
    float radius = length(vec2(x, y));
    float appendages = floor(clamp(frequency, 2.0, 9.0) + 0.5);
    float growth = min(0.28, amount * 2.15) * envelope * envelope;
    float chirality = min(0.32, amount * 2.4) * envelope * envelope;
    float nextRadius = radius * (1.0 + growth * cos(appendages * angle + phase));
    float nextAngle = angle + chirality * sin((appendages - 1.0) * angle - phase);
    x = nextRadius * cos(nextAngle);
    y = nextRadius * sin(nextAngle);
  }

  x += uMorphC.x * amount * 0.35 * envelope;

  float directionCode = float(uFamily + uModules.x + uModules.y + uModules.z + uModules.w);
  float direction = mod(directionCode, 2.0) < 0.5 ? -1.0 : 1.0;
  float gesture = uMorphD.x;
  float bend = direction * amount * (0.65 + 0.35 * abs(gesture));
  float sCurve = amount * 0.72 * gesture;
  float segments = 1.0 + mod(floor(uDevelopment.z), 3.0);
  float derivativeLimit = 3.14159265359 * abs(bend)
    + segments * 3.14159265359 * abs(sCurve);
  if (derivativeLimit > 0.86) {
    float reduction = 0.86 / derivativeLimit;
    bend *= reduction;
    sCurve *= reduction;
  }
  float spinePosition = clamp(y + 0.5, 0.0, 1.0);
  float centreline = bend * sin(3.14159265359 * spinePosition + uDevelopment.w)
    + sCurve * sin(segments * 3.14159265359 * spinePosition - uDevelopment.w);
  float slope = 3.14159265359 * bend * cos(3.14159265359 * spinePosition + uDevelopment.w)
    + segments * 3.14159265359 * sCurve
      * cos(segments * 3.14159265359 * spinePosition - uDevelopment.w);
  float normalX = inversesqrt(1.0 + slope * slope);
  return vec2(centreline + x * normalX, y - x * slope * normalX);
}

/*__CUSTOM_MORPH__*/

void main() {
  float index01 = aVertexIndex / max(1.0, uPointCount - 1.0);
  float sourceIndex = floor(index01 * max(1.0, uSourcePointCount - 1.0) + 0.5);
  bool isMuseumStudy = uMuseumVariant >= 0;
  float equationTime = museumSourceTime(uMuseumVariant, uTime * uMorphC.z, uMorphC.y);
  vec2 raw = isMuseumStudy
    ? evaluateMuseumCreature(uMuseumVariant, sourceIndex, equationTime)
    : evaluateCreature(sourceIndex, uTime);
  vec2 archiveCenter = uMuseumVariant == 0 ? vec2(200.0, 190.0) : vec2(200.0);
  vec2 local = isMuseumStudy
    ? (raw - archiveCenter) / 160.0 * 0.45
    : (raw - uView.xy) * uView.z;
  if (isMuseumStudy) local.x *= uMorphA.y;
  local = applyDevelopment(local, index01, uTime);
  local = customMorph(local, index01, uTime) * uMorphA.x;
  local = (local - uFrame.xy) * uFrame.z;

  float poseCos = cos(uScreenPose.z);
  float poseSin = sin(uScreenPose.z);
  local = mat2(poseCos, -poseSin, poseSin, poseCos) * local * uScreenPose.w;
  float scale = min(uViewport.x, uViewport.y) * 0.72;
  vec2 screenPosition = uViewport * uScreenPose.xy + local * scale;
  vec2 clipPosition = screenPosition / uViewport * 2.0 - 1.0;
  clipPosition.y *= -1.0;
  gl_Position = vec4(clipPosition, 0.0, 1.0);

  float sourceIdentity = isMuseumStudy ? float(uMuseumVariant) : float(uFamily);
  float pulseCentre = fract(uTime * 0.09 + sourceIdentity * 0.117 + uView.w);
  float pulseDistance = abs(fract(index01 - pulseCentre + 0.5) - 0.5);
  float pulseWidth = uMorphC.w;
  float pulse = 1.0 - smoothstep(0.045 * pulseWidth, 0.072 * pulseWidth, pulseDistance);
  float variation = 0.75 + 0.25 * sin(sourceIndex * 0.071 + uView.w * 71.0);
  if (uMuseumVariant == 21) {
    float edgeK = 4.0 * cos(sourceIndex / 21.0);
    float outside = step(15.0, edgeK * edgeK);
    float colourPhase = sin(equationTime);
    pulse = outside * colourPhase * colourPhase;
  }
  vColor = mix(uBodyColor, uPulseColor, pulse);
  vColor.a *= mix(variation, 1.0, pulse);
  gl_PointSize = clamp(uDevicePixelRatio * mix(1.05, 2.7, pulse), 1.0, 6.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec4 vColor;
out vec4 outColor;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radius = length(point);
  if (radius > 1.0) discard;
  float edge = 1.0 - smoothstep(0.52, 1.0, radius);
  float core = 1.0 - smoothstep(0.0, 0.38, radius);
  outColor = vec4(vColor.rgb * mix(0.9, 1.08, core), vColor.a * edge);
}
`;

interface Uniforms {
  readonly viewport: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
  readonly devicePixelRatio: WebGLUniformLocation;
  readonly pointCount: WebGLUniformLocation;
  readonly sourcePointCount: WebGLUniformLocation;
  readonly family: WebGLUniformLocation;
  readonly museumVariant: WebGLUniformLocation;
  readonly modules: WebGLUniformLocation;
  readonly parameters: readonly WebGLUniformLocation[];
  readonly view: WebGLUniformLocation;
  readonly development: WebGLUniformLocation;
  readonly morphA: WebGLUniformLocation;
  readonly morphB: WebGLUniformLocation;
  readonly morphC: WebGLUniformLocation;
  readonly morphD: WebGLUniformLocation;
  readonly bodyColor: WebGLUniformLocation;
  readonly pulseColor: WebGLUniformLocation;
  readonly frame: WebGLUniformLocation;
  readonly screenPose: WebGLUniformLocation;
}

/** A rigid screen-space pose. It deliberately cannot stretch or shear a form. */
export interface BuilderRenderPose {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly scale: number;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate a WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  customMorphInjection = DEFAULT_CUSTOM_MORPH_INJECTION,
): WebGLProgram {
  const vertexShaderSource = vertexShaderTemplate.replace('/*__CUSTOM_MORPH__*/', customMorphInjection);
  let vertexShader: WebGLShader | undefined;
  let fragmentShader: WebGLShader | undefined;
  let program: WebGLProgram | undefined;
  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = gl.createProgram() ?? undefined;
    if (!program) throw new Error('Unable to allocate a WebGL program.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Unknown shader linking error.');
    }
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }
}

function requireUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Required WebGL uniform ${name} is unavailable.`);
  return location;
}

export class BuilderRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly onStateChange: (state: 'ready' | 'lost' | 'unsupported') => void;
  private program!: WebGLProgram;
  private vertexArray!: WebGLVertexArrayObject;
  private pointBuffer!: WebGLBuffer;
  private uniforms!: Uniforms;
  private contextLost = false;
  private customMorphInjection = DEFAULT_CUSTOM_MORPH_INJECTION;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: 'ready' | 'lost' | 'unsupported') => void,
  ) {
    this.canvas = canvas;
    this.onStateChange = onStateChange;
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!context) {
      onStateChange('unsupported');
      throw new Error('WebGL 2 is not supported by this browser.');
    }
    this.gl = context;
    this.initialiseResources();
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    onStateChange('ready');
  }

  render(
    genome: CreatureGenome,
    morph: MorphState,
    palette: BuilderPalette,
    elapsedSeconds: number,
    frame?: Pick<BuilderFrame, 'centerX' | 'centerY' | 'scale'>,
    museumSource?: Pick<MuseumTransfer, 'variant' | 'pointCount'>,
    pose?: BuilderRenderPose,
  ): void {
    if (this.contextLost) return;
    this.resize();
    const gl = this.gl;
    const sourcePointCount = museumSource?.pointCount ?? genome.sourcePointCount;
    const pointCount = Math.min(Math.round(morph.density), sourcePointCount, MAX_POINTS);
    const body = hexToRgba(palette.body, 0.74);
    const pulse = hexToRgba(palette.pulse, 0.98);
    const parameters = Array.from({ length: 24 }, (_, index) => genome.parameters[index] ?? 0);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vertexArray);
    gl.uniform2f(this.uniforms.viewport, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time, elapsedSeconds);
    gl.uniform1f(this.uniforms.devicePixelRatio, Math.min(window.devicePixelRatio || 1, 2));
    gl.uniform1f(this.uniforms.pointCount, pointCount);
    gl.uniform1f(this.uniforms.sourcePointCount, sourcePointCount);
    gl.uniform1i(this.uniforms.family, genome.family);
    gl.uniform1i(this.uniforms.museumVariant, museumSource?.variant ?? -1);
    gl.uniform4i(this.uniforms.modules, ...genome.modules);
    for (let group = 0; group < this.uniforms.parameters.length; group += 1) {
      gl.uniform4f(
        this.uniforms.parameters[group],
        parameters[group * 4],
        parameters[group * 4 + 1],
        parameters[group * 4 + 2],
        parameters[group * 4 + 3],
      );
    }
    gl.uniform4f(
      this.uniforms.view,
      genome.centerX,
      genome.centerY,
      genome.normalization,
      (genome.seed % 10_000) / 10_000,
    );
    gl.uniform4f(this.uniforms.development, ...genome.development);
    gl.uniform4f(this.uniforms.morphA, morph.scale, morph.reach, morph.fold, morph.lobes);
    gl.uniform4f(this.uniforms.morphB, morph.tension, morph.mutation, morph.resonance, morph.texture);
    gl.uniform4f(this.uniforms.morphC, morph.polarity, morph.phase, morph.motion, morph.pulse);
    gl.uniform4f(this.uniforms.morphD, morph.gesture, 0, 0, 0);
    gl.uniform4f(this.uniforms.bodyColor, ...body);
    gl.uniform4f(this.uniforms.pulseColor, ...pulse);
    gl.uniform3f(
      this.uniforms.frame,
      frame?.centerX ?? 0,
      frame?.centerY ?? 0,
      frame?.scale ?? 1,
    );
    gl.uniform4f(
      this.uniforms.screenPose,
      pose?.x ?? 0.5,
      pose?.y ?? 0.5,
      pose?.angle ?? 0,
      pose?.scale ?? 1,
    );
    gl.drawArrays(gl.POINTS, 0, pointCount);
    gl.bindVertexArray(null);
  }

  setCustomMorph(customMorphInjection: string): { readonly ok: true } | { readonly ok: false; readonly error: string } {
    // Uniform-only state changes do not need a shader swap. Treat an already
    // installed program as available even while a temporarily lost context is
    // waiting to restore its resources.
    if (customMorphInjection === this.customMorphInjection) return { ok: true };
    if (this.contextLost) {
      return { ok: false, error: 'The WebGL context is currently unavailable.' };
    }
    const gl = this.gl;
    let nextProgram: WebGLProgram | undefined;
    try {
      nextProgram = createProgram(gl, customMorphInjection);
      const nextUniforms = this.resolveUniforms(nextProgram);
      const previousProgram = this.program;
      this.program = nextProgram;
      this.uniforms = nextUniforms;
      this.customMorphInjection = customMorphInjection;
      gl.deleteProgram(previousProgram);
      return { ok: true };
    } catch (error) {
      if (nextProgram) gl.deleteProgram(nextProgram);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown WebGL compilation error.',
      };
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.deleteResources();
  }

  private initialiseResources(): void {
    const gl = this.gl;
    this.program = createProgram(gl, this.customMorphInjection);
    this.uniforms = this.resolveUniforms(this.program);
    const vertexArray = gl.createVertexArray();
    const pointBuffer = gl.createBuffer();
    if (!vertexArray || !pointBuffer) throw new Error('Unable to allocate WebGL buffers.');
    this.vertexArray = vertexArray;
    this.pointBuffer = pointBuffer;
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, createPointIndices(MAX_POINTS), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.clearColor(0, 0, 0, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private resolveUniforms(program: WebGLProgram): Uniforms {
    const gl = this.gl;
    return {
      viewport: requireUniform(gl, program, 'uViewport'),
      time: requireUniform(gl, program, 'uTime'),
      devicePixelRatio: requireUniform(gl, program, 'uDevicePixelRatio'),
      pointCount: requireUniform(gl, program, 'uPointCount'),
      sourcePointCount: requireUniform(gl, program, 'uSourcePointCount'),
      family: requireUniform(gl, program, 'uFamily'),
      museumVariant: requireUniform(gl, program, 'uMuseumVariant'),
      modules: requireUniform(gl, program, 'uModules'),
      parameters: ['uP0', 'uP1', 'uP2', 'uP3', 'uP4', 'uP5'].map((name) => requireUniform(gl, program, name)),
      view: requireUniform(gl, program, 'uView'),
      development: requireUniform(gl, program, 'uDevelopment'),
      morphA: requireUniform(gl, program, 'uMorphA'),
      morphB: requireUniform(gl, program, 'uMorphB'),
      morphC: requireUniform(gl, program, 'uMorphC'),
      morphD: requireUniform(gl, program, 'uMorphD'),
      bodyColor: requireUniform(gl, program, 'uBodyColor'),
      pulseColor: requireUniform(gl, program, 'uPulseColor'),
      frame: requireUniform(gl, program, 'uFrame'),
      screenPose: requireUniform(gl, program, 'uScreenPose'),
    };
  }

  private deleteResources(): void {
    if (this.pointBuffer) this.gl.deleteBuffer(this.pointBuffer);
    if (this.vertexArray) this.gl.deleteVertexArray(this.vertexArray);
    if (this.program) this.gl.deleteProgram(this.program);
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.onStateChange('lost');
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    try {
      this.initialiseResources();
      this.onStateChange('ready');
    } catch (error) {
      this.contextLost = true;
      console.error(error);
      this.onStateChange('unsupported');
    }
  };
}
