import type { Creature } from './school';
import { createPointIndices, MAX_POINTS } from './sampling';
import { fragmentShaderSource, vertexShaderSource } from './shaders';

const MAX_VISIBLE_CREATURES = 10;

type RendererState = 'ready' | 'lost' | 'unsupported';

export interface RendererOptions {
  pointDensity: number;
  maxDevicePixelRatio: number;
  onStateChange?: (state: RendererState) => void;
}

interface Uniforms {
  viewport: WebGLUniformLocation;
  time: WebGLUniformLocation;
  devicePixelRatio: WebGLUniformLocation;
  pointCount: WebGLUniformLocation;
  sampleCount: WebGLUniformLocation;
  variant: WebGLUniformLocation;
  pose: WebGLUniformLocation;
  motion: WebGLUniformLocation;
  baseColor: WebGLUniformLocation;
  pulseColor: WebGLUniformLocation;
  opacity: WebGLUniformLocation;
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

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to allocate a WebGL program.');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown shader linking error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function requireUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (location === null) {
    throw new Error('Required WebGL uniform ' + name + ' is unavailable.');
  }
  return location;
}

export class CreatureRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly gl: WebGL2RenderingContext;
  private readonly pointDensity: number;
  private readonly maxDevicePixelRatio: number;
  private readonly onStateChange?: (state: RendererState) => void;

  private program!: WebGLProgram;
  private uniforms!: Uniforms;
  private vertexArray!: WebGLVertexArrayObject;
  private pointBuffer!: WebGLBuffer;
  private contextLost = false;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions) {
    this.canvas = canvas;
    this.pointDensity = Math.max(0.2, Math.min(options.pointDensity, 1));
    this.maxDevicePixelRatio = Math.max(1, options.maxDevicePixelRatio);
    this.onStateChange = options.onStateChange;

    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!context) {
      options.onStateChange?.('unsupported');
      throw new Error('WebGL 2 is not supported by this browser.');
    }

    this.gl = context;
    this.initialiseResources();
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.onStateChange?.('ready');
  }

  render(creatures: readonly Creature[], elapsedSeconds: number): void {
    if (this.contextLost) return;

    this.resize();
    const gl = this.gl;
    const visible = creatures
      .filter((creature) => creature.opacity > 0.012)
      .sort((first, second) => first.opacity - second.opacity)
      .slice(-MAX_VISIBLE_CREATURES);

    gl.bindVertexArray(this.vertexArray);
    gl.useProgram(this.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.uniforms.viewport, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time, elapsedSeconds);
    gl.uniform1f(
      this.uniforms.devicePixelRatio,
      Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio),
    );

    for (const creature of visible) {
      const sampleCount = Math.max(
        1_200,
        Math.min(MAX_POINTS, Math.round(creature.pointCount * this.pointDensity)),
      );
      const [baseRed, baseGreen, baseBlue, baseAlpha] = creature.baseColor;
      const [pulseRed, pulseGreen, pulseBlue, pulseAlpha] = creature.pulseColor;

      gl.uniform1f(this.uniforms.pointCount, creature.pointCount);
      gl.uniform1f(this.uniforms.sampleCount, sampleCount);
      gl.uniform1i(this.uniforms.variant, creature.variant);
      gl.uniform4f(this.uniforms.pose, creature.x, creature.y, creature.size, 0);
      gl.uniform4f(
        this.uniforms.motion,
        creature.phase,
        creature.pulseSpeed,
        creature.pulseOffset,
        creature.pulseWidth,
      );
      gl.uniform4f(this.uniforms.baseColor, baseRed, baseGreen, baseBlue, baseAlpha);
      gl.uniform4f(this.uniforms.pulseColor, pulseRed, pulseGreen, pulseBlue, pulseAlpha);
      gl.uniform1f(this.uniforms.opacity, creature.opacity);
      gl.drawArrays(gl.POINTS, 0, sampleCount);
    }
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.deleteResources();
  }

  private initialiseResources(): void {
    const gl = this.gl;
    this.program = createProgram(gl);
    this.uniforms = {
      viewport: requireUniform(gl, this.program, 'uViewport'),
      time: requireUniform(gl, this.program, 'uTime'),
      devicePixelRatio: requireUniform(gl, this.program, 'uDevicePixelRatio'),
      pointCount: requireUniform(gl, this.program, 'uPointCount'),
      sampleCount: requireUniform(gl, this.program, 'uSampleCount'),
      variant: requireUniform(gl, this.program, 'uVariant'),
      pose: requireUniform(gl, this.program, 'uPose'),
      motion: requireUniform(gl, this.program, 'uMotion'),
      baseColor: requireUniform(gl, this.program, 'uBaseColor'),
      pulseColor: requireUniform(gl, this.program, 'uPulseColor'),
      opacity: requireUniform(gl, this.program, 'uOpacity'),
    };

    const vertexArray = gl.createVertexArray();
    const pointBuffer = gl.createBuffer();
    if (!vertexArray || !pointBuffer) throw new Error('Unable to allocate the WebGL buffers.');

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

  private deleteResources(): void {
    const gl = this.gl;
    if (this.pointBuffer) gl.deleteBuffer(this.pointBuffer);
    if (this.vertexArray) gl.deleteVertexArray(this.vertexArray);
    if (this.program) gl.deleteProgram(this.program);
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
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
    this.onStateChange?.('lost');
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    try {
      this.initialiseResources();
      this.onStateChange?.('ready');
    } catch (error) {
      this.contextLost = true;
      console.error(error);
      this.onStateChange?.('unsupported');
    }
  };
}
