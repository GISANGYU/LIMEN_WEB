import * as THREE from '../vendor/three.module.min.js';

// 원본 모델을 복제하지 않고, 반복되는 아치와 바닥을 코드로 구성한 공간 시안.
export class Space{
  constructor(background){
    this.scene=new THREE.Scene();this.scene.background=background;this.scene.fog=new THREE.Fog(background,1200,6500);
    const outer=940,inner=885,leg=520,shape=new THREE.Shape();
    shape.moveTo(-outer,0);shape.lineTo(-outer,leg);shape.absarc(0,leg,outer,Math.PI,0,true);shape.lineTo(outer,0);shape.lineTo(inner,0);shape.lineTo(inner,leg);shape.absarc(0,leg,inner,0,Math.PI,false);shape.lineTo(-inner,0);shape.closePath();
    this.geometry=new THREE.ExtrudeGeometry(shape,{depth:90,bevelEnabled:true,bevelThickness:12,bevelSize:12,bevelSegments:3,curveSegments:28,steps:1});
    this.material=new THREE.MeshStandardMaterial({color:'#c5c5c0',roughness:.7,transparent:true,opacity:.38,depthWrite:false});
    this.arches=[];
    for(let i=0;i<7;i++){const arch=new THREE.Mesh(this.geometry,this.material);arch.position.set(0,-500,-180-i*780);this.scene.add(arch);this.arches.push(arch);}
    this.floorGeometry=new THREE.PlaneGeometry(16000,16000);this.floorMaterial=new THREE.MeshStandardMaterial({color:'#c2c3bc',roughness:1});
    this.floor=new THREE.Mesh(this.floorGeometry,this.floorMaterial);this.floor.rotation.x=-Math.PI/2;this.floor.position.set(0,-510,-6000);this.scene.add(this.floor);
    this.hemi=new THREE.HemisphereLight('#ffffff','#e0e3e8',2.0);this.scene.add(this.hemi);
    this.light=new THREE.DirectionalLight('#fff9e8',2.5);this.light.position.set(-1100,2200,1200);this.scene.add(this.light);
  }
  resize(h,light){
    this.scene.fog.color.copy(this.scene.background);
    const floor=-Math.max(h*.58,470);this.floor.position.y=floor-10;
    for(const arch of this.arches)arch.position.y=floor;
    this.material.color.set(light?'#e1e4e7':'#253046');this.floorMaterial.color.set(light?'#d2d6d9':'#101b2b');
    this.hemi.intensity=light?2.5:1.1;this.light.intensity=light?1.1:1.0;
  }
  dispose(){this.geometry.dispose();this.material.dispose();this.floorGeometry.dispose();this.floorMaterial.dispose();}
}
