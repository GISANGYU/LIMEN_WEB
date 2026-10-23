// ver1 stroke reveal + ver2 shared studio geometry, driven by the page's existing rAF.
import * as THREE from 'three';
import { buildStudio, INFO, DIM } from './studio-geometry.js';
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = (a,b,p) => { const t=clamp((p-a)/(b-a)); return t*t*(3-2*t); };
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};

export function createSpace(section) {
  const $=s=>section.querySelector(s), drawing=$('#spaceDrawing'), svg=$('#spaceSvg'), canvas=$('#spaceModel');
  const markerLayer=$('#spaceMarkers'), list=$('#spaceDevices'), S=buildStudio();
  let progress=0, ready=false, selected='space', last=-1, W=1, H=1, renderer=null;
  const scene=new THREE.Scene(); scene.add(S.root,new THREE.HemisphereLight('#c4e8ff','#111a35',2));
  const light=new THREE.DirectionalLight('#b0d8ff',2);light.position.set(1,8,6);scene.add(light);
  const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);renderer.localClippingEnabled=true;
  } catch { canvas.hidden=true; }
  S.mats.forEach(m=>{m.transparent=true;m.opacity=0;m.depthWrite=false;m.clippingPlanes=[clip];m.color.lerp(new THREE.Color('#69829c'),.65);});
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,150);
  camera.position.set(10,10,16);camera.lookAt(0,1.6,1.3);camera.updateMatrixWorld();
  const project=pos=>{const v=pos.clone().project(camera);return [(v.x+1)*W/2,(1-v.y)*H/2];};
  const paths=[],labels=[],groups=new Map(),buttons=new Map(),markers=new Map();
  const holder=node('g');svg.appendChild(holder);
  // Bundle paths with the same draw interval while preserving the actual model edges.
  const bundles=new Map();
  S.lines.forEach(l=>{
    const id=l.id||(/k-struct|k-wire/.test(l.cls)?'space':'');
    const a=Math.floor(l.a*50)/50,b=Math.ceil(l.b*50)/50,key=`${l.cls}:${id}:${a}:${b}:${Math.round(l.op*10)}`;
    if(!bundles.has(key))bundles.set(key,{cls:l.cls,id,a,b,op:l.op,segments:[]});
    bundles.get(key).segments.push(l.pts);
  });
  for(const id of ['',...INFO.map(i=>i.id)]){const g=node('g',{'data-device':id});holder.appendChild(g);groups.set(id,g);}
  bundles.forEach(l=>{
    const el=node('path',{class:l.cls,pathLength:1});el.style.strokeDasharray='1 1';el.style.strokeDashoffset=1;groups.get(l.id).appendChild(el);
    let hit=null;
    if(l.id&&l.id!=='space'){
      hit=node('path',{class:'space-hit','aria-hidden':'true'});groups.get(l.id).appendChild(hit);
      hit.addEventListener('pointerenter',()=>{if(ready)select(l.id);});
      hit.addEventListener('click',()=>{if(ready)select(l.id);});
    }
    paths.push({...l,el,hit,last:-1});
  });
  S.texts.filter(t=>!['SECTION A','Ø4000'].includes(t.text)&&t.cls!=='bub').forEach(t=>{
    const el=node('text',{'text-anchor':t.cls==='left'?'start':'middle',class:'space-measure'});el.textContent=t.text;holder.appendChild(el);labels.push({...t,el});
  });
  INFO.forEach(info=>{
    const button=document.createElement('button');button.type='button';button.dataset.device=info.id;button.disabled=true;
    button.innerHTML=`<span>${info.no}</span><b>${info.title}</b><i>↗</i>`;
    for(const event of ['pointerenter','focus','click'])button.addEventListener(event,()=>{if(ready)select(info.id);});
    list.appendChild(button);buttons.set(info.id,button);
    const marker=document.createElement('button');marker.type='button';marker.className='space-marker';marker.disabled=true;
    marker.setAttribute('aria-label',`${info.title} 설명`);marker.textContent=info.no;
    for(const event of ['pointerenter','focus','click'])marker.addEventListener(event,()=>{if(ready)select(info.id);});
    markerLayer.appendChild(marker);markers.set(info.id,marker);
  });
  const leader=node('g',{class:'space-leaders'});svg.appendChild(leader);const leaders=new Map();
  INFO.forEach(info=>{const l=node('path');leader.appendChild(l);leaders.set(info.id,l);});
  const offsets={space:[-85,22],projector:[-25,-30],kinect:[85,35],light:[0,-48],speaker:[-42,-15],pc:[-30,34]};

  function select(id){
    const info=INFO.find(i=>i.id===id);if(!info)return;
    const changed=selected!==id;selected=id;section.dataset.device=id;
    groups.forEach((g,k)=>g.classList.toggle('is-selected',k===id));
    for(const collection of [buttons,markers])collection.forEach((b,k)=>{b.classList.toggle('is-selected',k===id);b.setAttribute('aria-pressed',String(k===id));});
    Object.entries(S.groups).forEach(([key,group])=>group.helpers.forEach(h=>{h.visible=ready&&key===id;}));
    if(changed){
      $('#spaceDetailTag').textContent=info.en;$('#spaceDetailTitle').textContent=info.title;
      $('#spaceDetailCopy').textContent=info.copy;$('#spaceDetailNote').textContent=info.detail;
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$('.space-detail').animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:250});
    }
  }
  function resize(){
    W=drawing.clientWidth;H=drawing.clientHeight;if(!W||!H)return;
    renderer?.setSize(W,H,false);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const aspect=W/H;camera.left=-aspect;camera.right=aspect;camera.top=1;camera.bottom=-1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const samples=[];
    for(const x of [DIM.X0-.9,DIM.X1+1.5])for(const y of [0,DIM.H+.25])for(const z of [DIM.ZB-.5,DIM.ZR+.15])samples.push(new THREE.Vector3(x,y,z).project(camera));
    const xs=samples.map(p=>p.x*aspect),ys=samples.map(p=>p.y);
    const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const half=Math.max((Math.max(...xs)-Math.min(...xs))/(2*aspect*.92),(Math.max(...ys)-Math.min(...ys))/(2*.87));
    camera.left=cx-half*aspect;camera.right=cx+half*aspect;camera.top=cy+half;camera.bottom=cy-half;camera.updateProjectionMatrix();
    paths.forEach(p=>{
      const d=p.segments.map(pts=>pts.map((v,i)=>{const[x,y]=project(v);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`;}).join('')).join('');
      p.el.setAttribute('d',d);p.hit?.setAttribute('d',d);p.last=-1;
    });
    labels.forEach(t=>{const[x,y]=project(t.pos);t.el.setAttribute('x',x);t.el.setAttribute('y',y);});
    INFO.forEach(info=>{
      const[x,y]=project(S.anchors[info.id]),[dx,dy]=offsets[info.id];
      const mx=Math.max(20,Math.min(W-20,x+dx)),my=Math.max(20,Math.min(H-20,y+dy));
      markers.get(info.id).style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`;
      leaders.get(info.id).setAttribute('d',`M${x} ${y}L${mx} ${my}`);
    });
    last=-1;update(0,progress);
  }
  function update(time,p){
    progress=p;const next=p>=.66;
    if(next!==ready){
      ready=next;section.classList.toggle('is-explorable',ready);
      [...buttons.values(),...markers.values()].forEach(b=>b.disabled=!ready);select(ready?selected:'space');
      $('#spaceHint').textContent=ready?'장치 또는 번호에 마우스를 올려보세요 ↗':'스크롤해 공간을 완성하세요 ↓';
    }
    if(Math.abs(p-last)>.00015){
      last=p;
      paths.forEach(l=>{
        const k=smooth(l.a,l.b,p);if(k!==l.last){l.el.style.strokeDashoffset=(1-k).toFixed(4);l.last=k;}
        const guide=/grid|construct|center/.test(l.cls);
        l.el.style.opacity=((k>0?1:0)*l.op*(guide?1-smooth(.44,.62,p)*.82:1)).toFixed(3);
      });
      labels.forEach(t=>t.el.style.opacity=smooth(t.a,t.a+.035,p).toFixed(3));
      markerLayer.style.opacity=smooth(.59,.67,p).toFixed(3);leader.style.opacity=smooth(.59,.67,p).toFixed(3);
      const volume=smooth(.56,.72,p);clip.constant=-.05+volume*4.85;S.mats.forEach(m=>m.opacity=volume*.32);canvas.style.opacity=volume.toFixed(3);
      $('#spaceProgress').style.transform=`scaleX(${p})`;
      const phase=p<.22?0:p<.4?1:p<.66?2:3;section.dataset.phase=phase;
      section.querySelectorAll('[data-phase]').forEach(e=>e.classList.toggle('is-current',+e.dataset.phase===phase));
    }
    if(renderer&&p>.56&&!document.hidden)renderer.render(scene,camera);
  }
  section.addEventListener('keydown',e=>{if(e.key==='Escape'&&ready)select('space');});
  new ResizeObserver(resize).observe(drawing);$('#spaceLoading').hidden=true;select('space');resize();
  return {update,setActive(){}};
}
