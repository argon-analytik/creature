import type { Exhibit } from './catalog';
import { vertexShaderSource } from './shaders';

export interface MuseumPalette {
  readonly body: string;
  readonly pulse: string;
}

export interface MuseumTransfer {
  readonly version: 1;
  readonly kind: 'museum-exhibit';
  readonly exhibitId: number;
  readonly variant: number;
  readonly pointCount: number;
  readonly palette: MuseumPalette;
}

export const MUSEUM_TRANSFER_KEY = 'creature-morphospace-transfer-v1';

const HEX_COLOR = /^#[\da-f]{6}$/i;

export function createMuseumTransfer(
  exhibit: Exhibit,
  palette: MuseumPalette,
): MuseumTransfer {
  return {
    version: 1,
    kind: 'museum-exhibit',
    exhibitId: exhibit.id,
    variant: exhibit.variant,
    pointCount: exhibit.pointCount,
    palette: {
      body: palette.body.toLowerCase(),
      pulse: palette.pulse.toLowerCase(),
    },
  };
}

export function parseMuseumTransfer(value: unknown): MuseumTransfer | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<MuseumTransfer>;
  if (
    candidate.version !== 1
    || candidate.kind !== 'museum-exhibit'
    || !Number.isInteger(candidate.exhibitId)
    || !Number.isInteger(candidate.variant)
    || typeof candidate.pointCount !== 'number'
    || !Number.isFinite(candidate.pointCount)
    || candidate.pointCount < 1
    || !candidate.palette
    || !HEX_COLOR.test(candidate.palette.body ?? '')
    || !HEX_COLOR.test(candidate.palette.pulse ?? '')
  ) {
    return undefined;
  }

  return {
    version: 1,
    kind: 'museum-exhibit',
    exhibitId: candidate.exhibitId!,
    variant: candidate.variant!,
    pointCount: Math.round(candidate.pointCount),
    palette: {
      body: candidate.palette.body.toLowerCase(),
      pulse: candidate.palette.pulse.toLowerCase(),
    },
  };
}

export function encodeMuseumTransfer(transfer: MuseumTransfer): string {
  return JSON.stringify(transfer);
}

export function decodeMuseumTransfer(source: string | null): MuseumTransfer | undefined {
  if (!source) return undefined;
  try {
    return parseMuseumTransfer(JSON.parse(source) as unknown);
  } catch {
    return undefined;
  }
}

/**
 * Reuses the exact equation program embedded in the museum vertex shader.
 * Only its uniform-bound wrapper is adapted so Morphospace can supply its own
 * time, phase and selected archive variant without changing the equations.
 */
export function buildMuseumEquationShaderSource(): string {
  const start = vertexShaderSource.indexOf('float sourceTime(int variant) {');
  const end = vertexShaderSource.indexOf('\nvoid main() {', start);
  if (start < 0 || end < 0) {
    throw new Error('The museum equation shader section could not be located.');
  }

  const equationProgram = vertexShaderSource
    .slice(start, end)
    .replace(
      'float sourceTime(int variant) {',
      'float museumSourceTime(int variant, float elapsed, float phase) {',
    )
    .replace('return uTime * speed + uMotion.x;', 'return elapsed * speed + phase;')
    .replace('vec2 evaluateCreature(float index, float t) {', 'vec2 evaluateMuseumCreature(int variant, float index, float t) {')
    .replaceAll('uVariant', 'variant');

  return `const float PI = 3.141592653589793;\n\n${equationProgram}`;
}

const P5_BY_VARIANT: Readonly<Record<number, string>> = {
  0: `a=(x,y,d=mag(k=(4+3*sin(2*y-t))*cos(x/29),e=y/8-13))=>point((q=3*sin(2*k)+.3/k+sin(y/25)*k*(9+4*sin(9*e-3*d+2*t)))+30*cos(c=d-t)+200,400-(q*sin(c)+39*d-220))
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/60,i=1e4;i--;)a(i,i/235)}`,
  1: `a=(x,y,d=mag(k=x/8-25,e=y/8-25)**2/99)=>[(q=x/3+k*.5/cos(y*5)*sin(d*d-t))*sin(c=d/2-t/8)+e*sin(d+k-t)+200,(q+y/8+d*9)*cos(c)+200]
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(255,96);for(t+=PI/60,y=99;y<300;y+=5)for(x=99;++x<300;)point(...a(x,y))}`,
  2: `a=(x,y,d=mag(k=9*cos(x/8),e=y/8-12.5)**2/99+sin(t)/6+.5)=>point((q=99-e*sin(atan2(k,e)*7)/d+k*(3+cos(d*d-t)*2))*sin(c=d/2+e/69-t/16)+200,(q+19*d)*cos(c)+200)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,66);for(t+=PI/45,i=1e4;i--;)a(i%200,i/55)}`,
  3: `a=(x,y,d=mag(k=4*cos(x/29),e=y/7-13))=>point((q=3*sin(atan2(k,e)*19)+sin(y/19)*k*(9+2*sin(e*9-d*3+t/4)))+60*cos(c=d-t/8)+200,q*sin(c)+d*39-195)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,146);for(t+=PI/15,i=1e4;i--;)a(i,i/235)}`,
  4: `a=(y,d=mag(k=(y<5?6+sin(y^1)*6:4+cos(y))*cos(i+t/4),e=y/3-13)+sin(e/4-t)/3)=>point((q=y*k/5*(2+sin(d*2+y-t*4)))+90*cos(c=d/3-t/2+i%2)+200,q*sin(c)+d*29-170)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/90,i=1e4;i--;)a(i/790)}`,
  5: `a=(x,y,o=mag(k=x/4-12.5,e=y/9)/9)=>point((q=x/3+99+3/k*sin(y)+k*(1+cos(y)/3+sin(e+o*4-t*2)))*cos(c=o/5+e/4-t/8)+200,(q+49)*sin(c)*cos(c)-q/3+30*o+220)
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(w,46);for(t+=PI/90,i=2e4;i--;)a(i%100,i/350)}`,
  6: `a=(x,y,o=mag(k=x/4-12.5,e=y/9)/9)=>point((q=x+99+cos(9/k)+o*k*(cos(e*9)/3+cos(y/9)/.7)*sin(o*4-t))*.7*sin(c=o*e/30-t/8)+200,200+y/9*cos(c*4-t/2)-q/2*cos(c))
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(w,46);for(t+=PI/60,i=3e4;i--;)a(i%100,i/150)}`,
  7: `a=(x,y,d=mag(k=5*cos(x/14)*cos(y/30),e=y/8-13)**2/59+4)=>point((q=60-3*sin(atan2(k,e)*e)+k*(3+4/d*sin(d*d-t*2)))*sin(c=d/2+e/99-t/18)+200,(q+d*9)*cos(c)+200)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,66);for(t+=PI/20,i=1e4;i--;)a(i%200,i/43)}`,
  8: `a=(y,d=mag(k=(y<11?6+sin(y^8)*6:y/5+cos(y/2))*cos(i-t/4),e=y/7-13)+sin(e/4+t)/2)=>point((q=y*k/d*(3+sin(d*2+y/2-t*4)))+60*cos(c=d/2+1-t/2)+200,q*sin(c)+d*29-170)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/120,i=1e4;i--;)a(i/345)}`,
  9: `a=(x,y,d=5*cos(mag(k=x/8-25,e=y/8-25)/3))=>[(x+d*k*sin(d*2.5-t)+k/2*sin(y/3+t))/2+100,d*19+(d-2)*5*abs(cos(d/2-t/2))+d*e+215]
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(255,66);for(t+=PI/60,y=100;y<300;y++)for(x=100;x<300;x++)point(...a(x,y))}`,
  10: `a=(x,y,d=5*cos(o=mag(k=x/8-25,e=y/8-25)/3.5))=>[(k*atan(3*cos(d*9))+x/2)*cos(c=(d+o)/4-t/8)+200,(k*d*cos(o-d+t)+y/2)*sin(c)+200]
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(255,96);for(t+=PI/60,y=99;y<300;y+=2)for(x=99;++x<300;)point(...a(x,y))}`,
  11: `a=(x,y,d=abs(e=cos(k=x/8-12.5)+sin(y/24)+cos(k/2)))=>point((q=x/4+90+d*k*(1+cos(d*4-t*2+y/72)))*cos(c=y*e/594-t/8+d/6)+200,(q/2+99*cos(c/2))*sin(c)+e*6+200)
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(w,36);for(t+=PI/60,i=4e4;i--;)a(i%200,i/200)}`,
  12: `a=(x,y,d=5*cos(o=mag(k=x/8-12.5,e=y/8-12.5)/12*cos(sin(k/2)*cos(e/2))))=>point((x+d*k*(sin(d*2+t)+sin(y*o*o)/9))/1.5+133,(y/3-d*40+19*cos(d+t))*1.5+300)
t=0,draw=$=>{t||createCanvas(w=400,w);background(6,96).stroke(w,46);for(t+=PI/90,i=4e4;i--;)a(i%200,i/200)}`,
  13: `a=(x,y,d=mag(k=(4+sin(x/11+t*8))*cos(x/14),e=y/8-19)+sin(y/9+t*2))=>point((q=2*sin(k*2)+sin(y/17)*k*(9+2*sin(y-d*3)))+50*cos(c=d*d/49-t)+200,q*sin(c)+d*39-440)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/240,i=1e4;i--;)a(i,i/235)}`,
  15: `a=(x,y,o=mag(k=x/4-12.5,e=y/9+9)/9)=>point((q=x+99+tan(1/k)+o*k*(cos(e*9)/2+cos(y/9)/.7)*sin(o*4-t*2))*.7*sin(c=o*e/30-t/8)+200,200+y*cos(c*4-o)-q/2*cos(c))
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(w,46);for(t+=PI/60,i=2e4;i--;)a(i%100,i/250)}`,
  16: `a=(x,y,o=mag(k=x/4-12.5,e=y/9+5)/9)=>point((q=x+99+tan(1/k)+o*k*(cos(e*9)/4+cos(y/2))*sin(o*4-t))*.7*sin(c=o*e/30-t/8)+9*cos(y/19+t)+200,200+q/2*cos(c))
t=0,draw=$=>{t||createCanvas(w=400,w);background(6).stroke(w,46);for(t+=PI/90,i=2e4;i--;)a(i%100,i/100)}`,
  17: `a=(x,y,o=2-mag(k=x/8-12,e=y/8-12)/3,d=-5*abs(sin(k/2)*cos(e*.8)))=>point((x-d*k*4+d*k*sin(d+t))*.7+k*o*2+130,(y-d*y/5+d*e*cos(d+t+o)*sin(t+d))*.7+e*o+70)
t=0,draw=$=>{t||createCanvas(w=400,w);background(6,96).stroke(w,46);for(t+=PI/90,i=4e4;i--;)a(i%200,i/200)}`,
  20: `a=(x,y,d=mag(k=5*cos(x/19)*cos(y/30),e=y/8-12)**2/59+2)=>point((q=4*sin(atan2(k,e)*9)+9*sin(d-t)-k/d*(9+sin(d*9-t*16)*3))+50*cos(c=d*d/7-t)+200,q*sin(c)+d*45-9)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,36);for(t+=PI/240,i=1e4;i--;)a(i,i/41)}`,
  21: `a=(x,d=mag(k=4*cos(x/21),e=x/1880-20))=>point((q=3*sin(2*k)+.3/k+k*sin(x/4465)*(9+2*sin(14*e-3*d+2*t)))+50*cos(d-t)+200,875-q*sin(d-t)-39*d)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9);for(t+=PI/240,i=1e4;i--;){k=4*cos(i/21);stroke(k*k>=15?'#ffb52e':'#8ea3b8',k*k>=15?180:150);a(i)}}`,
};

export function buildP5Export(exhibit: Exhibit, palette: MuseumPalette): string {
  const sketch = P5_BY_VARIANT[exhibit.variant];
  if (!sketch) throw new Error(`No p5.js source is available for variant ${exhibit.variant}.`);
  const paletteAwareSketch = sketch.replaceAll(/\bpoint\(/g, 'plotCreaturePoint(');
  return `// creature ${String(exhibit.id + 1).padStart(2, '0')} — original p5.js equation
// p5.js by @yuruyurau · https://x.com/yuruyurau
// The currently selected museum palette is applied below.
// https://creature.argio.ch/

const CREATURE_BODY = '${palette.body.toLowerCase()}';
const CREATURE_PULSE = '${palette.pulse.toLowerCase()}';
const CREATURE_POINTS = ${exhibit.pointCount};
let creaturePointIndex = 0;
let creatureInk = '';

function plotCreaturePoint(...coordinates) {
  const u = creaturePointIndex++ / max(1, CREATURE_POINTS - 1);
  const centre = ((t * .09) % 1 + 1) % 1;
  const distance = abs(((u - centre + .5) % 1 + 1) % 1 - .5);
  const nextInk = distance < .055 ? CREATURE_PULSE : CREATURE_BODY;
  if (nextInk !== creatureInk) {
    stroke(nextInk);
    creatureInk = nextInk;
  }
  point(...coordinates);
}

${paletteAwareSketch}

const drawEquation = draw;
draw = () => {
  creaturePointIndex = 0;
  creatureInk = '';
  drawEquation();
};
`;
}
