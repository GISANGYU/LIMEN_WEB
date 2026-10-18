import * as THREE from '../vendor/three.module.min.js';
import {cardVertex,cardFragment,screenVertex,screenFragment} from './shaders.js';
import {createArtwork,createCaption} from './textures.js';
import {InfiniteScroll} from './scroll.js';
import {TouchField} from './touch-field.js';
import {Pointer} from './pointer.js';
import {Space} from './space.js';
import {deformPoint,flowPath,smooth} from './deformation.js';
const mod=(n,d)=>((n%d)+d)%d;
const gcd=(a,b)=>b?gcd(b,a%b):a;

export class Gallery{
  constructor(canvas,settings){
    this.canvas=canvas;this.settings=settings;this.items=[];this.sources=[];this.last=performance.now();this.time=0;
    this.surface=document.querySelector('#gallery-surface');this.scroll=new InfiniteScroll(this.surface);
    this.expansion=null;
    this.onActivationDown=e=>{if(e.button===0&&this.scroll.enabled&&!this.scroll.ignore(e.target))this.activationStart={x:e.clientX,y:e.clientY};};
    this.onActivationUp=e=>{
      const start=this.activationStart;this.activationStart=null;
      if(!start||!this.scroll.enabled||this.expansion||Math.hypot(start.x-e.clientX,start.y-e.clientY)>6)return;
      this.pointer.x=e.clientX/innerWidth*2-1;this.pointer.y=1-e.clientY/innerHeight*2;this.pointer.active=true;
      const hit=this.pickHovered(this.deformationParams());if(hit)this.onActivate?.(hit.index,hit);
    };
    this.surface.addEventListener('pointerdown',this.onActivationDown);this.surface.addEventListener('pointerup',this.onActivationUp);
    this.touch=new TouchField();this.pointer=new Pointer(this.touch);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
    this.background=new THREE.Color('#e8e7e3');this.scene=new THREE.Scene();this.space=new Space(this.background);
    this.camera=new THREE.PerspectiveCamera(45,1,1,10000);this.camera.position.z=1000;
    this.geometry=new THREE.PlaneGeometry(1,1,72,48);
    this.raycaster=new THREE.Raycaster();this.pointerNdc=new THREE.Vector2();this.pickVector=new THREE.Vector3();
    this.pickMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    this.pickTemplate=new THREE.PlaneGeometry(1,1,24,36);this.pickBase=this.pickTemplate.attributes.position.array.slice();
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.post=new THREE.Scene();this.postCamera=new THREE.Camera();
    this.postMaterial=new THREE.ShaderMaterial({vertexShader:screenVertex,fragmentShader:screenFragment,depthTest:false,depthWrite:false,uniforms:{uScene:{value:this.target.texture},uChroma:{value:0},uResolution:{value:new THREE.Vector2()}}});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.postMaterial);this.post.add(this.quad);
    this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.resize();
  }
  material(asset,caption=false){return new THREE.ShaderMaterial({vertexShader:cardVertex,fragmentShader:cardFragment,transparent:true,side:THREE.DoubleSide,depthWrite:!caption,uniforms:{uMap:{value:asset.map},uImageSize:{value:new THREE.Vector2(asset.width,asset.height)},uPlaneSize:{value:new THREE.Vector2()},uTime:{value:0},uDepth:{value:0},uDip:{value:0},uWave:{value:0},uCardHeight:{value:1},uBend:{value:new THREE.Vector2()},uBackground:{value:this.background},uCaption:{value:caption?1:0},uChroma:{value:0},uTouch:{value:this.touch.texture},uTouchStrength:{value:1},uHover:{value:0},uRowOpacity:{value:1},uExpand:{value:0},uExpandTarget:{value:new THREE.Vector4(0,0,1,1)},uBufferSize:{value:this.postMaterial.uniforms.uResolution.value},uPointerActive:{value:0},uPointer:{value:new THREE.Vector2(-10,-10)},uViewport:{value:new THREE.Vector2(1,1)}}});}
  clearInstances(){for(const item of this.items){for(const mesh of [item.art,item.caption]){this.scene.remove(mesh);mesh.material.dispose();}item.pick.geometry.dispose();}this.items=[];}
  setItems(data,assets){
    this.clearInstances();for(const source of this.sources){source.asset.map.dispose();source.caption?.map.dispose();}
    this.sources=data.map((item,i)=>({data:item,asset:assets?.[i]||createArtwork(item.kind??i%6),caption:null}));
    const list=document.querySelector('#text-list');list.replaceChildren();data.forEach((item,index)=>{const li=document.createElement('li'),button=document.createElement('button');button.textContent=`${item.title} · ${item.date||''}`;button.setAttribute('aria-label',`Read ${item.title}${item.date?' — '+item.date:''}`);button.onclick=()=>this.onActivate?.(index,null);li.append(button);list.append(li);});
    this.reset();this.resize();
  }
  deformationParams(){const s=this.settings;return {time:this.time,bendLow:this.bendY,bendHigh:this.height*.52,cardHeight:this.cardHeight,dip:s.dip,wave:s.wave,depth:s.depth};}
  startExpansion(item){
    item=item||this.items[0];this.expansion={item,progress:0,target:new THREE.Vector4(0,0,innerWidth*.8,innerWidth*.45)};
    item.art.renderOrder=3;item.art.material.depthTest=false;item.art.material.depthWrite=false;
  }
  retargetExpansion(index){
    const target=this.expansion?.target.clone();this.finishExpansion();
    const item=this.items.filter(i=>i.index===index).sort((a,b)=>Math.abs(a.art.position.y)-Math.abs(b.art.position.y))[0];
    this.startExpansion(item);this.expansion.progress=1;if(target)this.expansion.target.copy(target);
  }
  finishExpansion(){
    if(this.expansion){const art=this.expansion.item.art;art.renderOrder=0;art.material.depthTest=true;art.material.depthWrite=true;art.material.uniforms.uExpand.value=0;}
    this.expansion=null;
  }
  reset(){this.hasLooped=false;this.scroll.reset();this.touch.clear();}
  resize(){
    const previous=this.expansion?{index:this.expansion.item.index,progress:this.expansion.progress,target:this.expansion.target.clone()}:null;
    const w=innerWidth,h=innerHeight;this.width=w;this.height=h;
    this.renderer.setSize(w,h,false);this.renderer.getDrawingBufferSize(this.postMaterial.uniforms.uResolution.value);
    const size=this.postMaterial.uniforms.uResolution.value;this.target.setSize(size.x,size.y);
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(h/2000));this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    this.columns=w<760||this.settings.single||this.sources.length===1?1:2;
    const gap=this.columns===2?38:0;
    const available=w<700?w-40:Math.min(1300,w*.84);
    this.cardWidth=Math.min(this.columns===1?920:760,(available-gap)/this.columns);
    this.cardHeight=this.cardWidth*.52;this.captionHeight=66;
    this.rowHeight=this.cardHeight+this.captionHeight+32;
    this.startY=w<700?165:175;
    this.baseRows=this.sources.length?this.sources.length/gcd(this.sources.length,this.columns):0;
    this.clearInstances();
    if(!this.baseRows){this.cycleHeight=1;return;}
    for(const [i,source] of this.sources.entries()){
      source.caption?.map.dispose();source.caption=createCaption(source.data,i,this.cardWidth,this.settings.light);
    }
    // 상단에서 접힌 뒤 오래 남는 띠까지 포함해 화면 밖에서만 재배치한다.
    const repeats=Math.max(1,Math.ceil((h+2100+this.rowHeight*2)/(this.baseRows*this.rowHeight)));
    this.renderRows=this.baseRows*repeats;this.cycleHeight=this.renderRows*this.rowHeight;
    for(let r=0;r<this.renderRows;r++)for(let col=0;col<this.columns;col++){
      const index=(r*this.columns+col)%this.sources.length;
      const source=this.sources[index];
      const art=new THREE.Mesh(this.geometry,this.material(source.asset));const caption=new THREE.Mesh(this.geometry,this.material(source.caption,true));
      const pick=new THREE.Mesh(this.pickTemplate.clone(),this.pickMaterial);
      art.frustumCulled=caption.frustumCulled=false;
      art.scale.set(this.cardWidth,this.cardHeight,1);caption.scale.set(this.cardWidth,this.captionHeight,1);
      art.material.uniforms.uPlaneSize.value.set(this.cardWidth,this.cardHeight);caption.material.uniforms.uPlaneSize.value.set(this.cardWidth,this.captionHeight);
      // 먼 쪽 접힘이 가까운 카드 위를 덮지 않도록 깊이 검사를 유지한다.
      art.renderOrder=0;caption.renderOrder=1;this.scene.add(art,caption);
      this.items.push({art,caption,pick,hover:0,row:r,index,x:this.columns===1?0:(col===0?-1:1)*(this.cardWidth+gap)/2});
    }
    if(previous){this.expansion=null;this.startExpansion(this.items.find(i=>i.index===previous.index));this.expansion.progress=previous.progress;this.expansion.target.copy(previous.target);}
    this.background.set(this.settings.light?'#e8e7e3':'#090c12');
    this.space.resize(h,this.settings.light);
    document.body.classList.toggle('light',!!this.settings.light);
    this.canvas.dataset.baseRows=String(this.baseRows);this.canvas.dataset.cycle=String(this.cycleHeight);
    this.canvas.dataset.cardWidth=this.cardWidth.toFixed(1);this.canvas.dataset.startY=String(this.startY);
  }
  pickHovered(params){
    if(!this.pointer.active)return null;
    this.pointerNdc.set(this.pointer.x,this.pointer.y);this.raycaster.setFromCamera(this.pointerNdc,this.camera);
    const candidates=[];
    for(const item of this.items){
      const y=item.art.position.y;
      if(!item.art.visible||item.art.material.uniforms.uRowOpacity.value<.02||y<-this.height*.6-this.cardHeight||y>params.bendLow+1800+this.cardHeight)continue;
      const pos=item.pick.geometry.attributes.position;
      for(let j=0;j<pos.count;j++){
        const p=deformPoint(this.pickBase[j*3]*this.cardWidth+item.x,this.pickBase[j*3+1]*this.cardHeight+y,{...params,localX:this.pickBase[j*3]*this.cardWidth,cardWidth:this.cardWidth});
        this.pickVector.set(p.x,p.y,p.z).project(this.camera);
        const u=this.pickVector.x*.5+.5,v=this.pickVector.y*.5+.5;
        const distance=Math.hypot((u-this.pointer.x*.5-.5)*this.width,(v-this.pointer.y*.5-.5)*this.height);
        const t=Math.max(0,Math.min(1,(distance-20)/48)),mask=1-t*t*(3-2*t);
        const h=this.touch.sample(u,v)*mask;
        pos.setXYZ(j,p.x,p.y,p.z+h*30*this.settings.touch);
      }
      pos.needsUpdate=true;item.pick.geometry.computeBoundingSphere();item.pick.updateMatrixWorld();item.pick.userData.item=item;candidates.push(item.pick);
    }
    const hits=this.raycaster.intersectObjects(candidates,false);
    return hits.length?hits[0].object.userData.item:null;
  }
  frame(now){
    const dt=Math.min((now-this.last)/1000,0.05);this.last=now;const s=this.settings;
    if(!s.pause)this.time+=dt*s.speed;
    this.touch.update(dt);this.pointer.update(dt);
    const expansion=this.expansion,expand=expansion?.progress||0;
    const parallax=(this.width>700?s.parallax:0)*(1-expand);
    const yaw=this.pointer.smoothX*.035*parallax,pitch=this.pointer.smoothY*.018*parallax;
    this.camera.position.set(Math.sin(yaw)*1000,Math.sin(pitch)*1000,Math.cos(yaw)*Math.cos(pitch)*1000);
    this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();
    this.scroll.gain=s.scrollGain;
    const current=this.scroll.update(dt,s.smoothing,this.cycleHeight);
    if(current>=this.cycleHeight||current< -5)this.hasLooped=true;
    // 아래에서 올라온 행 → 상단에서 접혀 아래로 처짐 → 다시 위로 이동 → 화면 밖 재순환.
    this.bendY=this.height/2-238+this.height*(s.bendStart-.17);
    const bottom=-this.height/2-this.rowHeight*1.5;
    const initial=this.height/2-this.startY-this.cardHeight/2;
    for(const item of this.items){
      const raw=initial-item.row*this.rowHeight+current;
      const y=mod(raw-bottom,this.cycleHeight)+bottom;
      item.art.position.set(item.x,y,0);item.caption.position.set(item.x,y-this.cardHeight/2-this.captionHeight/2-8,0);
      const admitted=raw>=bottom||this.hasLooped;
      const visible=admitted&&y>-this.height/2-this.rowHeight&&y<this.bendY+1800+this.cardHeight;
      item.art.visible=visible||item===expansion?.item;item.caption.visible=visible;
      for(const mesh of [item.art,item.caption]){
        const u=mesh.material.uniforms;u.uTime.value=this.time;u.uDepth.value=s.depth;u.uDip.value=s.dip;u.uWave.value=s.wave;u.uCardHeight.value=this.cardHeight;
        const travel=y-this.bendY;
        u.uRowOpacity.value=1-smooth(650,1000,Math.max(0,-flowPath(travel,s.depth,s.dip).z));
        if(mesh===item.caption){const fade=Math.max(0,Math.min(1,(travel-120)/380));u.uRowOpacity.value*=1-fade*fade*(3-2*fade);}
        u.uBend.value.set(this.bendY,this.height*.52);u.uChroma.value=s.chroma;u.uTouchStrength.value=mesh===item.caption?0:s.touch;u.uPointerActive.value=this.pointer.active?1:0;u.uPointer.value.set(this.pointer.x*.5+.5,this.pointer.y*.5+.5);u.uViewport.value.set(this.width,this.height);const selected=expansion?.item===item&&mesh===item.art;
        u.uExpand.value=selected?expand:0;
        if(selected)u.uExpandTarget.value.copy(expansion.target);
        else u.uRowOpacity.value*=Math.max(0,1-expand*1.6);
        mesh.material.wireframe=s.wire;
      }
    }
    this.scene.updateMatrixWorld();
    const hovered=expansion?null:this.pickHovered(this.deformationParams());
    const hoverBlend=1-Math.exp(-dt*7);
    for(const item of this.items){item.hover+=((item===hovered?1:0)-item.hover)*hoverBlend;item.art.material.uniforms.uHover.value=item.hover;}
    this.renderer.setRenderTarget(this.target);this.renderer.autoClear=true;this.renderer.render(this.space.scene,this.camera);
    this.renderer.clearDepth();this.renderer.autoClear=false;this.renderer.render(this.scene,this.camera);this.renderer.autoClear=true;
    const u=this.postMaterial.uniforms;u.uChroma.value=s.chroma;
    this.renderer.setRenderTarget(null);this.renderer.render(this.post,this.postCamera);
    this.canvas.dataset.expansion=expand.toFixed(3);this.canvas.dataset.scroll=current.toFixed(2);this.canvas.dataset.path="shallow-depth-flow";this.canvas.dataset.grain="0";this.canvas.dataset.time=this.time.toFixed(3);
    this.canvas.dataset.hovered=hovered?String(hovered.index+1):'none';this.canvas.dataset.zoom=String(Math.max(0,...this.items.map(i=>i.hover)));
    this.canvas.dataset.touchEnergy=this.touch.energy.toFixed(4);this.canvas.dataset.pointerX=this.pointer.x.toFixed(3);this.canvas.dataset.pointerY=this.pointer.y.toFixed(3);this.canvas.dataset.cameraX=this.camera.rotation.y.toFixed(5);this.canvas.dataset.cameraPositionX=this.camera.position.x.toFixed(2);
  }
  dispose(){this.surface.removeEventListener('pointerdown',this.onActivationDown);this.surface.removeEventListener('pointerup',this.onActivationUp);window.removeEventListener('resize',this.onResize);this.scroll.dispose();this.pointer.dispose();this.touch.dispose();this.space.dispose();this.clearInstances();for(const source of this.sources){source.asset.map.dispose();source.caption?.map.dispose();}this.geometry.dispose();this.pickTemplate.dispose();this.pickMaterial.dispose();this.quad.geometry.dispose();this.postMaterial.dispose();this.target.dispose();this.renderer.dispose();}
}
