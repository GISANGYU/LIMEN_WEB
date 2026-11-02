// Layout only: shared CSS variables; no animation, copy, media or colors change.
(()=>{
 const root=document.documentElement;
 function sync(){
  const w=window.innerWidth;
  const inset=w<=767?20:w*.05+Math.max(0,Math.min(4,(w-1440)/120));
  root.style.setProperty('--layout-viewport',`${w}px`);
  root.style.setProperty('--grid-inset',`${inset}px`);
 }
 // 헤더 마지막 메뉴(Awake)는 칸 가운데 정렬이라 글자 끝이 그리드 끝보다 안쪽 → 푸터 오른쪽 여백을 그만큼 맞춘다
 // 11-02: 메뉴 간격 = 예전(네 칸에 고르게 펼친 간격)의 2/3, 오른쪽 끝은 그대로 → --nav-gap (figma-update.css 가 오른쪽 정렬 + gap 으로 씀)
 function navGap(){const nav=document.querySelector('.c-Header:not(.c-Header--sat) nav');if(!nav)return;const links=[...nav.querySelectorAll('a')];if(links.length<2)return;
  const sum=links.reduce((t,a)=>t+a.getBoundingClientRect().width,0),free=nav.getBoundingClientRect().width-sum;root.style.setProperty('--nav-gap',`${Math.max(16,free/(links.length-1)*2/3).toFixed(1)}px`);}
 function headerTrim(){navGap();const a=document.querySelector('.c-Header nav a:last-child');if(!a)return;const r=document.createRange();r.selectNodeContents(a);
  root.style.setProperty('--header-right-trim',`${Math.max(0,a.getBoundingClientRect().right-r.getBoundingClientRect().right).toFixed(1)}px`);}
 sync();headerTrim();addEventListener('resize',()=>{sync();headerTrim()},{passive:true});document.fonts?.ready.then(headerTrim);addEventListener('load',headerTrim);
 new ResizeObserver(sync).observe(root);
 for(const [name,file] of [['limen-flow','layout-grid-flow.css'],['limen-team','layout-grid-team.css']]){
  customElements.whenDefined(name).then(()=>{
   for(const host of document.querySelectorAll(name)){
    if(!host.shadowRoot)continue;
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(document.body.classList.contains('figma-update')?file.replace('layout-grid-','figma-')+'?v=nav-gap-1':file,document.baseURI).href;host.shadowRoot.append(link);
    host.shadowRoot.querySelectorAll('.card[data-member]').forEach((n,i)=>n.style.setProperty('--mobile-column',i%2?'3':'1'));
   }
  });
 }
})();
