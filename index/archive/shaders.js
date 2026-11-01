// 실제 관찰을 반영해 독립 작성: 대각선 진행파 + 뒤로 말림 + 아래로 처짐.
export const cardVertex=`
uniform float uTime;
uniform float uDepth;
uniform float uDip;
uniform float uWave;
uniform float uCardHeight;
uniform float uExpand;
uniform vec4 uExpandTarget;
uniform sampler2D uTouch;
uniform float uTouchStrength;
uniform vec2 uBend;
uniform float uCaption;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform float uPointerActive;
varying vec2 vUv;
varying float vDepth;
varying float vLight;
varying float vRetire;
varying vec4 vTouch;
varying float vFold;
vec3 flowPath(float s){
  if(s<=0.0||uDepth<=0.0)return vec3(s,0.0,0.0);
  float scale=clamp(uDepth/1200.0,0.55,1.8);
  float r1=100.0*scale,r2=50.0*scale,angle=1.75,exitAngle=1.35;
  float run=30.0*max(0.25,uDip)*scale;
  float first=r1*angle,second=first+run,third=second+r2*(angle-exitAngle);
  if(s<first){float t=s/r1;return vec3(r1*sin(t),r1*(cos(t)-1.0),min(1.0,t/1.57079633));}
  float y=r1*sin(angle),z=r1*(cos(angle)-1.0);
  if(s<second){float d=s-first;return vec3(y+d*cos(angle),z-d*sin(angle),1.0);}
  y+=run*cos(angle);z-=run*sin(angle);
  if(s<third){float t=angle-(s-second)/r2;return vec3(y+r2*(sin(angle)-sin(t)),z+r2*(cos(angle)-cos(t)),1.0);}
  y+=r2*(sin(angle)-sin(exitAngle));z+=r2*(cos(angle)-cos(exitAngle));
  return vec3(y+(s-third)*cos(exitAngle),z-(s-third)*sin(exitAngle),1.0);
}
void main(){
  vUv=uv;
  vec4 world=modelMatrix*vec4(position,1.0);
  float phase=(world.x-world.y)*0.02-uTime*2.0;
  float crest=sin(phase);
  float travel=world.y-uBend.x;
  vec3 path=flowPath(travel);
  float behind=uDepth>0.0?smoothstep(100.0,380.0,travel):0.0;
  world.x+=32.0*sin(travel/190.0)*behind;
  world.y=uBend.x+path.x+uWave*0.07*crest;
  world.z=path.y+uWave*0.42*crest;
  vFold=path.z;
  vRetire=uDepth>0.0?smoothstep(260.0,850.0,max(0.0,-path.y)):0.0;
  vec4 projected=projectionMatrix*viewMatrix*world;
  vec2 screenUv=projected.xy/projected.w*0.5+0.5;
  vTouch=texture2D(uTouch,screenUv);
  float influence=1.0-smoothstep(20.0,68.0,length((screenUv-uPointer)*uViewport));
  vTouch=mix(vec4(0.5019608,0.5019608,0.5019608,0.0),vTouch,influence*uPointerActive);
  world.z+=(vTouch.b-0.5019608)*60.0*uTouchStrength;
  world.xy+=(vTouch.rg-0.5019608)*5.0*uTouchStrength;
  vLight=crest;vDepth=max(0.0,-world.z)*(1.0-uExpand);
  vec3 destination=vec3(position.x*uExpandTarget.z+uExpandTarget.x,position.y*uExpandTarget.w+uExpandTarget.y,0.0);
  float ripple=sin(uExpand*3.14159265)*sin(uv.x*7.0-uv.y*5.0-uTime*2.0);
  world.xyz=mix(world.xyz,destination,uExpand);
  world.z+=ripple*30.0;world.y+=ripple*5.0;
  gl_Position=projectionMatrix*viewMatrix*world;
}`;
export const cardFragment=`
uniform sampler2D uMap;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform vec3 uBackground;
uniform float uCaption;
uniform float uChroma;
uniform float uWave;
uniform float uHover;
uniform float uRowOpacity;
uniform float uExpand;
uniform vec4 uExpandTarget;
uniform sampler2D uTouch;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform vec2 uBufferSize;
uniform float uPointerActive;
uniform float uTouchStrength;
varying vec2 vUv;
varying float vDepth;
varying float vLight;
varying float vRetire;
varying vec4 vTouch;
varying float vFold;
void main(){
  vec2 scale=vec2(1.0);
  float imageRatio=uImageSize.x/uImageSize.y;
  vec2 displaySize=mix(uPlaneSize,uExpandTarget.zw,uExpand);
  float planeRatio=displaySize.x/displaySize.y;
  if(imageRatio>planeRatio)scale.x=planeRatio/imageRatio;
  else scale.y=imageRatio/planeRatio;
  vec2 uv=(vUv-0.5)*scale/(1.0+uHover*0.10*(1.0-uCaption)*(1.0-uExpand))+0.5;
    vec2 screenUv=gl_FragCoord.xy/uBufferSize;
    float localMask=(1.0-smoothstep(18.0,76.0,length((screenUv-uPointer)*uViewport)))*uPointerActive;
    vec4 touch=texture2D(uTouch,screenUv);
    vec2 slope=touch.rg-vec2(0.5019608);
  uv+=slope*0.04*localMask*uTouchStrength*(1.0-uCaption);
  vec4 color=texture2D(uMap,uv);
  if(uCaption<0.5){
    // Folding accentuates a soft upper silhouette, rather than pointed corners.
    float radius=mix(mix(1.5,52.0,smoothstep(0.0,0.7,vFold)),6.0,uExpand);
    vec2 corner=vec2(min(vUv.x,1.0-vUv.x)*uPlaneSize.x,(1.0-vUv.y)*uPlaneSize.y);
    float cornerDistance=length(max(vec2(radius)-corner,0.0))-radius;
    color.a*=1.0-smoothstep(-0.8,0.8,cornerDistance);
    vec2 edge=abs(vUv-0.5)*2.0;
    float fringe=pow(max(edge.x,edge.y),3.0);
    vec2 split=vec2(0.0018,-0.0009)*uChroma*(0.22+fringe);
    color.r=texture2D(uMap,uv+split).r;
    color.b=texture2D(uMap,uv-split).b;
    color.rgb*=1.0+vLight*min(uWave/65.0,1.0)*0.075;
    // Sample the touch field per pixel: vertex interpolation erased small highlights.
    float ridge=smoothstep(0.002,0.13,touch.a)*localMask;
    float directional=0.65+0.35*dot(normalize(slope+vec2(0.00001)),normalize(vec2(-0.7,0.6)));
    float sheen=pow(ridge,0.75)*directional*uTouchStrength;
    color.rgb+=vec3(0.70,0.77,0.84)*sheen*0.32;
    color.rgb*=1.0+dot(slope,vec2(-0.9,0.7))*localMask*uTouchStrength*3.0;
  }
  color.rgb*=1.0-0.10*smoothstep(180.0,650.0,vDepth);
  float haze=smoothstep(550.0,2400.0,vDepth);
  color.rgb=mix(color.rgb,uBackground,haze*0.64);
  color.a*=1.0-smoothstep(3100.0,4400.0,vDepth);
  color.a*=mix((1.0-vRetire)*uRowOpacity,1.0,uExpand);
  if(color.a<0.005)discard;
  gl_FragColor=color;
}`;
export const screenVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const screenFragment=`
uniform sampler2D uScene;
uniform float uChroma;
uniform vec2 uResolution;
varying vec2 vUv;
void main(){
  vec2 p=vUv-0.5;
  vec2 barrel=vUv+p*dot(p,p)*uChroma*0.004;
  // 전체 렌더 결과를 채널별로 분리해 카드 실루엣 외곽에도 RGB 번짐을 만든다.
  vec2 offset=(p*0.9+vec2(0.48,-0.22))*uChroma*1.1/uResolution;
  vec3 col;
  col.r=texture2D(uScene,barrel+offset).r;
  col.g=texture2D(uScene,barrel).g;
  col.b=texture2D(uScene,barrel-offset).b;
  col*=1.0-0.22*dot(p,p);
  gl_FragColor=vec4(col,1.0);
}`;
