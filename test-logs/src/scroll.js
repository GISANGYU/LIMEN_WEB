// 끝이 없는 가상 이동량. UI 패널에서는 자체 스크롤을 유지한다.
export class InfiniteScroll{
  constructor(surface,gain=0.35){
    this.gain=gain;this.enabled=true;
    this.target=0;this.current=0;this.drag=null;this.surface=surface;
    this.ignore=target=>target instanceof Element&&!!target.closest('header,aside,button,input,select,label,a');
    this.onWheel=e=>{if(!this.enabled||this.ignore(e.target))return;e.preventDefault();const unit=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;this.target+=Math.max(-innerHeight*2,Math.min(innerHeight*2,e.deltaY*unit))*this.gain;};
    this.onDown=e=>{if(!this.enabled||this.ignore(e.target)||e.button>0)return;this.drag={id:e.pointerId,y:e.clientY};surface.setPointerCapture?.(e.pointerId);document.body.classList.add('dragging');};
    this.onMove=e=>{if(this.drag?.id!==e.pointerId)return;this.target+=(this.drag.y-e.clientY)*Math.min(1,this.gain*1.8);this.drag.y=e.clientY;};
    this.onUp=()=>{this.drag=null;document.body.classList.remove('dragging');};
    this.onKey=e=>{if(!this.enabled||this.ignore(e.target))return;const steps={ArrowDown:70,ArrowUp:-70,PageDown:innerHeight*.75,PageUp:-innerHeight*.75,' ':innerHeight*.75};if(e.key in steps){e.preventDefault();this.target+=steps[e.key]*this.gain*(e.shiftKey?-1:1);}if(e.key==='Home'){e.preventDefault();this.target=0;}};
    window.addEventListener('wheel',this.onWheel,{passive:false});
    surface.addEventListener('pointerdown',this.onDown);surface.addEventListener('pointermove',this.onMove);surface.addEventListener('pointerup',this.onUp);surface.addEventListener('pointercancel',this.onUp);window.addEventListener('keydown',this.onKey);
  }
  update(dt,smoothing,cycle){
    this.current+=(this.target-this.current)*(1-Math.pow(1-smoothing,dt*60));
    if(cycle>0&&Math.abs(this.current)>cycle*100){const shift=Math.trunc(this.current/cycle)*cycle;this.current-=shift;this.target-=shift;}
    return this.current;
  }
  reset(){this.target=this.current=0;}
  dispose(){window.removeEventListener('wheel',this.onWheel);window.removeEventListener('keydown',this.onKey);this.surface.removeEventListener('pointerdown',this.onDown);this.surface.removeEventListener('pointermove',this.onMove);this.surface.removeEventListener('pointerup',this.onUp);this.surface.removeEventListener('pointercancel',this.onUp);}
}
