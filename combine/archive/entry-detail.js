// 기록 읽기 — 누른 카드가 WebGL 안에서 그대로 커져 대표 화면 자리로 가고(원본 test-logs 동작), 그 위로 한국어 기록이 열린다
const ease=t=>t*t*(3-2*t);
const kDate=d=>d.replaceAll('-','.');
const kNum=n=>String(n).padStart(2,'0');

export class EntryDetail{
  constructor(gallery,entries,reduced){
    this.gallery=gallery;this.entries=entries;this.reduced=reduced;this.dialog=document.querySelector('#entry-detail');
    this.hero=document.querySelector('#entry-hero');this.media=document.querySelector('#entry-hero-media');
    this.back=document.querySelector('#entry-back');this.busy=false;this.entry=null;
    this.back.onclick=()=>this.close();
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.onResize=()=>{if(this.dialog.open)this.updateTarget();};window.addEventListener('resize',this.onResize);
    window.addEventListener('popstate',()=>{if(this.dialog.open)this.close(false);else this.openFromHash();});
    this.gallery.onActivate=(index,item)=>this.open(entries[index],item);
  }
  updateTarget(){
    const r=this.hero.getBoundingClientRect();
    this.gallery.expansion?.target.set(r.left+r.width/2-innerWidth/2,innerHeight/2-r.top-r.height/2,r.width,r.height);
  }
  createMedia(asset,hero=false){
    const element=document.createElement(asset.video?'video':'img');
    if(asset.video){
      element.src=asset.video;element.poster=asset.image;element.controls=true;element.playsInline=true;
      element.preload=hero?'metadata':'none';element.muted=true;
      if(hero){element.autoplay=true;element.loop=true;}
    }else{element.src=asset.image;element.alt=asset.alt||'그날의 사진 기록';element.loading=hero?'eager':'lazy';element.decoding='async';}
    if(asset.width&&asset.height){element.style.aspectRatio=`${asset.width}/${asset.height}`;if(!asset.video){element.width=asset.width;element.height=asset.height;}}
    if(hero)element.className='entry-main-media';
    return element;
  }
  render(entry){
    const $=s=>document.querySelector(s),k=entry.ko,i=this.entries.indexOf(entry);
    this.dialog.scrollTop=0;this.media.replaceChildren(this.createMedia({image:entry.poster,video:entry.video,alt:k.title},true));
    const dateTop=$('#entry-date-top');dateTop.textContent=kDate(entry.date);dateTop.dateTime=entry.date;
    $('#entry-number').textContent=`Archive / ${kNum(i+1)} — ${kNum(this.entries.length)}`;
    $('#entry-title').textContent=k.title;$('#entry-en').textContent=entry.title;
    $('#entry-summary').textContent=k.summary;
    $('#entry-date').textContent=kDate(entry.date);$('#entry-place').textContent=k.place;$('#entry-focus').textContent=k.focus;
    const photos=entry.media.filter(m=>!m.video).length,films=entry.media.filter(m=>m.video).length;
    $('#entry-count').textContent=`사진 ${photos} · 영상 ${films}`;
    $('#entry-notes').textContent=k.notes;
    $('#entry-field').hidden=!k.field;
    $('#entry-evidence-count').textContent=`${entry.media.length}개의 기록`;
    const grid=$('#entry-evidence');grid.replaceChildren();
    entry.media.forEach((asset,n)=>{
      const figure=document.createElement('figure');figure.className='evidence-item';
      figure.append(this.createMedia(asset));
      const caption=document.createElement('figcaption');caption.textContent=`${kNum(n+1)} / ${asset.video?'영상':'사진'}${asset.duration?' · '+asset.duration:''}`;
      figure.append(caption);grid.append(figure);
    });
    const next=this.entries[(i+1)%this.entries.length];
    $('#entry-next-date').textContent=kDate(next.date);
    const nextButton=$('#entry-next');nextButton.textContent=next.ko.title+' ↗';nextButton.onclick=()=>this.navigate(next);
    this.dialog.dataset.entry=entry.id;
  }
  async open(entry,item=null,fromHash=false){
    if(!entry||this.busy||this.dialog.open)return;
    this.entry=entry;this.busy=true;this.returnFocus=document.activeElement;
    this.gallery.scroll.onUp();this.gallery.scroll.enabled=false;
    this.gallery.scroll.target=this.gallery.scroll.current;
    this.gallery.touch.clear();this.gallery.pointer.active=false;this.gallery.pointer.last=null;
    if(!item)item=this.gallery.items.filter(i=>i.index===this.entries.indexOf(entry)&&i.art.visible).sort((a,b)=>Math.abs(a.art.position.y)-Math.abs(b.art.position.y))[0];
    this.render(entry);this.dialog.className='is-opening';this.dialog.showModal();this.dialog.scrollTop=0;
    document.body.classList.add('reading-entry');
    this.gallery.startExpansion(item);this.updateTarget();
    this.back.focus();
    if(!fromHash){history.pushState({entry:entry.id},'',`#log/${entry.id}`);this.pushed=true;}else this.pushed=false;
    const completed=await this.animate(0,1,this.reduced.matches||fromHash?0:900);
    if(!completed||!this.dialog.open)return;
    this.dialog.className='is-ready';
    this.media.querySelector('video')?.play().catch(()=>{});
    this.busy=false;document.title=`${entry.ko.title} — LIMEN ARCHIVE`;
  }
  animate(from,to,duration){
    return new Promise(resolve=>{
      const generation=this.motionGeneration=(this.motionGeneration||0)+1;
      if(!duration){if(this.gallery.expansion)this.gallery.expansion.progress=to;resolve(true);return;}
      const start=performance.now();
      const step=now=>{if(generation!==this.motionGeneration){resolve(false);return;}const t=Math.min(1,(now-start)/duration);if(this.gallery.expansion)this.gallery.expansion.progress=from+(to-from)*ease(t);if(t<1)requestAnimationFrame(step);else resolve(true);};
      requestAnimationFrame(step);
    });
  }
  async close(updateHistory=true){
    if(!this.dialog.open||this.dialog.classList.contains('is-closing'))return;
    const from=this.gallery.expansion?.progress||0;this.motionGeneration=(this.motionGeneration||0)+1;
    this.busy=true;this.dialog.querySelectorAll('video').forEach(v=>v.pause());
    this.dialog.className='is-closing';this.dialog.scrollTop=0;this.updateTarget();
    await this.animate(from,0,this.reduced.matches?0:Math.max(180,650*from));
    this.dialog.close();this.gallery.finishExpansion();this.gallery.scroll.enabled=true;
    document.body.classList.remove('reading-entry');this.busy=false;this.entry=null;
    this.returnFocus?.focus({preventScroll:true});
    document.title='LIMEN — ARCHIVE';
    if(updateHistory&&location.hash.startsWith('#log/')){
      if(this.pushed)history.back();else history.replaceState(null,'',location.pathname+location.search);
    }
  }
  navigate(entry){
    if(this.busy)return;
    this.dialog.querySelectorAll('video').forEach(v=>v.pause());
    this.entry=entry;this.render(entry);this.gallery.retargetExpansion(this.entries.indexOf(entry));this.updateTarget();
    this.media.querySelector('video')?.play().catch(()=>{});
    history.replaceState({entry:entry.id},'',`#log/${entry.id}`);
    document.title=`${entry.ko.title} — LIMEN ARCHIVE`;this.back.focus();
  }
  openFromHash(){
    const id=location.hash.match(/^#log\/(\d{4}-\d{2}-\d{2})$/)?.[1];
    const entry=this.entries.find(e=>e.id===id);if(entry)this.open(entry,null,true);
  }
}
