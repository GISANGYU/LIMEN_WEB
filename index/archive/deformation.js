export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// Shared arc-length spine. Its Y/Z derivative has length 1: no elastic stretch.
export function flowPath(s,depth=1200,dip=.95){
  if(s<=0||depth<=0)return {y:s,z:0,fold:0};
  const scale=Math.max(.55,Math.min(1.8,depth/1200));
  const r1=100*scale,r2=50*scale,angle=1.75,exit=1.35,run=30*Math.max(.25,dip)*scale;
  const first=r1*angle,second=first+run,third=second+r2*(angle-exit);
  if(s<first){const t=s/r1;return {y:r1*Math.sin(t),z:r1*(Math.cos(t)-1),fold:Math.min(1,t/(Math.PI/2))};}
  let y=r1*Math.sin(angle),z=r1*(Math.cos(angle)-1);
  if(s<second){const d=s-first;return {y:y+d*Math.cos(angle),z:z-d*Math.sin(angle),fold:1};}
  y+=run*Math.cos(angle);z-=run*Math.sin(angle);
  if(s<third){const t=angle-(s-second)/r2;return {y:y+r2*(Math.sin(angle)-Math.sin(t)),z:z+r2*(Math.cos(angle)-Math.cos(t)),fold:1};}
  y+=r2*(Math.sin(angle)-Math.sin(exit));z+=r2*(Math.cos(angle)-Math.cos(exit));
  return {y:y+(s-third)*Math.cos(exit),z:z-(s-third)*Math.sin(exit),fold:1};
}

// Same world-space field for both columns and their CPU hover surfaces.
export function deformPoint(x,y,p){
  const s=y-p.bendLow,path=flowPath(s,p.depth,p.dip);
  const phase=(x-y)*.02-p.time*2,crest=Math.sin(phase);
  const behind=p.depth>0?smooth(100,380,s):0;
  const lateral=32*Math.sin(s/190)*behind;
  return {x:x+lateral,y:p.bendLow+path.y+p.wave*.07*crest,
    z:path.z+p.wave*.42*crest,fold:path.fold,
    retire:p.depth>0?smooth(260,850,Math.max(0,-path.z)):0};
}

export const depthOpacity=depth=>1-smooth(260,850,depth);
