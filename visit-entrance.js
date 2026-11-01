// Showreel-style entrance only. The map's route and floor timeline remain untouched.
(()=>{
 const section=document.querySelector('#visit'),panel=section?.querySelector('.visit-pin');
 if(!panel)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let pending=0,last=-1;
 function update(){
  pending=0;
  const rect=section.getBoundingClientRect();
  const p=reduced.matches?1:Math.max(0,Math.min(1,(innerHeight-rect.top)/innerHeight));
  if(Math.abs(p-last)<.0001)return;last=p;
  const ease=1-Math.pow(1-p,3);
  // 11-02: 통째로 키우지 않고 보이는 창을 넓힌다 — 좌우 가림 24% → 0, 스케일은 .92 → 1 만큼만
  panel.style.setProperty('--visit-enter-inset',`${(24*(1-ease)).toFixed(3)}%`);
  panel.style.setProperty('--visit-enter-scale',String(.92+.08*ease));
  panel.style.setProperty('--visit-enter-y',`${(1-ease)*8}vh`);
  panel.style.setProperty('--visit-enter-radius',`${50*(1-ease)}px`);
 }
 const schedule=()=>{if(!pending)pending=requestAnimationFrame(update)};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);schedule();
})();
