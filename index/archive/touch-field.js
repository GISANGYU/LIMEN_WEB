import * as THREE from 'three';

// 감쇠하는 2D 파동장. 커서가 지난 위치의 높이와 기울기를 GPU에 전달합니다.
export class TouchField{
  constructor(size=160){
    this.size=size;this.height=new Float32Array(size*size);this.velocity=new Float32Array(size*size);this.next=new Float32Array(size*size);
    this.bytes=new Uint8Array(size*size*4);this.texture=new THREE.DataTexture(this.bytes,size,size,THREE.RGBAFormat);
    this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;
    this.accumulator=0;this.energy=0;this.encode();
  }
  disturb(u,v,amount){
    const n=this.size,cx=u*(n-1),cy=v*(n-1),radius=2.2;
    for(let y=Math.max(1,Math.floor(cy-radius*2));y<Math.min(n-1,cy+radius*2);y++)for(let x=Math.max(1,Math.floor(cx-radius*2));x<Math.min(n-1,cx+radius*2);x++){
      const d=((x-cx)**2+(y-cy)**2)/(radius*radius);
      this.velocity[y*n+x]+=Math.exp(-d)*Math.min(.18,amount);
    }
  }
  update(dt){
    const n=this.size;this.accumulator+=dt;
    let steps=0;
    while(this.accumulator>=1/60&&steps++<3){
      this.accumulator-=1/60;
      for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
        const i=y*n+x,h=this.height[i];const lap=this.height[i-1]+this.height[i+1]+this.height[i-n]+this.height[i+n]-4*h;
        this.next[i]=Math.max(-1,Math.min(1,(this.velocity[i]+lap*.24)*.925));
      }
      for(let i=0;i<n*n;i++){this.velocity[i]=this.next[i];this.height[i]=Math.max(-1,Math.min(1,(this.height[i]+this.velocity[i])*.975));}
    }
    this.encode();
  }
  encode(){
    const n=this.size;let energy=0;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=y*n+x,j=i*4,h=this.height[i];
      const gx=(this.height[y*n+Math.min(n-1,x+1)]-this.height[y*n+Math.max(0,x-1)])*.5;
      const gy=(this.height[Math.min(n-1,y+1)*n+x]-this.height[Math.max(0,y-1)*n+x])*.5;
      const e=Math.min(1,Math.abs(h)*.65+Math.hypot(gx,gy)*2.5);energy=Math.max(energy,e);
      this.bytes[j]=Math.round((Math.max(-1,Math.min(1,gx*3))*.5+.5)*255);
      this.bytes[j+1]=Math.round((Math.max(-1,Math.min(1,gy*3))*.5+.5)*255);
      this.bytes[j+2]=Math.round((h*.5+.5)*255);this.bytes[j+3]=Math.round(e*255);
    }
    this.energy=energy;this.texture.needsUpdate=true;
  }
  sample(u,v){
    const n=this.size,x=Math.max(0,Math.min(n-1,Math.round(u*(n-1)))),y=Math.max(0,Math.min(n-1,Math.round(v*(n-1))));
    return this.height[y*n+x];
  }
  clear(){this.height.fill(0);this.velocity.fill(0);this.next.fill(0);this.encode();}
  dispose(){this.texture.dispose();}
}
