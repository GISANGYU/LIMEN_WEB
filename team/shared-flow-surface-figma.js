export function createFlowSurface(canvas,container,atmosphere){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
 const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
 const fragment=`precision highp float;
 uniform sampler2D smoke;uniform sampler2D artwork;uniform vec2 resolution;uniform float time;uniform float mobile;
 float field(vec2 uv){vec2 d=vec2(.006,.006*resolution.x/resolution.y);float v=texture2D(smoke,uv).r*.25;
 v+=(texture2D(smoke,uv+vec2(d.x,0.)).r+texture2D(smoke,uv-vec2(d.x,0.)).r+texture2D(smoke,uv+vec2(0.,d.y)).r+texture2D(smoke,uv-vec2(0.,d.y)).r)*.125;
 v+=(texture2D(smoke,uv+d).r+texture2D(smoke,uv-d).r+texture2D(smoke,uv+vec2(d.x,-d.y)).r+texture2D(smoke,uv+vec2(-d.x,d.y)).r)*.0625;return v;}
 void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 px=vec2(.012,.012*resolution.x/resolution.y);
 float ink=field(uv);
 float sx=field(uv+vec2(px.x,0.))-field(uv-vec2(px.x,0.));
 float sy=field(uv+vec2(0.,px.y))-field(uv-vec2(0.,px.y));
 // Displace the actual fibrous artwork with the diffusing pointer field.
 // Both the luminous contour and its fine texture move through the same UVs.
 vec2 warp=vec2(sy,-sx)*.19+vec2(sx,sy)*.07;
 warp+=vec2(sin(uv.y*44.+ink*6.),cos(uv.x*39.-ink*5.))*ink*.004;
 vec2 sampleUV=uv+warp;
 sampleUV.y=.64+sampleUV.y*.36;
 sampleUV.x*=mix(1.,1./1.8,mobile);
 vec3 c=texture2D(artwork,clamp(sampleUV,.001,.999)).rgb;
 float luminance=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(.12,.17,.36),vec3(.56,.57,.86),pow(luminance,.9));
 c+=vec3(.025,.015,.07)*ink*.2;
 gl_FragColor=vec4(c,1.);
 }`;
 const simulation=`precision highp float;
 uniform sampler2D previous;uniform vec2 size;uniform vec2 cursor;uniform vec2 lastCursor;uniform vec2 velocity;uniform float energy;uniform float time;uniform float dt;
 float lineDistance(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.00001),0.,1.));}
 void main(){vec2 uv=gl_FragCoord.xy/size;float aspect=size.y/size.x;vec2 p=uv*vec2(1.,aspect);float t=time*.25;
 vec2 curl=vec2(sin(p.x*15.+t)*cos(p.y*15.-t),-cos(p.x*15.+t)*sin(p.y*15.-t));
 curl+=.4*vec2(sin(p.x*31.-t)*cos(p.y*31.+t),-cos(p.x*31.-t)*sin(p.y*31.+t));
 vec2 delta=p-cursor*vec2(1.,aspect);float local=exp(-dot(delta,delta)/.02);
 vec2 flow=curl*.0007+velocity*local*.022+vec2(0.,.0008);
 vec2 from=uv-flow*vec2(1.,1./aspect)*dt;
 vec2 pixel=1./size;
 float value=texture2D(previous,from).r*.7;
 value+=(texture2D(previous,from+vec2(pixel.x,0.)).r+texture2D(previous,from-vec2(pixel.x,0.)).r+texture2D(previous,from+vec2(0.,pixel.y)).r+texture2D(previous,from-vec2(0.,pixel.y)).r)*.075;
 value*=pow(.991,dt);
 float d=lineDistance(p,lastCursor*vec2(1.,aspect),cursor*vec2(1.,aspect));
 float injection=exp(-d*d/.0055)*energy*.16*dt;
 value=min(1.,value+injection);
 gl_FragColor=vec4(value,value,value,1.);}`;
 function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;}
 const vs=shader(gl.VERTEX_SHADER,vertex);if(!vs)return;
 function makeProgram(code){const fs=shader(gl.FRAGMENT_SHADER,code);if(!fs)return null;const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null;}
 const render=makeProgram(fragment),sim=makeProgram(simulation);if(!render||!sim)return;
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 function bind(p){gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);}
 const names=['previous','size','cursor','lastCursor','velocity','energy','time','dt'];const u=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(sim,n)]));
 const r={size:gl.getUniformLocation(render,'resolution'),time:gl.getUniformLocation(render,'time'),smoke:gl.getUniformLocation(render,'smoke'),artwork:gl.getUniformLocation(render,'artwork'),mobile:gl.getUniformLocation(render,'mobile')};
 const artwork=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,artwork);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([2,5,8,255]));
 const image=new Image();image.onload=()=>{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,artwork);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);container.classList.add('fluid-ready');start();};image.src=new URL('../assets/figma-1102/flow.png',import.meta.url).href;
 let targets=[],w=0,h=0,frame=0,visible=true,paused=false,occluded=false,contextLost=false,clock=0,lastFrame=0,energy=0;
 let pointer=[.5,.5],lastPointer=[.5,.5],lastEvent=[.5,.5],velocity=[0,0],desiredVelocity=[0,0],targetPointer=[.5,.5],targetEnergy=0,hasPointer=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function target(){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);return {texture,framebuffer:f};}
 function resize(){if(contextLost)return;const b=container.getBoundingClientRect(),d=Math.min(devicePixelRatio,document.body.classList.contains("depth-version")?1:1.35);canvas.width=Math.round(b.width*d);canvas.height=Math.round(b.height*d);w=Math.min(512,canvas.width);h=Math.round(w*b.height/b.width);targets.forEach(t=>{gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.framebuffer)});targets=[target(),target()];start();}
 function start(){if(!frame&&visible&&!paused&&!occluded&&!document.hidden&&!contextLost)frame=requestAnimationFrame(draw);}
 function draw(ms){frame=0;if(!visible||paused||occluded||document.hidden||contextLost)return;if(document.body.classList.contains("depth-version")&&lastFrame&&ms-lastFrame<32){start();return;}const dt=lastFrame?Math.min(2,(ms-lastFrame)/16.667):1;lastFrame=ms;if(!reduced.matches)clock+=dt/60;
 if(!reduced.matches){const ease=1.-Math.pow(.8,dt);pointer=pointer.map((v,i)=>v+(targetPointer[i]-v)*ease);velocity=velocity.map((v,i)=>v+(desiredVelocity[i]-v)*ease);desiredVelocity=desiredVelocity.map(v=>v*Math.pow(.9,dt));energy+=(targetEnergy-energy)*ease;targetEnergy*=Math.pow(.94,dt);bind(sim);gl.bindFramebuffer(gl.FRAMEBUFFER,targets[1].framebuffer);gl.viewport(0,0,w,h);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].texture);gl.uniform1i(u.previous,0);gl.uniform2f(u.size,w,h);gl.uniform2f(u.cursor,...pointer);gl.uniform2f(u.lastCursor,...lastPointer);gl.uniform2f(u.velocity,...velocity);gl.uniform1f(u.energy,energy);gl.uniform1f(u.time,clock);gl.uniform1f(u.dt,dt);gl.drawArrays(gl.TRIANGLES,0,6);targets.reverse();energy*=Math.pow(.91,dt);velocity=velocity.map(v=>v*.92);lastPointer=[...pointer];}
 bind(render);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].texture);gl.uniform1i(r.smoke,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,artwork);gl.uniform1i(r.artwork,1);gl.uniform1f(r.mobile,innerWidth<=600?1:0);gl.uniform2f(r.size,canvas.width,canvas.height);gl.uniform1f(r.time,clock);gl.drawArrays(gl.TRIANGLES,0,6);if(!reduced.matches)frame=requestAnimationFrame(draw);}
 atmosphere.addEventListener('pointermove',e=>{if(reduced.matches)return;const b=container.getBoundingClientRect(),next=[(e.clientX-b.left)/b.width,1-(e.clientY-b.top)/b.height];if(!hasPointer){lastEvent=next;lastPointer=next;pointer=next;hasPointer=true;}desiredVelocity=[Math.max(-1,Math.min(1,(next[0]-lastEvent[0])*18)),Math.max(-1,Math.min(1,(next[1]-lastEvent[1])*18))];targetEnergy=Math.min(1,targetEnergy+Math.hypot(...desiredVelocity)*.65+.07);targetPointer=next;lastEvent=next;start();},{passive:true});
 atmosphere.addEventListener('pointerleave',()=>{hasPointer=false;targetEnergy=0;});
 new ResizeObserver(resize).observe(container);
 new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible){lastFrame=0;start();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'}).observe(container);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;start();}});
 reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;start();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);container.classList.remove('fluid-ready');});
 document.addEventListener('limen-opaque-stage',e=>{occluded=Boolean(e.detail.covered);if(occluded){cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;start();}});
 document.addEventListener('limen-toggle-motion',e=>{paused=Boolean(e.detail.paused);if(paused){cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;start();}});
 resize();start();
 return ()=>{cancelAnimationFrame(frame);gl.getExtension("WEBGL_lose_context")?.loseContext();};
}
