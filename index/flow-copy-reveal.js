// Scroll-scrubbed reading reveal, limited to the three explanatory copy blocks.
customElements.whenDefined('limen-flow').then(()=>{
 const host=document.querySelector('limen-flow'),root=host?.shadowRoot;
 if(!root||host.dataset.copyReveal)return;
 host.dataset.copyReveal='true';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const blocks=[...root.querySelectorAll('.copy')].map(block=>{
  const p=block.querySelector('p'),text=p.innerText||p.textContent;
  p.setAttribute('aria-label',text);
  const glyphs=[];
  const children=[...p.childNodes];
  for(const node of children){
   if(node.nodeType!==Node.TEXT_NODE)continue;
   const fragment=document.createDocumentFragment();
   for(const char of node.textContent){
    const span=document.createElement('span');span.className='reveal-glyph';span.textContent=char;span.setAttribute('aria-hidden','true');fragment.append(span);glyphs.push(span);
   }
   node.replaceWith(fragment);
  }
  p.querySelectorAll('br').forEach(br=>br.setAttribute('aria-hidden','true'));
  const accessible=document.createElement('span');accessible.className='copy-accessible-text';accessible.textContent=text;p.append(accessible);
  return {block,glyphs,last:-1};
 });
 let frame=0;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function update(){
  frame=0;
  const vh=innerHeight;
  // Read every block before applying glyph styles to avoid interleaved layout work.
  const progress=blocks.map(({block})=>reduced.matches?1:clamp((vh*.86-block.getBoundingClientRect().top)/(vh*.38)));
  blocks.forEach((entry,index)=>{
   const p=progress[index];if(Math.abs(p-entry.last)<.0005)return;entry.last=p;
   const count=entry.glyphs.length;
   entry.glyphs.forEach((glyph,i)=>glyph.style.setProperty('--glyph-opacity',String(.18+.82*clamp((p*(count+4)-i)/4))));
  });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);
 schedule();
});
