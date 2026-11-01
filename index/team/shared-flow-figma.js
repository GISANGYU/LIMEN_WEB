import {createFlowSurface} from './shared-flow-surface-figma.js';
class LimenFlow extends HTMLElement{
connectedCallback(){
if(this.shadowRoot)return;
const root=this.attachShadow({mode:'open'});
const words=['FLOW','AWARENESS','CHOICE'];
root.innerHTML=`<style>
:host{display:block;position:relative;background:transparent;color:#f1f4f7;isolation:isolate}*{box-sizing:border-box}.flow{position:relative;height:120svh;min-height:780px;overflow:hidden;background:transparent;font-family:Arial,'Apple SD Gothic Neo',sans-serif}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.shade{position:absolute;inset:0;background:linear-gradient(180deg,#000 0%,transparent 10%,transparent 86%,#030508 100%);pointer-events:none}.top{position:absolute;top:5%;left:5%;right:5%;display:flex;justify-content:space-between;font-size:9px;letter-spacing:.17em;color:#b9ccd8}.pause{border:0;padding:5px 0 5px 15px;background:none;color:inherit;cursor:pointer;letter-spacing:.1em;font-size:9px}.pause:focus-visible{outline:1px solid #b0e2f3;outline-offset:6px}.headline{position:absolute;top:27%;left:24%;width:58%;margin:0;font-weight:400;font-size:clamp(42px,7.4vw,120px);letter-spacing:-.045em;line-height:1.02;z-index:1}.word{display:block;width:max-content;max-width:100%;white-space:nowrap;cursor:default}.word:nth-child(1){margin-left:4%}.word:nth-child(2){margin-left:24%}.word:nth-child(3){margin-left:0}.letter{display:inline-block;transition:transform .3s,color .3s,text-shadow .3s;font-weight:400}.letter.lit{font-style:italic;color:#d4f1ff;text-shadow:0 0 28px #85cefc44;transform:translateY(-2px) skewX(-6deg)}.copy{position:absolute;top:72%;font-size:clamp(11px,1.12vw,17px);line-height:1.85;word-break:keep-all;font-weight:400;z-index:1}.copy.left{left:24%;width:29%}.copy.right{left:60%;width:29%;top:80%}.copy p{margin:0}.ticks{position:absolute;top:29%;bottom:23%;width:9px;display:flex;flex-direction:column;justify-content:space-between;z-index:1}.ticks.left{left:5%}.ticks.right{right:5%}.ticks i{display:block;width:2px;height:1px;background:#d4e8f1a8}.ticks i:nth-child(5n+1){width:8px}.ticks b{position:absolute;top:var(--scan,34%);left:-14px;font-size:8px;font-weight:400;color:#e2f4fc;transition:top .6s}.ticks.right b{left:auto;right:-14px;transform:rotate(180deg)}.bottom{position:absolute;bottom:3.6%;left:5%;font-size:8px;letter-spacing:.17em;color:#8aa7b8}@media(max-width:700px){.flow{min-height:760px;height:110svh}.top{font-size:8px}.headline{top:27%;left:16%;width:76%;font-size:clamp(36px,8.5vw,59px)}.word:nth-child(2){margin-left:8%}.copy{font-size:11px;line-height:1.9}.copy.left{left:17%;top:63%;width:66%}.copy.right{left:35%;top:77%;width:59%}.ticks{top:30%;bottom:40%}.ticks.left{left:6%}.ticks.right{right:6%}.ticks b{left:-10px}.bottom{font-size:7px}.pause{font-size:8px}}@media(prefers-reduced-motion:reduce){.letter{transition:none}.letter.lit{transform:none}}
.headline,.copy{isolation:isolate}.headline:before{content:'';position:absolute;inset:-50px -6vw;z-index:-1;pointer-events:none;background:radial-gradient(ellipse,#01040de8 5%,#01040dbd 58%,transparent 84%);filter:blur(18px)}.copy:before{content:'';position:absolute;inset:-30px -35px;z-index:-1;pointer-events:none;background:radial-gradient(ellipse,#01040de8 5%,#01040dbd 58%,transparent 84%);filter:blur(18px)}
/* Reference layout: staggered heading, offset copy, and circular edge markers. */
.flow{height:max(110svh,106vw);min-height:900px}
.headline{top:12%;left:8%;width:64%;font-size:clamp(42px,6.15vw,96px);line-height:1.1}
.word:nth-child(1){margin-left:0}
.word:nth-child(2){margin-left:14%;margin-top:.4em}
.word:nth-child(3){margin-left:0;margin-top:1.05em}
.copy.left{left:46.5%;top:62%;width:40%;font-size:clamp(16px,2.45vw,30px);line-height:1.5}
.copy.detail{left:46.5%;top:74%;width:43%;font-size:clamp(11px,1.2vw,17px);line-height:1.8}
.copy.right{left:65%;top:87%;width:31%;font-size:clamp(11px,.95vw,15px);line-height:1.65}
.ticks{width:auto;height:auto;bottom:auto;display:flex;flex-direction:row;gap:clamp(6px,1vw,12px)}
.ticks.left{left:8%;top:82.5%}
.ticks.right{right:6.7%;top:12%}
.ticks i,.ticks i:nth-child(5n+1){width:clamp(16px,2.9vw,36px);height:clamp(16px,2.9vw,36px);border-radius:50%;background:#bfe5f8}
.ticks.left i:nth-of-type(n+3),.ticks.right i:nth-of-type(n+4){display:none}
.top{top:auto;bottom:3%;left:auto;right:6.7%;z-index:2}
.top>span{display:none}
.bottom{left:8%;bottom:3%}
@media(max-width:700px){
 .flow{height:110svh;min-height:860px}
 .headline{top:15%;left:8%;width:79%;font-size:clamp(31px,6.15vw,43px)}
 .word:nth-child(2){margin-left:11%;margin-top:.4em}
 .word:nth-child(3){margin-top:1.05em}
 .copy.left{left:46.5%;top:62%;width:47%;font-size:clamp(14px,2.45vw,17px)}
 .copy.detail{left:46.5%;top:74%;width:49%;font-size:clamp(9px,1.5vw,11px);line-height:1.85}
 .copy.right{left:56%;top:87%;width:39%;font-size:10px}
 .ticks.right{top:15%;right:6.7%}
 .ticks.left{top:82.5%;left:8%}
}
/* Match the lily palette; the original word placement and hover response stay intact. */
:host{margin-top:-100vh;z-index:3;background:#293b78}
.flow{background:linear-gradient(180deg,#293b78,#33447b);isolation:isolate}
.flow-surface{position:sticky;top:0;height:100svh;width:100%;margin-bottom:-100svh;overflow:hidden;z-index:0;pointer-events:none;background:#293b78 url('../assets/flow-light.png') center/100% 100% no-repeat}
.flow-surface canvas{height:100%;opacity:.75}
.flow-surface:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#293b78 0%,#293b7820 14%,#33447b10 82%,#33447b 100%)}
.flow-surface:not(.fluid-ready){background-blend-mode:luminosity;background-color:#54619a}
.headline:before,.copy:before{background:radial-gradient(ellipse,#26356cb0 5%,#26356c55 58%,transparent 84%)}
.letter.lit{color:#c6c3ff;text-shadow:0 0 28px #9b8aff44}
.pause{color:#d5d5f0}.bottom{color:#c7cced}
</style><section class="flow" aria-label="FLOW · AWARENESS · CHOICE — 서로에게 영향을 주고받는 우리"><div class="flow-surface" aria-hidden="true"><canvas></canvas></div><div class="top"><span>LIMEN / SHARED PERSPECTIVES</span><button class="pause" type="button" aria-label="배경 인터랙션 일시정지">PAUSE Ⅱ</button></div><h2 class="headline">${words.map(w=>`<span class="word" aria-label="${w}">${[...w].map(c=>`<span class="letter" aria-hidden="true">${c}</span>`).join('')}</span>`).join('')}</h2><div class="copy left"><p>바라보던 흐름 안으로<br>들어서다.</p></div><div class="copy detail"><p>네 면을 감싸는 빛과 움직임 속에서<br>관객은 공간의 흐름에 반응하고,<br>자신의 움직임으로 그 흐름에 영향을 줍니다.</p></div><div class="copy right"><p>공간을 따라 움직이는 동안,<br>나의 선택에 스며든 영향을 마주합니다.</p></div><div class="bottom">FLOW / AWARENESS / CHOICE</div></section>`;
const section=root.querySelector('.flow'),button=root.querySelector('.pause'),letters=[...root.querySelectorAll('.letter')];
const stopSurface=createFlowSurface(root.querySelector('canvas'),root.querySelector('.flow-surface'),section);
let paused=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
section.addEventListener('pointermove',e=>{const r=section.getBoundingClientRect();section.style.setProperty('--scan',`${Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))}%`);pointer={x:e.clientX,y:e.clientY,on:true};wakeLetters()});
section.addEventListener('pointerleave',()=>{pointer.on=false;wakeLetters()});
// 11-02: 글자별 깜빡 강조 대신, 커서 쪽으로 글자가 빨려 들며 물결처럼 일렁인다 (가까울수록 강하게, 멀어지면 부드럽게 복귀)
let pointer={x:0,y:0,on:false},lettersRaf=0;const lstate=letters.map(()=>({x:0,y:0,s:1,k:0}));
function wakeLetters(){if(!lettersRaf&&!reduced)lettersRaf=requestAnimationFrame(stepLetters)}
function stepLetters(t){lettersRaf=0;let moving=false;const R=260,time=t/1000;
 letters.forEach((l,i)=>{const st=lstate[i];let tx=0,ty=0,ts=1,tk=0;
  if(pointer.on){const b=l.getBoundingClientRect(),cx=b.left+b.width/2-st.x,cy=b.top+b.height/2-st.y,dx=pointer.x-cx,dy=pointer.y-cy,d=Math.hypot(dx,dy),k=Math.exp(-(d/R)*(d/R));
   tk=k;tx=dx*.22*k;ty=dy*.22*k+Math.sin(time*3.2+i*.55)*5*k;ts=1-.16*k;}
  st.x+=(tx-st.x)*.09;st.y+=(ty-st.y)*.09;st.s+=(ts-st.s)*.09;st.k+=(tk-st.k)*.09;
  l.style.transform=`translate(${st.x.toFixed(2)}px,${st.y.toFixed(2)}px) scale(${st.s.toFixed(4)}) skewX(${(-st.x*.08).toFixed(2)}deg)`;
  l.style.opacity=(1-.35*st.k).toFixed(3);
  if(Math.abs(st.x)+Math.abs(st.y)+Math.abs(1-st.s)>.02||pointer.on)moving=true;});
 if(moving)wakeLetters();}
const scroll=()=>{const r=section.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;root.querySelector('.headline').style.transform=`translateY(${reduced?0:Math.max(-1,Math.min(1,-r.top/innerHeight))*-25}px)`};window.addEventListener('scroll',scroll,{passive:true});
button.addEventListener('click',()=>{paused=!paused;button.textContent=paused?'PLAY ▷':'PAUSE Ⅱ';button.setAttribute('aria-label',paused?'배경 인터랙션 재생':'배경 인터랙션 일시정지');this.dispatchEvent(new CustomEvent('limen-toggle-motion',{bubbles:true,composed:true,detail:{paused}}))});
scroll();this.cleanup=()=>{window.removeEventListener('scroll',scroll);stopSurface?.();};
}
disconnectedCallback(){this.cleanup?.()}
}
customElements.define('limen-flow',LimenFlow);
