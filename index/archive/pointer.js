export class Pointer{
  constructor(field){
    this.field=field;this.active=false;this.x=0;this.y=0;this.smoothX=0;this.smoothY=0;this.last=null;
    this.onMove=e=>{
      const u=e.clientX/innerWidth,v=1-e.clientY/innerHeight;
      const ui=e.target instanceof Element&&e.target.closest('header,aside,.gallery-nav,footer,dialog');
      this.active=!ui&&e.pointerType!=='touch';this.x=u*2-1;this.y=v*2-1;
      if(!ui&&this.last){
        const dist=Math.hypot(u-this.last.u,v-this.last.v);
        if(dist>0.0001){
          const steps=Math.min(8,Math.max(1,Math.ceil(dist/.025)));
          for(let i=1;i<=steps;i++){const t=i/steps;this.field.disturb(this.last.u+(u-this.last.u)*t,this.last.v+(v-this.last.v)*t,Math.min(.065,dist*1.5+.010));}
        }
      }
      this.last=ui?null:{u,v};
    };
    this.onOut=e=>{if(!e.relatedTarget){this.active=false;this.last=null;}};
    this.onBlur=()=>{this.active=false;this.last=null;};
    window.addEventListener('pointermove',this.onMove);window.addEventListener('pointerout',this.onOut);window.addEventListener('blur',this.onBlur);
  }
  update(dt){const a=1-Math.exp(-dt*5);this.smoothX+=((this.active?this.x:0)-this.smoothX)*a;this.smoothY+=((this.active?this.y:0)-this.smoothY)*a;}
  dispose(){window.removeEventListener('pointermove',this.onMove);window.removeEventListener('pointerout',this.onOut);window.removeEventListener('blur',this.onBlur);}
}
