const EASE='cubic-bezier(.22,1,.36,1)';
const SNAP='cubic-bezier(.76,0,.24,1)';
export function attachProfileMotion({root,cards,people,portraits,select}){
 const style=document.createElement('style');
 style.textContent=`
.profile-dialog{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;border:0;padding:0;background:#0c0d0f;color:#dce3e9;overflow:hidden;font-family:Arial,'Apple SD Gothic Neo',sans-serif;outline:none}
.profile-dialog::backdrop{background:#000c}
.profile-surface{position:absolute;inset:0;overflow:hidden;background:#101113}
.profile-plane{position:absolute;overflow:hidden;pointer-events:none;transform-origin:50% 50%;will-change:left,top,width,height,transform,filter,clip-path;backface-visibility:hidden}
.profile-plane:not(:last-child){display:none}
.profile-plane img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 38%;opacity:1;filter:none;mix-blend-mode:normal}
.profile-title{position:absolute;inset:0;display:grid;place-items:center;margin:0;padding:0 4vw;z-index:8;font-size:clamp(30px,4.5vw,88px);font-weight:700;line-height:1;letter-spacing:-.055em;color:#f1f3f5;pointer-events:none;text-align:center;will-change:transform,opacity}
.profile-sidebar{position:absolute;left:74%;right:4%;top:7%;bottom:6%;z-index:10;display:flex;flex-direction:column;align-items:flex-start}
.profile-monogram{font:italic 33px Georgia,serif;color:#d6eaf0;margin:0;opacity:0}
.profile-name{font-size:clamp(20px,2.4vw,46px);font-weight:600;line-height:1.06;letter-spacing:-.04em;margin:0}
.profile-name span{display:block;overflow:hidden}.profile-name i{display:block;font-style:normal;will-change:transform}
.profile-identity{margin-top:auto;margin-bottom:auto;padding-top:12vh;width:100%}.profile-korean{font-size:13px;font-weight:400;letter-spacing:-.02em;margin:23px 0 0;opacity:0;color:#b1bdc8}
.profile-details{font-size:9px;line-height:1.7;letter-spacing:.06em;color:#9aa8b5;opacity:0;margin-top:8vh;display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%}.profile-details p{margin:0}.profile-details .meaning{letter-spacing:0;line-height:1.8}
.profile-controls{width:100%;margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:9px;letter-spacing:.1em;opacity:0}.profile-controls button{font:inherit;color:#c7d6e1;background:none;border:0;min-height:44px;padding:0;cursor:pointer}.profile-count{font-size:9px;color:#7f909e}
.profile-close{position:absolute;right:18px;top:18px;z-index:20;width:44px;height:44px;border:1px solid #6d9aab66;border-radius:50%;background:#0d161c66;color:#9fc6d6;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(6px);padding:0;font:27px/1 Arial}
.profile-close:hover{background:#29404c88;color:#e6f6ff}.profile-close:focus-visible,.profile-controls button:focus-visible{outline:1px solid #b6e8ff;outline-offset:5px}.profile-controls button:disabled{opacity:.35;cursor:default}
@media(max-width:650px){.profile-sidebar{left:11%;right:11%;top:63%;bottom:3%}.profile-monogram{display:none}.profile-identity{padding:0;margin:0}.profile-name{font-size:clamp(23px,6.8vw,38px);line-height:1.1}.profile-name span{display:inline-block;margin-right:.23em}.profile-korean{font-size:12px;margin-top:12px}.profile-details{margin-top:17px;font-size:8px;gap:12px}.profile-controls{margin-top:auto;min-height:44px;font-size:9px}.profile-title{font-size:7vw}.profile-close{right:12px;top:12px}}
@media(prefers-reduced-motion:reduce){.profile-plane,.profile-title{will-change:auto}}
`;
 root.append(style);
 const dialog=document.createElement('dialog');dialog.className='profile-dialog';dialog.setAttribute('aria-label','팀원 프로필');
 dialog.innerHTML=`<div class="profile-surface"><div class="profile-planes" aria-hidden="true"></div><p class="profile-title" aria-hidden="true"></p><aside class="profile-sidebar"><p class="profile-monogram" aria-hidden="true">L</p><div class="profile-identity"><h2 class="profile-name"></h2><p class="profile-korean"></p></div><div class="profile-details"><p>LIMEN<br>COLLECTIVE<br><span class="profile-member"></span></p><p class="meaning">현실과 꿈 사이,<br>하나의 경계를 만드는 시선.</p></div><nav class="profile-controls" aria-label="팀원 프로필 탐색"><button type="button" class="profile-prev" aria-label="이전 팀원 프로필">← PREV</button><span class="profile-count"></span><button type="button" class="profile-next" aria-label="다음 팀원 프로필">NEXT →</button></nav></aside><button type="button" class="profile-close" aria-label="프로필 닫기">×</button></div>`;
 root.append(dialog);
 const planeHost=dialog.querySelector('.profile-planes'),hero=dialog.querySelector('.profile-title'),name=dialog.querySelector('.profile-name'),ko=dialog.querySelector('.profile-korean'),monogram=dialog.querySelector('.profile-monogram'),details=dialog.querySelector('.profile-details'),controls=dialog.querySelector('.profile-controls'),closeButton=dialog.querySelector('.profile-close');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const setBusy=value=>{dialog.setAttribute('aria-busy',String(value));controls.querySelectorAll('button').forEach(b=>b.disabled=value);};
 let current=0,phase='closed',generation=0,animations=[],planes=[],returnCard=null,savedOverflow='',savedGutter='';
 const duration=n=>reduced.matches?1:n;
 const animate=(el,frames,options)=>{const a=el.animate(frames,{fill:'forwards',...options,duration:duration(options.duration??500),delay:reduced.matches?0:(options.delay??0)});animations.push(a);return a.finished.catch(()=>{});};
 const cancel=()=>{animations.forEach(a=>a.cancel());animations=[];};
 const viewport=()=>({w:innerWidth,h:innerHeight});
 const target=()=>{const {w,h}=viewport();return w<=650?{left:w*.11,top:h*.08,width:w*.78,height:h*.50}:{left:w*.08,top:h*.12,width:w*.54,height:h*.76};};
 const full=()=>({left:0,top:0,width:innerWidth,height:innerHeight});
 const rectStyle=r=>({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
 const setRect=(el,r)=>Object.assign(el.style,rectStyle(r));
 function createPlanes(){planeHost.replaceChildren();planes=[];for(let i=0;i<5;i++){const plane=document.createElement('div');plane.className='profile-plane';plane.style.zIndex=String(i+1);plane.innerHTML=`<img src="${portraits[current]}" alt="">`;setRect(plane,full());plane.style.opacity=i===4?'1':'0';planeHost.append(plane);planes.push(plane);}}
 function content(i){current=i;select(i);const [kr,en]=people[i];hero.textContent=en;name.replaceChildren(...en.split(' ').map(word=>{const span=document.createElement('span'),inner=document.createElement('i');inner.textContent=word;span.append(inner);return span;}));ko.textContent=kr;dialog.querySelector('.profile-member').textContent=`MEMBER ${String(i+1).padStart(2,'0')}`;dialog.querySelector('.profile-count').textContent=`${String(i+1).padStart(2,'0')} / 07`;dialog.setAttribute('aria-label',`${kr} ${en} 프로필`);}
 function hideSidebar(){[monogram,ko,details,controls].forEach(el=>el.style.opacity='0');name.querySelectorAll('i').forEach(el=>el.style.transform='translateY(110%)');}
 function revealSidebar(){animate(monogram,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:450,delay:160,easing:EASE});name.querySelectorAll('i').forEach((el,i)=>animate(el,[{transform:'translateY(110%)'},{transform:'translateY(0)'}],{duration:570,delay:220+i*65,easing:EASE}));[ko,details,controls].forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:500,delay:390+i*90,easing:EASE}));}
 async function peel(token){
  const f=full(),t=target(),{h}=viewport();
  animate(hero,[{opacity:1,transform:'translateY(0)'},{opacity:.45,offset:.42,transform:'translateY(-27vh)'},{opacity:0,transform:'translateY(-68vh)'}],{duration:490,easing:SNAP});
  const motions=planes.map((p,i)=>{const main=i===4,depth=4-i,rest={left:t.left-depth*9,top:t.top+depth*7,width:t.width,height:t.height};
   if(main)return animate(p,[{...rectStyle(f),opacity:1,transform:'rotate(0deg)',filter:'blur(0px)',clipPath:'inset(0% 0% 0% 0%)'},{...rectStyle(t),opacity:1,transform:'rotate(0deg)',offset:.55,filter:'blur(0px)',clipPath:'inset(0% 0% 0% 0%)'},{...rectStyle(t),opacity:1,transform:'rotate(0deg)',filter:'blur(0px)',clipPath:'inset(0% 0% 0% 0%)'}],{duration:1120,easing:EASE});
   return animate(p,[{...rectStyle(f),opacity:.50,transform:'rotate(0deg)',filter:'blur(0px)',clipPath:`inset(${48+depth*4}% 0% 0% 0%)`},{...rectStyle({...t,left:t.left-depth*15,top:t.top+Math.min(h*.28,65+depth*30)}),opacity:.48,offset:.35,transform:`rotate(${-1.5-depth*.25}deg)`,filter:'blur(.5px)',clipPath:'inset(0% 0% 0% 0%)'},{...rectStyle(rest),opacity:.29-depth*.025,transform:'rotate(0deg)',filter:`blur(${depth*.45}px)`,clipPath:'inset(0% 0% 0% 0%)'}],{duration:1280+depth*65,delay:depth*60,easing:EASE});
  });
  revealSidebar();await Promise.all(motions);if(generation===token&&dialog.open){phase='open';setBusy(false);}
 }
 async function openProfile(i,{switching=false}={}){
  if(phase==='closing')return;
  const token=++generation;cancel();phase='opening';setBusy(true);content(i);hideSidebar();createPlanes();
  const clicked=cards[i].querySelector('.image').getBoundingClientRect();
  if(!dialog.open){returnCard=cards[i];savedOverflow=document.documentElement.style.overflow;savedGutter=document.documentElement.style.scrollbarGutter;document.documentElement.style.scrollbarGutter='stable';document.documentElement.style.overflow='hidden';dialog.showModal();closeButton.focus({preventScroll:true});}
  hero.style.opacity='0';hero.style.transform='none';
  /* COMBINE: 카드 크기에서 상세 크기로 곧바로 커진다 (전체 화면까지 커졌다가 줄어드는 단계 없음) */const t=target();if(!switching){setRect(planes[4],clicked);await Promise.all([animate(planes[4],[{...rectStyle(clicked),opacity:1,transform:'rotate(0deg)'},{...rectStyle(t),opacity:1,transform:'rotate(0deg)'}],{duration:620,easing:EASE}),animate(dialog.querySelector('.profile-surface'),[{opacity:0},{opacity:1}],{duration:260,easing:'linear'})]);}else{setRect(planes[4],t);planes[4].style.opacity='1';await animate(planes[4],[{opacity:0},{opacity:1}],{duration:260,easing:EASE});}if(token!==generation||!dialog.open)return;revealSidebar();phase='open';setBusy(false);
 }
 async function closeProfile(){
  if(!dialog.open||phase==='closing')return;
  phase='closing';setBusy(true);const token=++generation;
  const snapshots=planes.map(p=>({rect:p.getBoundingClientRect(),opacity:getComputedStyle(p).opacity}));cancel();planes.forEach((p,i)=>{setRect(p,snapshots[i].rect);p.style.opacity=snapshots[i].opacity;p.style.clipPath='none';p.style.transform='none';});
  [monogram,ko,details,controls,name].forEach(el=>animate(el,[{opacity:getComputedStyle(el).opacity,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:180,easing:EASE}));
  /* COMBINE: 지금 크기에서 카드 자리로 곧바로 작아진다 */const rect=(returnCard??cards[current]).querySelector('.image').getBoundingClientRect();await Promise.all([animate(planes[4],[{...rectStyle(snapshots[4].rect),opacity:1},{...rectStyle(rect),opacity:1}],{duration:560,easing:EASE}),animate(dialog.querySelector('.profile-surface'),[{opacity:1},{opacity:0}],{duration:560,easing:'ease-in'})]);if(token!==generation)return;dialog.close();cancel();phase='closed';document.documentElement.style.overflow=savedOverflow;document.documentElement.style.scrollbarGutter=savedGutter;(returnCard??cards[current]).focus({preventScroll:true});
 }
 closeButton.addEventListener('click',closeProfile);dialog.addEventListener('cancel',e=>{e.preventDefault();closeProfile();});
 dialog.querySelector('.profile-prev').addEventListener('click',()=>{if(phase==='open')openProfile((current+people.length-1)%people.length,{switching:true});});
 dialog.querySelector('.profile-next').addEventListener('click',()=>{if(phase==='open')openProfile((current+1)%people.length,{switching:true});});
 dialog.addEventListener('keydown',e=>{if(phase!=='open')return;if(e.key==='ArrowRight'){e.preventDefault();openProfile((current+1)%people.length,{switching:true});}if(e.key==='ArrowLeft'){e.preventDefault();openProfile((current+people.length-1)%people.length,{switching:true});}});
 cards.forEach((c,i)=>{c.setAttribute('aria-haspopup','dialog');c.setAttribute('aria-label',`${people[i][0]} ${people[i][1]} 프로필 열기`);c.addEventListener('click',()=>openProfile(i));});
 const onResize=()=>{if(phase==='open'){cancel();planes.forEach((p,i)=>{const t=target(),depth=4-i;setRect(p,{...t,left:t.left-depth*9,top:t.top+depth*7});p.style.opacity=i===4?'1':String(.29-depth*.025);p.style.filter=i===4?'none':`blur(${depth*.45}px)`;p.style.clipPath='none';p.style.transform='none';});hero.style.opacity='0';[monogram,ko,details,controls,name].forEach(x=>{x.style.opacity='1';x.style.transform='none';});name.querySelectorAll('i').forEach(x=>x.style.transform='none');}};
 window.addEventListener('resize',onResize);
 return ()=>{generation++;cancel();window.removeEventListener('resize',onResize);if(dialog.open){dialog.close();document.documentElement.style.overflow=savedOverflow;document.documentElement.style.scrollbarGutter=savedGutter;}dialog.remove();style.remove();};
}
