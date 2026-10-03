import {createStudio} from './architecture.js';
const $=s=>document.querySelector(s), clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const film=$('#film');let userPaused=reduced;
function syncFilm(){const onscreen=$('#experience').getBoundingClientRect().bottom>0;if(userPaused||!onscreen||document.hidden)film.pause();else film.play().catch(()=>{$('#play').textContent='영상 재생 ▷';});$('#play').textContent=film.paused?'영상 재생 ▷':'영상 일시정지 Ⅱ';}
$('#play').onclick=()=>{userPaused=!film.paused;syncFilm();};film.addEventListener('playing',()=>$('#play').textContent='영상 일시정지 Ⅱ');film.addEventListener('error',()=>{$('#play').textContent='영상 로드 실패';});document.addEventListener('visibilitychange',syncFilm);if(reduced)film.pause();
const info={
 projector:{tag:'01 / PROJECTION',title:'빛이 공간의 경계를 지웁니다.',copy:'천장에 매달린 프로젝터가 벽 세 면과 바닥을 하나의 장면으로 연결합니다. 빛의 경로를 따라 투사되는 면을 살펴보세요.',note:'천장 설치는 사진 확인 · 수량·좌표·투사 방향은 시안용 배치',short:'프로젝터'},
 lighting:{tag:'02 / LIGHTING',title:'어둠을 설계하는 빛.',copy:'격자형 천장 파이프에 패널 조명이 매달려 있습니다. 주변 조도는 투사 영상의 검정과 빛의 대비에 영향을 줍니다.',note:'패널·파이프 구조는 사진 확인 · 조명 제어 연출은 웹 시안',short:'조명'},
 kinect:{tag:'03 / KINECT V2',title:'당신의 움직임이 입력이 됩니다.',copy:'키넥트가 관람자의 발목 위치를 감지합니다. 감지된 위치에서 시작된 반응이 바닥을 지나 벽으로 이어집니다.',note:'사용 장비는 자료 확인 · 설치 위치·감지 부채꼴은 임시 표현',short:'키넥트'},
 floor:{tag:'04 / CONNECTED SPACE',title:'발밑에서 시작해, 벽까지.',copy:'7.2 × 4m의 바닥과 세 벽이 연결됩니다. Unity의 한 장면을 Spout으로 전달하고 MadMapper에서 네 면에 맞춰 투사합니다.',note:'실측 치수·출력 구조는 자료 기준 · 파동은 웹 설명용 연출',short:'반응하는 바닥'}
};
let selected=null, updateScene=()=>{}, highlight=()=>{}, p=0;
const complete=.80;
function select(id){
 if(selected===id)return;selected=id;const d=info[id];
 $('#detail-tag').textContent=d?.tag.replace(/^\d+ \/ /,'')||'THE SPACE';
 $('#detail-title').textContent=d?.title||'벽 세 면과 바닥, 하나의 경험.';
 $('#detail-copy').textContent=d?.copy||'오른쪽 장비에 마우스를 올려 공간이 반응하는 방식을 살펴보세요.';
 $('#detail-note').textContent=d?.note||'공간 치수는 실측 자료 기준 · 장치 배치는 사진 기반 개념 재구성';
 highlight();const el=$('.detail-text');el.classList.remove('reveal');void el.offsetWidth;el.classList.add('reveal');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')select(null)});
function scroll(){
 const hr=$('#experience').getBoundingClientRect(),h=clamp(-hr.top/($('#experience').offsetHeight-innerHeight));
 $('.hero-copy').style.opacity=1-clamp((h-.15)/.48);$('.hero-copy').style.transform=`translateY(${-h*60}px)`;
 $('.hero-end').style.opacity=clamp((h-.5)/.3);$('.hero-end').style.transform=`translateY(${(1-clamp((h-.5)/.3))*30}px)`;
 const s=$('#space').getBoundingClientRect();p=clamp(-s.top/($('#space').offsetHeight-innerHeight));
 const inSpace=s.top<=1&&s.bottom>0;
 document.body.classList.toggle('in-studio',inSpace);$('header').inert=inSpace;
 const ready=p>=complete;
 $('#space').classList.toggle('is-complete',ready);
 $('#information').inert=!ready;$('#information').setAttribute('aria-hidden',String(!ready));
 $('#information').style.setProperty('--reveal',clamp((p-complete)/.065));
 if(!ready&&selected)select(null);
 syncFilm();updateScene();
}
addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);scroll();
async function init(){
 const T=await import('../shared/vendor/three.module.min.js');
 const stage=$('#stage'),drawing=$('#drawing'),room=new T.Group();
 const {lines}=createStudio(T,room);
 const camera=new T.OrthographicCamera(-7,7,5,-5,.1,100);
 camera.position.set(8,8,12);camera.lookAt(0,1.7,0);camera.updateMatrixWorld();
 const NS='http://www.w3.org/2000/svg',groups={};
 for(const id of [null,'floor','lighting','projector','kinect']){
   const group=document.createElementNS(NS,'g');
   if(id){group.dataset.id=id;group.classList.add('device-lines');group.setAttribute('role','button');group.setAttribute('aria-label',info[id].short);group.setAttribute('tabindex','-1');
     group.addEventListener('pointerenter',()=>{if(p>=complete)select(id)});
     group.addEventListener('click',()=>{if(p>=complete)select(id)});
     group.addEventListener('focus',()=>{if(p>=complete)select(id)});
     group.addEventListener('keydown',e=>{if(p>=complete&&['Enter',' '].includes(e.key)){e.preventDefault();select(id)}});
   }
   $('#paths').append(group);groups[id]=group;
 }
 const svgLines=lines.map(item=>{
   const el=document.createElementNS(NS,'path');el.setAttribute('class',item.kind);groups[item.id].append(el);
   let hit=null;if(item.id){hit=document.createElementNS(NS,'path');hit.setAttribute('class','hit-line');hit.setAttribute('aria-hidden','true');groups[item.id].append(hit);}
   return {...item,el,hit};
 });
 highlight=()=>{for(const[id,g]of Object.entries(groups)){g.classList.toggle('selected',id===selected);if(id!=='null')g.setAttribute('aria-pressed',String(id===selected));}};
 const v=new T.Vector3();
 function resize(){
   const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h,range=Math.max(4.1,6.1/aspect);
   camera.left=-range*aspect;camera.right=range*aspect;camera.top=range;camera.bottom=-range;camera.updateProjectionMatrix();
   drawing.setAttribute('viewBox',`0 0 ${w} ${h}`);
   svgLines.forEach(item=>{const d=item.points.map((a,j)=>{v.set(...a).project(camera);return `${j?'L':'M'}${((v.x+1)*w/2).toFixed(2)},${((1-v.y)*h/2).toFixed(2)}`}).join(' ');
     item.el.setAttribute('d',d);item.hit?.setAttribute('d',d);item.length=item.el.getTotalLength();item.el.style.strokeDasharray=String(item.length);
   });updateScene();
 }
 updateScene=()=>{
   const settle=clamp((p-.72)/.08);
   svgLines.forEach(({el,length=0,start,duration,kind})=>{
     const t=clamp((p-start)/duration);el.style.strokeDashoffset=String(length*(1-t));
     const guide=['grid','axis','guide','dimension'].includes(kind);
     el.style.opacity=String((t>0?1:0)*(guide?1-settle*.8:1));
   });
   for(const[id,g]of Object.entries(groups))if(id!=='null')g.setAttribute('tabindex',p>=complete?'0':'-1');
 };
 new ResizeObserver(resize).observe(stage);resize();highlight();
 document.body.dataset.ready='true';
}
init().catch(e=>{console.error(e);$('#fallback').hidden=false;});
