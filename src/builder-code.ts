import {
  MORPH_CONTROLS,
  MORPH_KEYS,
  formatBuilderEquation,
  type BuilderPalette,
  type CreatureGenome,
  type MorphKey,
  type MorphState,
} from './builder-model';

const CUSTOM_COORDINATE_LIMIT = 1.75;
const MAX_ASSIGNMENTS = 12;
const MAX_EXPRESSION_DEPTH = 12;
const MAX_EXPRESSION_NODES = 96;
const MAX_LITERAL_MAGNITUDE = 1_000;

type CustomVariable = 'x' | 'y' | 'u' | 'time';
type CustomFunction = 'sin' | 'cos' | 'abs' | 'sqrt';

export type CustomMorphExpression =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'variable'; readonly name: CustomVariable }
  | {
      readonly kind: 'unary';
      readonly operator: '+' | '-';
      readonly argument: CustomMorphExpression;
    }
  | {
      readonly kind: 'binary';
      readonly operator: '+' | '-' | '*' | '/';
      readonly left: CustomMorphExpression;
      readonly right: CustomMorphExpression;
    }
  | {
      readonly kind: 'call';
      readonly name: CustomFunction;
      readonly argument: CustomMorphExpression;
    };

export interface CustomMorphAssignment {
  readonly target: 'x' | 'y';
  readonly expression: CustomMorphExpression;
}

export interface CustomMorphProgram {
  readonly assignments: readonly CustomMorphAssignment[];
}

export interface BuilderCodeState {
  readonly morph: MorphState;
  readonly palette: BuilderPalette;
  readonly customMorph: CustomMorphProgram;
}

export interface BuilderCodeSources {
  /** The mathematical source plus the translated editable transform. */
  readonly wolfram: string;
  /** A complete p5.js global-mode sketch for the selected specimen. */
  readonly p5js: string;
  /** The intentionally small, user-editable source shown by the builder. */
  readonly webgl: string;
  /** Sanitised helper + function, ready to inject into a WebGL 2 vertex shader. */
  readonly webglInjection: string;
}

export interface BuilderCodeDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export type BuilderCodeParseResult =
  | {
      readonly ok: true;
      readonly state: BuilderCodeState;
      readonly sources: BuilderCodeSources;
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly BuilderCodeDiagnostic[];
    };

export const IDENTITY_CUSTOM_MORPH: CustomMorphProgram = Object.freeze({
  assignments: Object.freeze([]),
});

interface CustomMorphVariables {
  x: number;
  y: number;
  readonly u: number;
  readonly time: number;
}

function evaluateExpression(
  expression: CustomMorphExpression,
  variables: CustomMorphVariables,
): number {
  if (expression.kind === 'number') return expression.value;
  if (expression.kind === 'variable') return variables[expression.name];
  if (expression.kind === 'unary') {
    const value = evaluateExpression(expression.argument, variables);
    return expression.operator === '-' ? -value : value;
  }
  if (expression.kind === 'binary') {
    const left = evaluateExpression(expression.left, variables);
    const right = evaluateExpression(expression.right, variables);
    if (expression.operator === '+') return left + right;
    if (expression.operator === '-') return left - right;
    if (expression.operator === '*') return left * right;
    return left * right / Math.max(right * right, 0.000001);
  }
  const argument = evaluateExpression(expression.argument, variables);
  if (expression.name === 'sin') return Math.sin(argument);
  if (expression.name === 'cos') return Math.cos(argument);
  if (expression.name === 'abs') return Math.abs(argument);
  return Math.sqrt(Math.abs(argument));
}

function softenCustomCoordinate(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude <= CUSTOM_COORDINATE_LIMIT) return value;
  const direction = value < 0 ? -1 : 1;
  return direction * (
    CUSTOM_COORDINATE_LIMIT
    + CUSTOM_COORDINATE_LIMIT * Math.log1p(
      (magnitude - CUSTOM_COORDINATE_LIMIT) / CUSTOM_COORDINATE_LIMIT,
    )
  );
}

/** Mirrors the sanitised shader transform for CPU framing and previews. */
export function evaluateCustomMorph(
  program: CustomMorphProgram,
  point: Readonly<{ x: number; y: number }>,
  u: number,
  time: number,
): Readonly<{ x: number; y: number }> {
  const variables: CustomMorphVariables = { x: point.x, y: point.y, u, time };
  for (const assignment of program.assignments) {
    variables[assignment.target] = evaluateExpression(assignment.expression, variables);
  }
  if (!Number.isFinite(variables.x) || !Number.isFinite(variables.y)) return point;
  return {
    x: softenCustomCoordinate(variables.x),
    y: softenCustomCoordinate(variables.y),
  };
}

const MORPH_CONSTANTS = Object.fromEntries(
  MORPH_KEYS.map((key) => [`MORPH_${key.toUpperCase()}`, key]),
) as Readonly<Record<string, MorphKey>>;

function formatNumber(value: number): string {
  if (Object.is(value, -0)) return '0.0';
  if (Number.isInteger(value)) return `${value}.0`;
  const absolute = Math.abs(value);
  if (absolute > 0 && (absolute < 0.0001 || absolute >= 10_000)) {
    return value.toExponential(7).replace(/0+e/, 'e').replace(/\.e/, 'e');
  }
  const formatted = value.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
  return formatted.includes('.') ? formatted : `${formatted}.0`;
}

function glslConstantName(key: MorphKey): string {
  return `MORPH_${key.toUpperCase()}`;
}

function hexToUnitRgb(value: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Unsupported colour ${value}; expected #RRGGBB.`);
  const integer = Number.parseInt(match[1], 16);
  return [
    ((integer >> 16) & 0xff) / 255,
    ((integer >> 8) & 0xff) / 255,
    (integer & 0xff) / 255,
  ];
}

function unitRgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((component) => Math.round(component * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

type ExpressionTarget = 'editor' | 'glsl' | 'p5' | 'wolfram';

function formatExpression(expression: CustomMorphExpression, target: ExpressionTarget): string {
  if (expression.kind === 'number') return formatNumber(expression.value);
  if (expression.kind === 'variable') {
    return target === 'wolfram' && expression.name === 'time' ? 't' : expression.name;
  }
  if (expression.kind === 'unary') {
    return `${expression.operator}(${formatExpression(expression.argument, target)})`;
  }
  if (expression.kind === 'binary') {
    const left = formatExpression(expression.left, target);
    const right = formatExpression(expression.right, target);
    if (expression.operator === '/' && target !== 'editor') {
      if (target === 'wolfram') return `SafeDiv[${left}, ${right}]`;
      return `safeMorphDiv(${left}, ${right})`;
    }
    return `(${left} ${expression.operator} ${right})`;
  }
  const argument = formatExpression(expression.argument, target);
  if (target === 'wolfram') {
    const functionName = {
      sin: 'Sin',
      cos: 'Cos',
      abs: 'Abs',
      sqrt: 'Sqrt',
    }[expression.name];
    return expression.name === 'sqrt'
      ? `${functionName}[Abs[${argument}]]`
      : `${functionName}[${argument}]`;
  }
  if (target === 'p5') {
    const functionName = {
      sin: 'Math.sin',
      cos: 'Math.cos',
      abs: 'Math.abs',
      sqrt: 'Math.sqrt',
    }[expression.name];
    return expression.name === 'sqrt'
      ? `${functionName}(Math.abs(${argument}))`
      : `${functionName}(${argument})`;
  }
  return expression.name === 'sqrt'
    ? `sqrt(abs(${argument}))`
    : `${expression.name}(${argument})`;
}

function formatEditableCustomMorph(program: CustomMorphProgram): string {
  const assignments = program.assignments.map(({ target, expression }) => (
    `  ${target} = ${formatExpression(expression, 'editor')};`
  ));
  return [
    'vec2 customMorph(vec2 point, float u, float time) {',
    '  float x = point.x;',
    '  float y = point.y;',
    ...assignments,
    '  return vec2(x, y);',
    '}',
  ].join('\n');
}

export function formatWebGLInjection(program: CustomMorphProgram): string {
  const assignments = program.assignments.map(({ target, expression }) => (
    `  ${target} = ${formatExpression(expression, 'glsl')};`
  ));
  return [
    'float safeMorphDiv(float numerator, float denominator) {',
    '  return numerator * denominator / max(denominator * denominator, 0.000001);',
    '}',
    '',
    'float softenMorphCoordinate(float value) {',
    `  const float limit = ${formatNumber(CUSTOM_COORDINATE_LIMIT)};`,
    '  float magnitude = abs(value);',
    '  if (magnitude <= limit) return value;',
    '  float direction = value < 0.0 ? -1.0 : 1.0;',
    '  return direction * (limit + limit * log(1.0 + (magnitude - limit) / limit));',
    '}',
    '',
    'vec2 customMorph(vec2 point, float u, float time) {',
    '  float x = point.x;',
    '  float y = point.y;',
    ...assignments,
    '  vec2 result = vec2(x, y);',
    '  if (any(isnan(result)) || any(isinf(result))) return point;',
    '  return vec2(softenMorphCoordinate(result.x), softenMorphCoordinate(result.y));',
    '}',
  ].join('\n');
}

export function formatP5CustomMorph(program: CustomMorphProgram): string {
  const assignments = program.assignments.map(({ target, expression }) => (
    `  ${target} = ${formatExpression(expression, 'p5')};`
  ));
  return [
    'function safeMorphDiv(numerator, denominator) {',
    '  return numerator * denominator / Math.max(denominator * denominator, 0.000001);',
    '}',
    '',
    'function softenMorphCoordinate(value) {',
    `  const limit = ${formatNumber(CUSTOM_COORDINATE_LIMIT)};`,
    '  const magnitude = Math.abs(value);',
    '  if (magnitude <= limit) return value;',
    '  const direction = value < 0 ? -1 : 1;',
    '  return direction * (limit + limit * Math.log1p((magnitude - limit) / limit));',
    '}',
    '',
    'function customMorph(point, u, time) {',
    '  let x = point.x;',
    '  let y = point.y;',
    ...assignments,
    '  if (!Number.isFinite(x) || !Number.isFinite(y)) return point;',
    '  return { x: softenMorphCoordinate(x), y: softenMorphCoordinate(y) };',
    '}',
  ].join('\n');
}

export function formatWolframCustomMorph(program: CustomMorphProgram): string {
  const assignments = program.assignments.map(({ target, expression }) => (
    `${target} = ${formatExpression(expression, 'wolfram')};`
  ));
  return [
    '(* Editable custom morph *)',
    'SafeDiv[a_, b_] := a b/Max[b^2, 0.000001];',
    `SoftCoordinate[z_] := Piecewise[{{z, Abs[z] <= ${formatNumber(CUSTOM_COORDINATE_LIMIT)}}}, Sign[z] (${formatNumber(CUSTOM_COORDINATE_LIMIT)} + ${formatNumber(CUSTOM_COORDINATE_LIMIT)} Log[1 + (Abs[z] - ${formatNumber(CUSTOM_COORDINATE_LIMIT)})/${formatNumber(CUSTOM_COORDINATE_LIMIT)}])];`,
    '{x, y} = P;',
    ...assignments,
    'P = SoftCoordinate /@ {x, y};',
  ].join('\n');
}

export function formatEditableWebGL(
  morph: MorphState,
  palette: BuilderPalette,
  program: CustomMorphProgram = IDENTITY_CUSTOM_MORPH,
): string {
  const body = hexToUnitRgb(palette.body);
  const pulse = hexToUnitRgb(palette.pulse);
  const constants = MORPH_KEYS.map((key) => (
    `const float ${glslConstantName(key)} = ${formatNumber(morph[key])};`
  ));
  return [
    '// Editable WebGL 2 module for this specimen.',
    '// Change the bounded constants or the body of customMorph.',
    '// customMorph supports x/y assignments, + - * /, sin, cos, abs and sqrt.',
    ...constants,
    `const vec3 BODY_COLOR = vec3(${body.map(formatNumber).join(', ')});`,
    `const vec3 PULSE_COLOR = vec3(${pulse.map(formatNumber).join(', ')});`,
    '',
    formatEditableCustomMorph(program),
  ].join('\n');
}

interface Token {
  readonly type: 'identifier' | 'number' | 'symbol' | 'eof';
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

class SourceFailure extends Error {
  readonly diagnostic: BuilderCodeDiagnostic;

  constructor(token: Pick<Token, 'line' | 'column'>, message: string) {
    super(message);
    this.diagnostic = { line: token.line, column: token.column, message };
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const advance = (): string => {
    const character = source[offset++] ?? '';
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };

  while (offset < source.length) {
    const character = source[offset];
    if (/\s/.test(character)) {
      advance();
      continue;
    }
    if (character === '/' && source[offset + 1] === '/') {
      while (offset < source.length && source[offset] !== '\n') advance();
      continue;
    }
    if (character === '/' && source[offset + 1] === '*') {
      const start = { line, column };
      advance();
      advance();
      let terminated = false;
      while (offset < source.length) {
        if (source[offset] === '*' && source[offset + 1] === '/') {
          advance();
          advance();
          terminated = true;
          break;
        }
        advance();
      }
      if (!terminated) throw new SourceFailure(start, 'Unterminated block comment.');
      continue;
    }

    const tokenLine = line;
    const tokenColumn = column;
    if (/[A-Za-z_]/.test(character)) {
      let value = '';
      while (offset < source.length && /[A-Za-z0-9_]/.test(source[offset])) value += advance();
      tokens.push({ type: 'identifier', value, line: tokenLine, column: tokenColumn });
      continue;
    }
    if (/\d/.test(character) || (character === '.' && /\d/.test(source[offset + 1] ?? ''))) {
      const remainder = source.slice(offset);
      const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(remainder);
      if (!match) throw new SourceFailure({ line, column }, 'Malformed numeric literal.');
      for (let index = 0; index < match[0].length; index += 1) advance();
      tokens.push({ type: 'number', value: match[0], line: tokenLine, column: tokenColumn });
      continue;
    }
    if ('{}(),;=.+-*/'.includes(character)) {
      tokens.push({ type: 'symbol', value: advance(), line: tokenLine, column: tokenColumn });
      continue;
    }
    throw new SourceFailure({ line, column }, `Unsupported character ${JSON.stringify(character)}.`);
  }
  tokens.push({ type: 'eof', value: '', line, column });
  return tokens;
}

interface ParsedConstant {
  readonly token: Token;
  readonly values: readonly number[];
}

class Parser {
  private cursor = 0;
  private readonly constants = new Map<string, ParsedConstant>();

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): { readonly constants: ReadonlyMap<string, ParsedConstant>; readonly program: CustomMorphProgram } {
    while (this.peek().value === 'const') this.parseConstant();
    const program = this.parseCustomMorph();
    this.expectType('eof', 'Unexpected source after customMorph.');
    return { constants: this.constants, program };
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.cursor + offset, this.tokens.length - 1)];
  }

  private take(): Token {
    const token = this.peek();
    this.cursor += 1;
    return token;
  }

  private expect(value: string, message = `Expected ${value}.`): Token {
    const token = this.peek();
    if (token.value !== value) throw new SourceFailure(token, message);
    return this.take();
  }

  private expectType(type: Token['type'], message: string): Token {
    const token = this.peek();
    if (token.type !== type) throw new SourceFailure(token, message);
    return this.take();
  }

  private parseSignedNumber(): { readonly token: Token; readonly value: number } {
    let sign = 1;
    let signToken: Token | undefined;
    if (this.peek().value === '+' || this.peek().value === '-') {
      signToken = this.take();
      if (signToken.value === '-') sign = -1;
    }
    const token = this.expectType('number', 'Expected a numeric literal.');
    const value = sign * Number(token.value);
    if (!Number.isFinite(value)) throw new SourceFailure(signToken ?? token, 'Numeric literal must be finite.');
    return { token: signToken ?? token, value };
  }

  private parseConstant(): void {
    this.expect('const');
    const type = this.expectType('identifier', 'Expected float or vec3 after const.');
    if (type.value !== 'float' && type.value !== 'vec3') {
      throw new SourceFailure(type, 'Only const float and const vec3 declarations are editable.');
    }
    const name = this.expectType('identifier', 'Expected a constant name.');
    if (this.constants.has(name.value)) throw new SourceFailure(name, `Duplicate constant ${name.value}.`);
    this.expect('=');
    let values: readonly number[];
    if (type.value === 'float') {
      values = [this.parseSignedNumber().value];
    } else {
      this.expect('vec3', 'A colour must use vec3(r, g, b).');
      this.expect('(');
      const red = this.parseSignedNumber().value;
      this.expect(',');
      const green = this.parseSignedNumber().value;
      this.expect(',');
      const blue = this.parseSignedNumber().value;
      this.expect(')');
      values = [red, green, blue];
    }
    this.expect(';');
    this.constants.set(name.value, { token: name, values });
  }

  private parseCustomMorph(): CustomMorphProgram {
    this.expect('vec2', 'Expected vec2 customMorph after the constants.');
    this.expect('customMorph', 'The editable function must be named customMorph.');
    this.expect('(');
    this.expect('vec2');
    this.expect('point');
    this.expect(',');
    this.expect('float');
    this.expect('u');
    this.expect(',');
    this.expect('float');
    this.expect('time');
    this.expect(')');
    this.expect('{');
    this.parseCoordinateDeclaration('x');
    this.parseCoordinateDeclaration('y');

    const assignments: CustomMorphAssignment[] = [];
    while (this.peek().value === 'x' || this.peek().value === 'y') {
      const target = this.take();
      this.expect('=', 'Only direct x = ... or y = ... assignments are supported.');
      const expression = this.parseExpression();
      this.expect(';', 'Expected ; after the assignment.');
      assignments.push({ target: target.value as 'x' | 'y', expression });
      if (assignments.length > MAX_ASSIGNMENTS) {
        throw new SourceFailure(target, `customMorph supports at most ${MAX_ASSIGNMENTS} assignments.`);
      }
      this.validateExpression(expression, target);
    }

    this.expect('return', 'Only x/y assignments may appear before the return statement.');
    this.expect('vec2', 'customMorph must return vec2(x, y).');
    this.expect('(');
    this.expect('x');
    this.expect(',');
    this.expect('y');
    this.expect(')');
    this.expect(';');
    this.expect('}');
    return { assignments };
  }

  private parseCoordinateDeclaration(name: 'x' | 'y'): void {
    this.expect('float', `Expected float ${name} = point.${name};`);
    this.expect(name, `Expected float ${name} = point.${name};`);
    this.expect('=');
    this.expect('point');
    this.expect('.');
    this.expect(name);
    this.expect(';');
  }

  private parseExpression(): CustomMorphExpression {
    return this.parseAdditive();
  }

  private parseAdditive(): CustomMorphExpression {
    let expression = this.parseMultiplicative();
    while (this.peek().value === '+' || this.peek().value === '-') {
      const operator = this.take().value as '+' | '-';
      expression = { kind: 'binary', operator, left: expression, right: this.parseMultiplicative() };
    }
    return expression;
  }

  private parseMultiplicative(): CustomMorphExpression {
    let expression = this.parseUnary();
    while (this.peek().value === '*' || this.peek().value === '/') {
      const operator = this.take().value as '*' | '/';
      expression = { kind: 'binary', operator, left: expression, right: this.parseUnary() };
    }
    return expression;
  }

  private parseUnary(): CustomMorphExpression {
    if (this.peek().value === '+' || this.peek().value === '-') {
      const operator = this.take().value as '+' | '-';
      return { kind: 'unary', operator, argument: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): CustomMorphExpression {
    const token = this.peek();
    if (token.type === 'number') {
      this.take();
      const value = Number(token.value);
      if (!Number.isFinite(value) || Math.abs(value) > MAX_LITERAL_MAGNITUDE) {
        throw new SourceFailure(token, `Numeric literals must be finite and no larger than ${MAX_LITERAL_MAGNITUDE}.`);
      }
      return { kind: 'number', value };
    }
    if (token.value === '(') {
      this.take();
      const expression = this.parseExpression();
      this.expect(')', 'Expected ) to close the expression.');
      return expression;
    }
    if (token.type === 'identifier') {
      this.take();
      if (token.value === 'point') {
        throw new SourceFailure(token, 'point is only available in the initial declarations; use x or y.');
      }
      if (token.value === 'x' || token.value === 'y' || token.value === 'u' || token.value === 'time') {
        return { kind: 'variable', name: token.value };
      }
      if (token.value === 'sin' || token.value === 'cos' || token.value === 'abs' || token.value === 'sqrt') {
        this.expect('(', `Expected ( after ${token.value}.`);
        const argument = this.parseExpression();
        this.expect(')', `Expected ) after ${token.value}.`);
        return { kind: 'call', name: token.value, argument };
      }
      throw new SourceFailure(token, `Unsupported identifier ${token.value}.`);
    }
    throw new SourceFailure(token, 'Expected a number, x, y, u, time, or a supported function call.');
  }

  private validateExpression(expression: CustomMorphExpression, token: Token): void {
    const visit = (node: CustomMorphExpression, depth: number): number => {
      if (depth > MAX_EXPRESSION_DEPTH) {
        throw new SourceFailure(token, `Expressions may be nested at most ${MAX_EXPRESSION_DEPTH} levels.`);
      }
      if (node.kind === 'number' || node.kind === 'variable') return 1;
      if (node.kind === 'unary' || node.kind === 'call') return 1 + visit(node.argument, depth + 1);
      return 1 + visit(node.left, depth + 1) + visit(node.right, depth + 1);
    };
    if (visit(expression, 1) > MAX_EXPRESSION_NODES) {
      throw new SourceFailure(token, `An assignment may contain at most ${MAX_EXPRESSION_NODES} expression nodes.`);
    }
  }
}

function validateConstants(constants: ReadonlyMap<string, ParsedConstant>): BuilderCodeDiagnostic[] {
  const diagnostics: BuilderCodeDiagnostic[] = [];
  const expected = new Set([...Object.keys(MORPH_CONSTANTS), 'BODY_COLOR', 'PULSE_COLOR']);
  for (const [name, constant] of constants) {
    if (!expected.has(name)) {
      diagnostics.push({ line: constant.token.line, column: constant.token.column, message: `Unsupported constant ${name}.` });
    }
  }
  for (const control of MORPH_CONTROLS) {
    const name = glslConstantName(control.key);
    const constant = constants.get(name);
    if (!constant) {
      diagnostics.push({ line: 1, column: 1, message: `Missing constant ${name}.` });
      continue;
    }
    if (constant.values.length !== 1) {
      diagnostics.push({ line: constant.token.line, column: constant.token.column, message: `${name} must be a const float.` });
      continue;
    }
    const value = constant.values[0];
    if (value < control.min || value > control.max) {
      diagnostics.push({
        line: constant.token.line,
        column: constant.token.column,
        message: `${name} must be between ${control.min} and ${control.max}.`,
      });
    }
  }
  for (const name of ['BODY_COLOR', 'PULSE_COLOR'] as const) {
    const constant = constants.get(name);
    if (!constant) {
      diagnostics.push({ line: 1, column: 1, message: `Missing constant ${name}.` });
      continue;
    }
    if (constant.values.length !== 3) {
      diagnostics.push({ line: constant.token.line, column: constant.token.column, message: `${name} must be a const vec3.` });
      continue;
    }
    if (constant.values.some((value) => value < 0 || value > 1)) {
      diagnostics.push({ line: constant.token.line, column: constant.token.column, message: `${name} components must be between 0 and 1.` });
    }
  }
  return diagnostics;
}

function stateFromParsed(
  constants: ReadonlyMap<string, ParsedConstant>,
  program: CustomMorphProgram,
): BuilderCodeState {
  const morph = Object.fromEntries(MORPH_KEYS.map((key) => (
    [key, constants.get(glslConstantName(key))!.values[0]]
  ))) as unknown as MorphState;
  const body = constants.get('BODY_COLOR')!.values;
  const pulse = constants.get('PULSE_COLOR')!.values;
  return {
    morph,
    palette: {
      body: unitRgbToHex(body[0], body[1], body[2]),
      pulse: unitRgbToHex(pulse[0], pulse[1], pulse[2]),
    },
    customMorph: program,
  };
}

function f(value: number): string {
  return formatNumber(value);
}

function formatJsNumberArray(values: readonly number[], columns = 4): string {
  const rows: string[] = [];
  for (let index = 0; index < values.length; index += columns) {
    rows.push(`  ${values.slice(index, index + columns).map(f).join(', ')}`);
  }
  return `[\n${rows.join(',\n')}\n]`;
}

function formatP5BaseFunction(genome: CreatureGenome): string {
  const family = genome.family;
  if (family === 0) return `
  const x = index + 1, y = x / p[0];
  const carrierPhase = carrier === 1 ? x / (p[3] * 5.5) : y * p[3];
  const cross = carrier === 2 ? Math.cos(y / (p[5] * 0.85)) : 1;
  const k = (p[1] + p[2] * Math.sin(carrierPhase * detail - t * p[4])) * Math.cos(x / p[5]) * cross;
  const e = y / p[6] - p[7];
  const d = Math.hypot(k, e) + p[22] * Math.sin(y * p[23] * detail + t * 0.45);
  const theta = Math.atan2(k, e);
  const pole = projection === 1 ? 0.22 * safePole(k, 0.1) : 0;
  const nested = Math.sin(y / p[12]) * k * (p[13] + p[14] * resonance * Math.sin(p[15] * e - p[16] * d + 2 * t));
  const q = p[8] * Math.sin(p[9] * lobes * theta) + p[10] * Math.sin(p[11] * k * detail) + pole + nested;
  const c = (p[19] * d + p[20] * d * d - t * p[21]) * fold;
  const xOut = q + p[17] * reach * Math.cos(c), yOut = q * Math.sin(c) + p[18] * d;
  return projection === 0 ? { x: xOut, y: yOut } : { x: xOut, y: -yOut };`;
  if (family === 1) return `
  const x = index % p[0], y = index / p[1];
  const cross = carrier === 1 ? Math.cos(y / p[4]) : 1;
  const k = p[2] * Math.cos(x / p[3]) * cross, e = y / p[5] - p[6];
  const d = (k * k + e * e) / p[7] + p[8] + (metric === 0 ? 0.13 * Math.sin(t) : 0);
  const theta = Math.atan2(k, e), lobeCarrier = phase === 0 ? e : 1;
  const wave = projection === 0 ? Math.cos(d * d * p[14] * detail - t * p[19]) : Math.sin(d * d * p[14] * detail - t * p[19]);
  const q = p[9] - p[10] * lobeCarrier * Math.sin(theta * p[11] * lobes) / safe(d) + k * (p[12] + p[13] * resonance * wave);
  const c = (p[16] * d + p[17] * e - t * p[18]) * fold;
  return { x: q * Math.sin(c) * reach, y: (q + p[15] * d * reach) * Math.cos(c) };`;
  if (family === 2) return `
  const y = index / p[0], mask = Math.trunc(y) ^ Math.trunc(p[19]);
  const low = p[2] + (carrier === 0 ? p[2] * Math.sin(mask) : 2 * Math.sin(y * 1.7));
  const high = carrier === 0 ? p[3] + Math.cos(y) : p[3] + y * p[4] + Math.cos(y / 2);
  const direction = projection === 0 ? 1 : -1;
  const k = (y < p[1] ? low : high) * Math.cos(index + direction * t * p[13]);
  const e = y / p[5] - p[6], d = Math.hypot(k, e) + p[7] * Math.sin(e / p[8] + direction * t);
  const q = y * k / (metric === 0 ? p[9] : safe(d)) * (p[10] + p[11] * resonance * Math.sin(d * p[12] * detail * lobes + y * p[14] - 4 * t));
  const c = (p[17] * d + (phase === 0 ? index % 2 : 1) - t * p[18]) * fold;
  return { x: q + p[15] * reach * Math.cos(c), y: q * Math.sin(c) + p[16] * d };`;
  if (family === 3) return `
  const x = index % p[0], y = index / p[1], k = x / p[2] - p[3], e = y / p[4] + p[5];
  const o = Math.hypot(k, e) / p[6];
  const singular = carrier === 0 ? p[7] * safePole(k, p[8]) : p[7] * Math.cos(p[11] / safe(k));
  const q = p[10] * x + p[9] + singular + o * k * (Math.cos(e * p[12] * detail * lobes) / p[13] + Math.cos(y / p[14]) / p[15]) * resonance * Math.sin(o * p[16] * detail - t * p[17]);
  const c = (metric === 0 ? o / p[18] + e / p[19] : o * e / p[18]) * fold - t / p[20];
  if (projection === 0) return { x: q * Math.cos(c) * reach, y: (q + p[21]) * Math.sin(c) * Math.cos(c) - q / 3 + 30 * o };
  return { x: 0.7 * q * Math.sin(c) * reach, y: y / p[21] * Math.cos(4 * c - t / 2) - 0.5 * q * Math.cos(c) * p[22] };`;
  if (family === 4) return `
  const x = 100 + index % p[0], y = 100 + Math.floor(index / p[0]);
  const k = x / p[1] - 25, e = y / p[1] - 25, r = Math.hypot(k, e);
  let o = r / p[2], d;
  if (carrier === 0) d = p[3] * Math.cos(o * p[4]);
  else if (carrier === 1) { o = r / 11 * Math.cos(Math.sin(k / 2) * Math.cos(e / 2)); d = p[3] * Math.cos(o); }
  else d = -p[3] * Math.abs(Math.sin(k / 2) * Math.cos(e * 0.8));
  d *= resonance;
  if (projection === 0) return { x: (x + reach * d * k * p[6] * Math.sin(d * p[5] * detail * lobes - t) + k * p[7] * Math.sin(y / p[8] + t)) / 2, y: p[9] * d + p[10] * (d - 2) * Math.abs(Math.cos(d / 2 - t / 2)) + d * e };
  if (projection === 1) { const c = ((d + o) * p[11] - t * p[12]) * fold; return { x: (k * Math.atan(p[13] * Math.cos(d * p[14] * detail * lobes)) + x / 2) * Math.cos(c) * reach, y: (k * d * Math.cos(o - d + t) + y / 2) * Math.sin(c) }; }
  if (projection === 2) return { x: (x + reach * d * k * (Math.sin(d * p[19] * detail * lobes + t) + Math.sin(y * o * o) / p[17])) / p[15], y: (y / 3 - p[16] * d + p[17] * Math.cos(d + t)) * p[18] };
  o = 2 - r / p[2];
  return { x: 0.7 * (x - 4 * d * k + d * k * Math.sin(d + t)) + 2 * k * o, y: 0.7 * (y - d * y / 5 + d * e * Math.cos(d + t + o) * Math.sin(t + d)) + e * o };`;
  if (family === 5) return `
  const x = index % p[0], y = index / p[1], k = x / p[2] - p[3];
  const waveA = carrier === 1 ? Math.sin(k) : Math.cos(k), waveB = carrier === 2 ? Math.cos(y / p[7]) : Math.sin(y / p[7]);
  const e = p[4] * waveA + p[5] * waveB + p[6] * Math.cos(k / p[8]), d = Math.abs(e);
  const q = x / p[9] + p[10] + d * k * (p[11] + p[12] * resonance * Math.cos(d * p[13] * detail * lobes - p[14] * t + y / p[15]));
  const c = (y * e / p[16] - t / p[17] + d / p[18]) * fold, echo = projection === 0 ? Math.cos(c / 2) : Math.sin(c / 2);
  return { x: q * Math.cos(c) * reach, y: (q / 2 + p[19] * echo) * Math.sin(c) + p[20] * e };`;
  return `
  const x = 99 + index % p[0], y = 99 + Math.floor(index / p[0]) * p[20];
  const k = x / p[2] - p[3], e = y / p[4] - p[5], d = (k * k + e * e) / p[6], z = y * p[9] * detail * lobes;
  const wave = carrier === 0 ? Math.cos(z) : Math.sin(z), secant = wave / (wave * wave + p[8] * p[8]);
  const q = x / p[11] + p[7] * k * secant * Math.sin(d * d * p[10] - t * p[15]), c = (d / p[12] - t / p[13]) * fold;
  const cross = projection === 0 ? e * Math.sin(d + k - t) * p[17] : k * Math.cos(d + e + t) * p[17];
  return { x: q * Math.sin(c) * reach + cross, y: (q + y / p[18] + d * p[19]) * Math.cos(c) };`;
}

function formatP5DevelopmentFunction(genome: CreatureGenome): string {
  const kind = Math.round(genome.development[0]);
  let mutation: string;
  if (kind === 0) mutation = `
  x += amount * Math.sin(frequency * y + phi) * envelope;
  y += amount * 0.45 * Math.cos(frequency * x - phi) * envelope;`;
  else if (kind === 1) mutation = `
  x *= 1 + amount * 1.7 * Math.cos(frequency * y + phi);
  const mirrorSide = x / Math.sqrt(x * x + 0.04);
  y += amount * 0.5 * Math.sin(frequency * Math.abs(x) + phi) * mirrorSide;`;
  else if (kind === 2) mutation = `
  const flow = Math.sin(frequency * (0.65 * y + 0.35 * x) + phi);
  const counterflow = Math.cos(frequency * (0.55 * x - 0.45 * y) - phi);
  x += amount * flow * (0.3 + Math.abs(y));
  y += amount * 0.24 * counterflow * (0.3 + Math.abs(x));`;
  else if (kind === 3) mutation = `
  const orbit = frequency * TAU * u;
  x += amount * Math.sin(orbit + phi) * (0.35 + Math.abs(y));
  y += amount * 0.55 * Math.cos(orbit - phi) * (0.25 + Math.abs(x));`;
  else if (kind === 4) mutation = `
  x += amount * Math.sin(frequency * y + phi) * Math.cos(frequency * 0.5 * x - phi);
  y += amount * 0.7 * Math.sin(frequency * x - phi) * Math.cos(frequency * 0.5 * y + phi);`;
  else mutation = `
  const angle = Math.atan2(y, x), radius = Math.hypot(x, y);
  const appendages = Math.round(constrain(frequency, 2, 9));
  const growth = Math.min(0.28, amount * 2.15) * envelope * envelope;
  const chirality = Math.min(0.32, amount * 2.4) * envelope * envelope;
  const nextRadius = radius * (1 + growth * Math.cos(appendages * angle + phi));
  const nextAngle = angle + chirality * Math.sin((appendages - 1) * angle - phi);
  x = nextRadius * Math.cos(nextAngle); y = nextRadius * Math.sin(nextAngle);`;
  return `function develop(point, u, time) {
  const amount = DEVELOPMENT[1] * MORPH.mutation;
  const frequency = DEVELOPMENT[2] * (0.82 + 0.18 * MORPH.texture);
  const phi = DEVELOPMENT[3] + (time * MORPH.motion + MORPH.phase) * 0.16 + MORPH.polarity * Math.PI * 0.5;
  const envelope = Math.sin(Math.PI * u);
  let x = point.x * MORPH.tension, y = point.y / Math.sqrt(MORPH.tension);${mutation}
  x += MORPH.polarity * amount * 0.35 * envelope;
  const direction = (FAMILY + MODULES.reduce((sum, value) => sum + value, 0)) % 2 === 0 ? -1 : 1;
  let bend = direction * amount * (0.65 + 0.35 * Math.abs(MORPH.gesture));
  let sCurve = amount * 0.72 * MORPH.gesture;
  const segments = 1 + Math.floor(DEVELOPMENT[2]) % 3;
  const derivativeLimit = Math.PI * Math.abs(bend) + segments * Math.PI * Math.abs(sCurve);
  if (derivativeLimit > 0.86) { const reduction = 0.86 / derivativeLimit; bend *= reduction; sCurve *= reduction; }
  const spine = constrain(y + 0.5, 0, 1);
  const centre = bend * Math.sin(Math.PI * spine + DEVELOPMENT[3]) + sCurve * Math.sin(segments * Math.PI * spine - DEVELOPMENT[3]);
  const slope = Math.PI * bend * Math.cos(Math.PI * spine + DEVELOPMENT[3]) + segments * Math.PI * sCurve * Math.cos(segments * Math.PI * spine - DEVELOPMENT[3]);
  const normalX = 1 / Math.sqrt(1 + slope * slope);
  return { x: centre + x * normalX, y: y - x * slope * normalX };
}`;
}

export function formatP5Sketch(
  genome: CreatureGenome,
  morph: MorphState,
  palette: BuilderPalette,
  program: CustomMorphProgram = IDENTITY_CUSTOM_MORPH,
): string {
  const body = hexToUnitRgb(palette.body).map((value) => Math.round(value * 255));
  const pulse = hexToUnitRgb(palette.pulse).map((value) => Math.round(value * 255));
  const morphObject = MORPH_KEYS.map((key) => `  ${key}: ${f(morph[key])}`).join(',\n');
  return `// Generated by creature / MORPHOSPACE. p5.js global mode.
const FAMILY = ${genome.family};
const MODULES = ${formatJsNumberArray(genome.modules)};
const DEVELOPMENT = ${formatJsNumberArray(genome.development)};
const P = ${formatJsNumberArray(genome.parameters)};
const SOURCE_POINTS = ${genome.sourcePointCount};
const VIEW = { x: ${f(genome.centerX)}, y: ${f(genome.centerY)}, scale: ${f(genome.normalization)} };
const MORPH = {
${morphObject}
};
const BODY_COLOR = ${JSON.stringify(body)};
const PULSE_COLOR = ${JSON.stringify(pulse)};
const TAU = Math.PI * 2;

const safe = value => Math.abs(value) >= 0.0001 ? value : value < 0 ? -0.0001 : 0.0001;
const safePole = (value, epsilon) => value / (value * value + epsilon * epsilon);
const fract = value => value - Math.floor(value);

function basePoint(index, time) {
  const p = P, [carrier, metric, phase, projection] = MODULES;
  const detail = MORPH.texture, t = time * MORPH.motion + MORPH.phase;
  const reach = MORPH.reach, fold = MORPH.fold, lobes = MORPH.lobes, resonance = MORPH.resonance;${formatP5BaseFunction(genome)}
}

${formatP5DevelopmentFunction(genome)}

${formatP5CustomMorph(program)}

function creaturePoint(index, time) {
  const raw = basePoint(index, time);
  const local = { x: (raw.x - VIEW.x) * VIEW.scale, y: (raw.y - VIEW.y) * VIEW.scale };
  const u = index / Math.max(1, SOURCE_POINTS - 1);
  const developed = develop(local, u, time);
  const custom = customMorph(developed, u, time);
  return { x: custom.x * MORPH.scale, y: custom.y * MORPH.scale };
}

let elapsed = 0;
function setup() {
  createCanvas(800, 800);
  pixelDensity(1);
  strokeCap(ROUND);
}

function draw() {
  background(0);
  elapsed += Math.min(deltaTime, 50) / 1000;
  const count = Math.min(Math.round(MORPH.density), SOURCE_POINTS);
  const extent = Math.min(width, height) * 0.72;
  const pulseCentre = fract(elapsed * 0.09 + FAMILY * 0.117 + ${(genome.seed % 10_000) / 10_000});
  for (let sample = 0; sample < count; sample += 1) {
    const u = sample / Math.max(1, count - 1);
    const sourceIndex = Math.round(u * Math.max(1, SOURCE_POINTS - 1));
    const pointPosition = creaturePoint(sourceIndex, elapsed);
    const distance = Math.abs(fract(u - pulseCentre + 0.5) - 0.5);
    const coloured = distance < 0.06 * MORPH.pulse;
    const colour = coloured ? PULSE_COLOR : BODY_COLOR;
    stroke(colour[0], colour[1], colour[2], coloured ? 250 : 190);
    strokeWeight(coloured ? 2.2 : 1.05);
    point(width / 2 + pointPosition.x * extent, height / 2 + pointPosition.y * extent);
  }
}`;
}

export function generateBuilderCodeSources(
  genome: CreatureGenome,
  morph: MorphState,
  palette: BuilderPalette,
  program: CustomMorphProgram = IDENTITY_CUSTOM_MORPH,
): BuilderCodeSources {
  return {
    wolfram: `${formatBuilderEquation(genome, morph)}\n\n${formatWolframCustomMorph(program)}`,
    p5js: formatP5Sketch(genome, morph, palette, program),
    webgl: formatEditableWebGL(morph, palette, program),
    webglInjection: formatWebGLInjection(program),
  };
}

export function parseEditableWebGL(
  source: string,
  genome: CreatureGenome,
): BuilderCodeParseResult {
  try {
    const parsed = new Parser(tokenize(source)).parse();
    const diagnostics = validateConstants(parsed.constants);
    if (diagnostics.length > 0) return { ok: false, diagnostics };
    const state = stateFromParsed(parsed.constants, parsed.program);
    return {
      ok: true,
      state,
      sources: generateBuilderCodeSources(genome, state.morph, state.palette, state.customMorph),
    };
  } catch (error) {
    if (error instanceof SourceFailure) return { ok: false, diagnostics: [error.diagnostic] };
    throw error;
  }
}
