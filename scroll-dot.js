// 11-02: 스크롤바 A안 — 오른쪽 빛 점. 빠르게 스크롤할수록 점이 늘어나고 밝아지며 지나온 자리에 빛 꼬리가 남는다
(()=>{
  const rail=document.createElement('div');rail.className='scroll-dot';rail.setAttribute('aria-hidden','true');
  rail.innerHTML='<div class="trail"></div><div class="dot"></div>';
  const go=()=>document.body.appendChild(rail);
  document.body?go():addEventListener('DOMContentLoaded',go);
  const dot=rail.querySelector('.dot'),trail=rail.querySelector('.trail');
  const max=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
  const jump=y=>{const l=window.__app&&window.__app.lenis;l?l.scrollTo(y,{immediate:true}):scrollTo(0,y);};
  rail.addEventListener('pointerdown',e=>{
    rail.setPointerCapture(e.pointerId);rail.classList.add('is-drag');document.documentElement.classList.add('scroll-dot-drag');
    const to=ev=>{const b=rail.getBoundingClientRect();jump(Math.min(1,Math.max(0,(ev.clientY-b.top)/b.height))*max());};
    to(e);rail.onpointermove=to;
    rail.onpointerup=rail.onpointercancel=()=>{rail.onpointermove=null;rail.classList.remove('is-drag');document.documentElement.classList.remove('scroll-dot-drag');};
  });
  let lastY=scrollY,vel=0,shown=scrollY/max(),tail=null,glow=0;
  (function frame(){
    const y=scrollY,p=y/max();
    vel+=(Math.abs(y-lastY)-vel)*.15;lastY=y;
    shown+=(p-shown)*.25;
    const H=rail.clientHeight,top=shown*H,s=Math.min(1,vel/25);
    // 꼬리 끝은 점이 지나온 자리에서 천천히 따라온다 → 실제로 지나간 길만큼만, 멈추면 사라짐
    if(tail===null)tail=top;
    tail+=(top-tail)*.07;
    if(Math.abs(top-tail)>160)tail=top-Math.sign(top-tail)*160;
    const len=Math.abs(top-tail),down=top>=tail;
    // 멈춰 있으면 어둡게, 스크롤하면 확 밝아진다
    glow+=(s-glow)*(s>glow?.35:.06);
    dot.style.top=top+'px';dot.style.opacity=.3+glow*.7;
    // 꼬리는 점 가장자리(반높이 8px)부터: 내릴 땐 위로, 올릴 땐 아래로
    const tl=Math.max(0,len-8);
    trail.style.top=(down?top-8-tl:top+8)+'px';trail.style.height=tl+'px';
    trail.style.transform=`translateX(-50%) scaleY(${down?1:-1})`;trail.style.opacity=Math.min(1,tl/30);
    requestAnimationFrame(frame);
  })();
})();
