// Layout only: shared CSS variables; no animation, copy, media or colors change.
(()=>{
 const root=document.documentElement;
 function sync(){
  const w=window.innerWidth;
  const inset=w<=767?20:w*.05+Math.max(0,Math.min(4,(w-1440)/120));
  root.style.setProperty('--layout-viewport',`${w}px`);
  root.style.setProperty('--grid-inset',`${inset}px`);
 }
 sync();addEventListener('resize',sync,{passive:true});
 new ResizeObserver(sync).observe(root);
 for(const [name,file] of [['limen-flow','layout-grid-flow.css'],['limen-team','layout-grid-team.css']]){
  customElements.whenDefined(name).then(()=>{
   for(const host of document.querySelectorAll(name)){
    if(!host.shadowRoot)continue;
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(document.body.classList.contains('figma-update')?file.replace('layout-grid-','figma-')+'?v=bright-reveal-clean-1':file,document.baseURI).href;host.shadowRoot.append(link);
    host.shadowRoot.querySelectorAll('.card[data-member]').forEach((n,i)=>n.style.setProperty('--mobile-column',i%2?'3':'1'));
   }
  });
 }
})();
