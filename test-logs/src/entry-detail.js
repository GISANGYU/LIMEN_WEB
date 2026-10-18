const ease=t=>t*t*(3-2*t);

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
    }else{element.src=asset.image;element.alt=asset.alt||'A photograph from the session';element.loading=hero?'eager':'lazy';element.decoding='async';}
    if(asset.width&&asset.height){element.style.aspectRatio=`${asset.width}/${asset.height}`;if(!asset.video){element.width=asset.width;element.height=asset.height;}}
    if(hero)element.className='entry-main-media';
    return element;
  }
  render(entry){
    this.dialog.scrollTop=0;this.media.replaceChildren(this.createMedia({image:entry.poster,video:entry.video,alt:entry.title},true));
    const dateTop=document.querySelector('#entry-date-top');dateTop.textContent=entry.date.replaceAll('-','.');dateTop.dateTime=entry.date;
    document.querySelector('#entry-number').textContent=`FIELD NOTES / ${String(this.entries.indexOf(entry)+1).padStart(2,'0')}`;
    document.querySelector('#entry-title').textContent=entry.title;
    document.querySelector('#entry-summary').textContent=entry.summary;
    document.querySelector('#entry-date').textContent=entry.date.replaceAll('-','.');
    document.querySelector('#entry-place').textContent=entry.place;
    document.querySelector('#entry-focus').textContent=entry.focus;
    document.querySelector('#entry-count').textContent=`${entry.media.length} records`;
    document.querySelector('#entry-notes').textContent=entry.notes;
    document.querySelector('#entry-evidence-count').textContent=`${entry.media.filter(m=>!m.video).length} photographs / ${entry.media.filter(m=>m.video).length} films`;
    const grid=document.querySelector('#entry-evidence');grid.replaceChildren();
    entry.media.forEach((asset,i)=>{
      const figure=document.createElement('figure');figure.className='evidence-item';
      const media=this.createMedia(asset);figure.append(media);
      const caption=document.createElement('figcaption');caption.textContent=`${String(i+1).padStart(2,'0')} / ${asset.video?'Film':'Photograph'}${asset.duration?' · '+asset.duration:''}`;
      figure.append(caption);grid.append(figure);
    });
    const next=this.entries[(this.entries.indexOf(entry)+1)%this.entries.length];
    document.querySelector('#entry-next-date').textContent=next.date.replaceAll('-','.');
    const nextButton=document.querySelector('#entry-next');nextButton.textContent=next.title+' ↗';
    nextButton.onclick=()=>this.navigate(next);
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
    this.busy=false;document.title=`${entry.title} — SNOOZE Test Logs`;
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
    document.title='SNOOZE — Test Logs';
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
    document.title=`${entry.title} — SNOOZE Test Logs`;this.back.focus();
  }
  openFromHash(){
    const id=location.hash.match(/^#log\/(\d{4}-\d{2}-\d{2})$/)?.[1];
    const entry=this.entries.find(e=>e.id===id);if(entry)this.open(entry,null,true);
  }
}
