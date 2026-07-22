export const vertexShaderSource = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in float aVertexIndex;

uniform vec2 uViewport;
uniform float uTime;
uniform float uDevicePixelRatio;
uniform float uPointCount;
uniform float uSampleCount;
uniform int uVariant;
uniform vec4 uPose;
uniform vec4 uMotion;
uniform vec4 uBaseColor;
uniform vec4 uPulseColor;
uniform float uOpacity;

out vec4 vColor;

const float PI = 3.141592653589793;

float safe(float value) {
  if (abs(value) >= 0.0001) return value;
  return value < 0.0 ? -0.0001 : 0.0001;
}

float sourceTime(int variant) {
  float speed = 0.38;
  if (variant == 1) speed = PI;
  else if (variant == 2) speed = 4.1887902;
  else if (variant == 3) speed = 12.5663706;
  else if (variant == 4 || variant == 5) speed = 2.0943951;
  else if (variant == 6) speed = PI;
  else if (variant == 7) speed = 9.4247780;
  else if (variant == 8) speed = 1.5707963;
  else if (variant == 9 || variant == 10 || variant == 11) speed = PI;
  else if (variant == 12) speed = 2.0943951;
  else if (variant == 13) speed = 0.7853982;
  else if (variant == 15) speed = PI;
  else if (variant == 16 || variant == 17) speed = 2.0943951;
  else if (variant == 20) speed = 0.7853982;
  else if (variant == 21) speed = 0.7853982;
  return uTime * speed + uMotion.x;
}

vec2 evaluateCreature(float index, float t) {
  if (uVariant == 0) {
    float x=index+1.0, y=x/235.0;
    float k=(4.0+3.0*sin(2.0*y-t))*cos(x/29.0), e=y/8.0-13.0;
    float d=length(vec2(k,e)), c=d-t;
    float q=3.0*sin(2.0*k)+0.3/safe(k)+sin(y/25.0)*k*(9.0+4.0*sin(9.0*e-3.0*d+2.0*t));
    return vec2(q+30.0*cos(c)+200.0,400.0-(q*sin(c)+39.0*d-220.0));
  }
  if (uVariant == 1) {
    float x=100.0+mod(index,200.0), y=99.0+floor(index/200.0)*5.0;
    float k=x/8.0-25.0, e=y/8.0-25.0, d=dot(vec2(k,e),vec2(k,e))/99.0;
    float q=x/3.0+k*0.5/safe(cos(y*5.0))*sin(d*d-t), c=d/2.0-t/8.0;
    return vec2(q*sin(c)+e*sin(d+k-t)+200.0,(q+y/8.0+d*9.0)*cos(c)+200.0);
  }
  if (uVariant == 2) {
    float x=mod(index,200.0), y=index/55.0;
    float k=9.0*cos(x/8.0), e=y/8.0-12.5;
    float d=dot(vec2(k,e),vec2(k,e))/99.0+sin(t)/6.0+0.5;
    float q=99.0-e*sin(atan(k,e)*7.0)/safe(d)+k*(3.0+cos(d*d-t)*2.0);
    float c=d/2.0+e/69.0-t/16.0;
    return vec2(q*sin(c)+200.0,(q+19.0*d)*cos(c)+200.0);
  }
  if (uVariant == 3) {
    float x=index, y=index/235.0, k=4.0*cos(x/29.0), e=y/7.0-13.0;
    float d=length(vec2(k,e));
    float q=3.0*sin(atan(k,e)*19.0)+sin(y/19.0)*k*(9.0+2.0*sin(e*9.0-d*3.0+t/4.0));
    float c=d-t/8.0;
    return vec2(q+60.0*cos(c)+200.0,q*sin(c)+d*39.0-195.0);
  }
  if (uVariant == 4) {
    float y=index/790.0, xorY=float(int(floor(y))^1);
    float k=(y<5.0?6.0+sin(xorY)*6.0:4.0+cos(y))*cos(index+t/4.0), e=y/3.0-13.0;
    float d=length(vec2(k,e))+sin(e/4.0-t)/3.0;
    float q=y*k/5.0*(2.0+sin(d*2.0+y-t*4.0)), c=d/3.0-t/2.0+mod(index,2.0);
    return vec2(q+90.0*cos(c)+200.0,q*sin(c)+d*29.0-170.0);
  }
  if (uVariant == 5) {
    float x=mod(index,100.0), y=index/350.0, k=x/4.0-12.5, e=y/9.0;
    float o=length(vec2(k,e))/9.0;
    float q=x/3.0+99.0+3.0/safe(k)*sin(y)+k*(1.0+cos(y)/3.0+sin(e+o*4.0-t*2.0));
    float c=o/5.0+e/4.0-t/8.0;
    return vec2(q*cos(c)+200.0,(q+49.0)*sin(c)*cos(c)-q/3.0+30.0*o+220.0);
  }
  if (uVariant == 6) {
    float x=mod(index,100.0), y=index/150.0, k=x/4.0-12.5, e=y/9.0;
    float o=length(vec2(k,e))/9.0;
    float q=x+99.0+cos(9.0/safe(k))+o*k*(cos(e*9.0)/3.0+cos(y/9.0)/0.7)*sin(o*4.0-t);
    float c=o*e/30.0-t/8.0;
    return vec2(q*0.7*sin(c)+200.0,200.0+y/9.0*cos(c*4.0-t/2.0)-q/2.0*cos(c));
  }
  if (uVariant == 7) {
    float x=mod(index,200.0), y=index/43.0;
    float k=5.0*cos(x/14.0)*cos(y/30.0), e=y/8.0-13.0;
    float d=dot(vec2(k,e),vec2(k,e))/59.0+4.0;
    float q=60.0-3.0*sin(atan(k,e)*e)+k*(3.0+4.0/safe(d)*sin(d*d-t*2.0));
    float c=d/2.0+e/99.0-t/18.0;
    return vec2(q*sin(c)+200.0,(q+d*9.0)*cos(c)+200.0);
  }
  if (uVariant == 8) {
    float y=index/345.0, xorY=float(int(floor(y))^8);
    float k=(y<11.0?6.0+sin(xorY)*6.0:y/5.0+cos(y/2.0))*cos(index-t/4.0), e=y/7.0-13.0;
    float d=length(vec2(k,e))+sin(e/4.0+t)/2.0;
    float q=y*k/safe(d)*(3.0+sin(d*2.0+y/2.0-t*4.0)), c=d/2.0+1.0-t/2.0;
    return vec2(q+60.0*cos(c)+200.0,q*sin(c)+d*29.0-170.0);
  }
  if (uVariant == 9) {
    float x=100.0+mod(index,200.0), y=100.0+floor(index/200.0);
    float k=x/8.0-25.0, e=y/8.0-25.0, d=5.0*cos(length(vec2(k,e))/3.0);
    return vec2((x+d*k*sin(d*2.5-t)+k/2.0*sin(y/3.0+t))/2.0+100.0,
      d*19.0+(d-2.0)*5.0*abs(cos(d/2.0-t/2.0))+d*e+215.0);
  }
  if (uVariant == 10) {
    float x=100.0+mod(index,200.0), y=99.0+floor(index/200.0)*2.0;
    float k=x/8.0-25.0, e=y/8.0-25.0, o=length(vec2(k,e))/3.5, d=5.0*cos(o);
    float c=(d+o)/4.0-t/8.0;
    return vec2((k*atan(3.0*cos(d*9.0))+x/2.0)*cos(c)+200.0,
      (k*d*cos(o-d+t)+y/2.0)*sin(c)+200.0);
  }
  if (uVariant == 11) {
    float x=mod(index,200.0), y=index/200.0, k=x/8.0-12.5;
    float e=cos(k)+sin(y/24.0)+cos(k/2.0), d=abs(e);
    float q=x/4.0+90.0+d*k*(1.0+cos(d*4.0-t*2.0+y/72.0));
    float c=y*e/594.0-t/8.0+d/6.0;
    return vec2(q*cos(c)+200.0,(q/2.0+99.0*cos(c/2.0))*sin(c)+e*6.0+200.0);
  }
  if (uVariant == 12) {
    float x=mod(index,200.0), y=index/200.0, k=x/8.0-12.5, e=y/8.0-12.5;
    float o=length(vec2(k,e))/12.0*cos(sin(k/2.0)*cos(e/2.0)), d=5.0*cos(o);
    return vec2((x+d*k*(sin(d*2.0+t)+sin(y*o*o)/9.0))/1.5+133.0,
      (y/3.0-d*40.0+19.0*cos(d+t))*1.5+300.0);
  }
  if (uVariant == 13) {
    float x=index, y=index/235.0;
    float k=(4.0+sin(x/11.0+t*8.0))*cos(x/14.0), e=y/8.0-19.0;
    float d=length(vec2(k,e))+sin(y/9.0+t*2.0);
    float q=2.0*sin(k*2.0)+sin(y/17.0)*k*(9.0+2.0*sin(y-d*3.0)), c=d*d/49.0-t;
    return vec2(q+50.0*cos(c)+200.0,q*sin(c)+d*39.0-440.0);
  }
  if (uVariant == 15) {
    float x=mod(index,100.0), y=index/250.0, k=x/4.0-12.5, e=y/9.0+9.0;
    float o=length(vec2(k,e))/9.0;
    float q=x+99.0+tan(1.0/safe(k))+o*k*(cos(e*9.0)/2.0+cos(y/9.0)/0.7)*sin(o*4.0-t*2.0);
    float c=o*e/30.0-t/8.0;
    return vec2(q*0.7*sin(c)+200.0,200.0+y*cos(c*4.0-o)-q/2.0*cos(c));
  }
  if (uVariant == 16) {
    float x=mod(index,100.0), y=index/100.0, k=x/4.0-12.5, e=y/9.0+5.0;
    float o=length(vec2(k,e))/9.0;
    float q=x+99.0+tan(1.0/safe(k))+o*k*(cos(e*9.0)/4.0+cos(y/2.0))*sin(o*4.0-t);
    float c=o*e/30.0-t/8.0;
    return vec2(q*0.7*sin(c)+9.0*cos(y/19.0+t)+200.0,200.0+q/2.0*cos(c));
  }
  if (uVariant == 17) {
    float x=mod(index,200.0), y=index/200.0, k=x/8.0-12.0, e=y/8.0-12.0;
    float o=2.0-length(vec2(k,e))/3.0, d=-5.0*abs(sin(k/2.0)*cos(e*0.8));
    return vec2((x-d*k*4.0+d*k*sin(d+t))*0.7+k*o*2.0+130.0,
      (y-d*y/5.0+d*e*cos(d+t+o)*sin(t+d))*0.7+e*o+70.0);
  }
  if (uVariant == 20) {
    float x=index, y=index/41.0;
    float k=5.0*cos(x/19.0)*cos(y/30.0), e=y/8.0-12.0;
    float d=dot(vec2(k,e),vec2(k,e))/59.0+2.0;
    float q=4.0*sin(atan(k,e)*9.0)+9.0*sin(d-t)-k/safe(d)*(9.0+sin(d*9.0-t*16.0)*3.0);
    float c=d*d/7.0-t;
    return vec2(q+50.0*cos(c)+200.0,q*sin(c)+d*45.0-9.0);
  }
  float x=index, k=4.0*cos(x/21.0), e=x/1880.0-20.0;
  float d=length(vec2(k,e));
  float q=3.0*sin(2.0*k)+0.3/safe(k)+k*sin(x/4465.0)*(9.0+2.0*sin(14.0*e-3.0*d+2.0*t));
  return vec2(q+50.0*cos(d-t)+200.0,875.0-q*sin(d-t)-39.0*d);
}

void main() {
  float index01=aVertexIndex/max(1.0,uSampleCount-1.0);
  float sourceIndex=floor(index01*max(1.0,uPointCount-1.0)+0.5);
  vec2 point=evaluateCreature(sourceIndex,sourceTime(uVariant));
  vec2 local=uVariant==0?(point-vec2(200.0,190.0))/160.0:(point-vec2(200.0))/160.0;

  float pixelScale=uPose.z*min(uViewport.x,uViewport.y);
  vec2 screenPosition=uPose.xy*uViewport+local*pixelScale;
  vec2 clipPosition=screenPosition/uViewport*2.0-1.0;
  clipPosition.y*=-1.0;
  gl_Position=vec4(clipPosition,0.0,1.0);

  float pulseCenter=fract(uTime*uMotion.y+uMotion.z);
  float pulseDistance=abs(fract(index01-pulseCenter+0.5)-0.5);
  float pulse=1.0-smoothstep(uMotion.w,uMotion.w+0.012,pulseDistance);
  float variation=0.8+0.2*sin(sourceIndex*0.071+uMotion.x*7.0);
  float pointSize=mix(1.1,2.55,pulse)*mix(0.84,1.1,variation);
  if (uVariant == 21) {
    float edgeK=4.0*cos(sourceIndex/21.0);
    float outside=step(15.0,edgeK*edgeK);
    float colourPhase=sin(sourceTime(uVariant));
    pulse=outside*colourPhase*colourPhase;
    pointSize=mix(1.1,4.1,outside)*mix(0.9,1.08,variation);
  }
  vColor=mix(uBaseColor,uPulseColor,pulse);
  vColor.a*=uOpacity*mix(variation,1.0,pulse);
  gl_PointSize=clamp(uDevicePixelRatio*pointSize,1.0,6.5);
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;
in vec4 vColor;
out vec4 outColor;
void main() {
  vec2 point=gl_PointCoord*2.0-1.0;
  float radius=length(point);
  if (radius>1.0) discard;
  float edge=1.0-smoothstep(0.52,1.0,radius);
  float core=1.0-smoothstep(0.0,0.38,radius);
  outColor=vec4(vColor.rgb*mix(0.9,1.08,core),vColor.a*edge);
}
`;
