// Separate-page study: deform only the rear image and its lettering.
// Preserve the supplied image. Hover uses a small, localized liquid refraction;
// soft focus belongs only to the scroll transition into the existing slogan.
const hero = document.querySelector('#intro');
const photo = document.querySelector('#heroPhoto');
const foregroundGlass = document.querySelector('#heroGlassDepth');
const canvas = document.querySelector('#heroLens');
const image = photo.querySelector('img');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches) photo.classList.add('intro-preparing');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
let p=0, needsScroll=true, lens=null;
function scrollState() {
  const r=hero.getBoundingClientRect();
  p=clamp(-r.top/r.height/1.25);
  const dissolve=smooth((p-.05)/.95);
  photo.style.setProperty('--hero-photo-opacity',String(1-dissolve));
  photo.style.setProperty('--hero-photo-blur',`${reduced.matches?0:18*dissolve}px`);
  photo.style.visibility=p>=1?'hidden':'visible';
  // Fade the front plane with the hero, without any lens transform or blur.
  if(foregroundGlass){foregroundGlass.style.opacity=String(1-dissolve);foregroundGlass.style.visibility=p>=1?'hidden':'visible';}
  hero.style.setProperty('--hero-foot-opacity',String(1-smooth(p/.25)));
  document.body.classList.toggle('is-reference-hero',r.bottom>innerHeight*.22);
  const header=document.querySelector('.c-Header');if(header)header.inert=innerWidth>767||r.bottom<=innerHeight*.22;
  needsScroll=false;
}
addEventListener('scroll',()=>{needsScroll=true},{passive:true});
addEventListener('resize',()=>{needsScroll=true;lens?.resize()},{passive:true});
reduced.addEventListener('change',()=>{needsScroll=true});
function setupLens(){
  if(reduced.matches)return;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
  if(!gl)return;
  const vs=`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
  const fs=`precision highp float;varying vec2 uv;uniform sampler2D photo;uniform vec2 cover,mouse;uniform float aspect,time,strength,radius,intro,layoutInset;
  float ink(vec3 c){return smoothstep(.74,.94,min(c.r,min(c.g,c.b)));}
  vec3 readPhoto(vec2 q){
    vec2 sampleAt=q;
    // Reposition the existing image lettering as a layout translation; preserve pixels and color.
    float titleBand=(1.-smoothstep(.43,.46,q.x))*smoothstep(.59,.62,q.y)*(1.-smoothstep(.85,.88,q.y));
    float brandBand=(1.-smoothstep(.15,.18,q.x))*smoothstep(.88,.91,q.y);
    float footBand=(1.-smoothstep(.22,.25,q.x))*(1.-smoothstep(.20,.24,q.y));
    if(layoutInset>0.)sampleAt.x+=(.06017-layoutInset)*titleBand+(.04693-layoutInset)*max(brandBand,footBand);
    return texture2D(photo,clamp(sampleAt,vec2(.001),vec2(.999))).rgb;
  }
  void main(){vec2 q=(uv-.5)*cover+.5;vec2 delta=(uv-mouse)*vec2(aspect,1.);float r=length(delta);
  float influence=(1.-smoothstep(radius*.72,radius,r))*min(1.,strength/.005);
  vec2 sourceMouse=(mouse-.5)*cover+.5;
  float onLogo=(1.-smoothstep(.165,.185,abs(sourceMouse.x-.225)))*(1.-smoothstep(.067,.085,abs(sourceMouse.y-.762)));
  // A clear glass lens bends and enlarges the original pixels without blurring.
  // Crossing the logo increases the liquid bend, creating a reversible glyph morph.
  vec2 shift=-(uv-mouse)*cover*(.28-.11*onLogo)*influence;
  // No animated wave on hover: keep only smooth local optical magnification.
  vec3 base=readPhoto(q);
  float wordmarkZone=(1.-smoothstep(.185,.215,abs(q.x-.225)))*(1.-smoothstep(.085,.115,abs(q.y-.762)));
  float logo=ink(base)*wordmarkZone;
  // Keep the entire wordmark zone stationary, including antialiased edges.
  // Moving a second copy of the baked-in logo creates an unwanted outline.
  float navigationZone=smoothstep(.88,.92,q.y);
  float lowerCopy=(1.-smoothstep(.19,.23,q.x))*(1.-smoothstep(.18,.24,q.y));
  float taglineZone=(1.-smoothstep(.21,.24,abs(q.x-.145)))*(1.-smoothstep(.025,.04,abs(q.y-.638)));
  float petalMotion=1.-max(wordmarkZone,max(navigationZone,max(lowerCopy,taglineZone)));
  // The rear artwork stays still at rest; the cursor alone refracts it.
  vec2 drift=vec2(0.);
  vec3 color=readPhoto(q+drift+shift);
  // The original white wordmark spreads into colored optical echoes, then resolves.
  float spread=pow(1.-intro,2.);
  vec3 bloom=vec3(0.);
  if(spread>.001){for(int i=-8;i<=8;i++){
    float f=float(i)/8.;
    vec2 offset=vec2(f*.075*spread,sin(f*4.+time*2.)*.012*spread);
    vec2 bq=q+offset;
    float a=ink(readPhoto(bq))*(1.-smoothstep(.165,.19,abs(bq.x-.225)))*(1.-smoothstep(.067,.09,abs(bq.y-.762)));
    vec3 spectral=mix(vec3(.38,.55,1.),vec3(.8,.48,1.),f*.5+.5);
    bloom+=a*spectral*(1.-abs(f)*.45)/9.;
  }
  }
  float opening=smoothstep(0.,.16,intro);
  float settle=smoothstep(.18,1.,intro);
  color=mix(color*(1.-logo),color,settle);
  color+=bloom*spread*1.25;
  color*=.55+.45*opening;
  vec4 pixel=vec4(color,1.);
  // Tint only the photographed blue petals under the lens; keep white lettering white.
  float chroma=max(pixel.r,max(pixel.g,pixel.b))-min(pixel.r,min(pixel.g,pixel.b));
  vec3 violet=vec3(max(pixel.r,pixel.b*.83),pixel.g*.65,pixel.b);
  float tint=influence*smoothstep(.045,.20,chroma)*.95;
  // A restrained local emission, confined to colored petals rather than white type.
  vec3 glow=vec3(.025,.012,.04)*influence*smoothstep(.045,.20,chroma);
  // Activate only when the cursor touches a white letter, not the floral background.
  float letterHover=ink(readPhoto(sourceMouse))*onLogo*min(1.,strength/.005)*settle;
  vec2 glyphUV=q+shift;
  float glyph=ink(readPhoto(glyphUV))*wordmarkZone;
  float softLight=0.;
  if(letterHover>.001){for(int j=0;j<12;j++){
    float angle=float(j)*6.2831853/12.;
    vec2 ray=vec2(cos(angle),sin(angle));
    softLight+=ink(readPhoto(glyphUV+ray*.0025))*.055;
    softLight+=ink(readPhoto(glyphUV+ray*.006))*.022;
  }
  }
  // A soft emission follows the glyph silhouette; no solid stroke or persistent outline.
  vec3 logoLight=vec3(.72,.84,1.)*letterHover*(softLight*.22+glyph*.08)*wordmarkZone;
  gl_FragColor=vec4(min(vec3(1.),mix(pixel.rgb,violet,tint)+glow+logoLight),pixel.a);}`;
  function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Hero shader');return sh;}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  // The foreground glass is a sibling DOM layer; this texture excludes it.
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const u=Object.fromEntries(['photo','cover','mouse','aspect','time','strength','radius','intro','layoutInset'].map(n=>[n,gl.getUniformLocation(program,n)]));gl.uniform1i(u.photo,0);
  let mx=.5,my=.5,tx=.5,ty=.5,amount=0,target=0,inside=false;
  const cursor=document.createElement('div');cursor.className='hero-glass-cursor';photo.append(cursor);
  hero.addEventListener('pointermove',e=>{return;tx=e.clientX/innerWidth;ty=1-e.clientY/innerHeight;target=.005;inside=true;cursor.classList.add('is-visible')},{passive:true});
  hero.addEventListener('pointerleave',()=>{target=0;inside=false;cursor.classList.remove('is-visible')},{passive:true});
  const started=performance.now();
  let lastDraw=0,dirty=true;
  function resize(){dirty=true;photo.classList.add('has-lens');const dpr=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);const screen=innerWidth/innerHeight,source=image.naturalWidth/image.naturalHeight;gl.uniform2f(u.cover,innerWidth>650?1:Math.min(1,screen/source),innerWidth>650?1:Math.min(1,source/screen));gl.uniform1f(u.aspect,screen);gl.uniform1f(u.radius,84/innerHeight);gl.uniform1f(u.layoutInset,innerWidth>767?(parseFloat(document.documentElement.style.getPropertyValue('--grid-inset'))||innerWidth*.05)/innerWidth:0);}
  resize();photo.classList.add('has-lens');
  lens={resize,draw(t){if(!dirty&&t-started>2850)return;if(t-lastDraw<32)return;lastDraw=t;dirty=false;mx+=(tx-mx)*.07;my+=(ty-my)*.07;amount+=(target-amount)*.07;cursor.style.transform=`translate3d(${mx*innerWidth-84}px,${(1-my)*innerHeight-84}px,0)`;const source= image.naturalWidth/image.naturalHeight,screen=innerWidth/innerHeight;const sx=(mx-.5)*(innerWidth>650?1:Math.min(1,screen/source))+.5,sy=(my-.5)*(innerWidth>650?1:Math.min(1,source/screen))+.5;cursor.classList.toggle('is-logo',inside&&Math.abs(sx-.225)<.18&&Math.abs(sy-.762)<.085);gl.uniform2f(u.mouse,mx,my);gl.uniform1f(u.time,t/1000);gl.uniform1f(u.intro,clamp((t-started)/2800));gl.uniform1f(u.strength,reduced.matches?0:amount);gl.drawArrays(gl.TRIANGLES,0,3);photo.classList.remove('intro-preparing');}};
}
image.decode().then(()=>{try{setupLens()}catch{photo.classList.remove('has-lens')}if(!lens)photo.classList.remove('intro-preparing')}).catch(()=>{photo.classList.remove('intro-preparing')});
function frame(t){if(needsScroll)scrollState();if(p<1)lens?.draw(t);requestAnimationFrame(frame)}
scrollState();requestAnimationFrame(frame);

const referenceMenu=document.querySelector('.ref-menu');
const referencePanel=document.querySelector('#referenceHeroMenu');
referenceMenu?.addEventListener('click',()=>{const open=referenceMenu.getAttribute('aria-expanded')!=='true';referenceMenu.setAttribute('aria-expanded',String(open));referenceMenu.setAttribute('aria-label',open?'전체 메뉴 닫기':'전체 메뉴 열기');referencePanel.hidden=!open;});
referencePanel?.addEventListener('click',e=>{if(e.target.closest('a')){referencePanel.hidden=true;referenceMenu.setAttribute('aria-expanded','false');}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&referencePanel){referencePanel.hidden=true;referenceMenu.setAttribute('aria-expanded','false');}});
