import * as THREE from 'three';

// 갤러리 뒤 공간 — 원래 시안의 회색 아치 대신, 전시장의 네 면(좌 · 정면 위 · 우 벽 + 바닥)을 선으로만 그린 틀이
// 안개 속으로 이어진다. INDEX SPACE 도면과 같은 흰 선 + 민트.
export class Room{
  constructor(background){
    this.scene=new THREE.Scene();this.scene.background=background;this.scene.fog=new THREE.Fog(background,900,6200);
    const W=1880,H=1500,pts=[];
    // 틀: 바닥선 + 좌 · 우 벽 세로선 + 위 가로선, 깊이마다 반복
    for(let i=0;i<9;i++){
      const z=-180-i*720;
      pts.push(-W/2,0,z, W/2,0,z,  -W/2,0,z, -W/2,H,z,  W/2,0,z, W/2,H,z,  -W/2,H,z, W/2,H,z);
    }
    this.frameGeometry=new THREE.BufferGeometry();this.frameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    this.frameMaterial=new THREE.LineBasicMaterial({color:'#6ff0d8',transparent:true,opacity:.22});
    this.frames=new THREE.LineSegments(this.frameGeometry,this.frameMaterial);this.scene.add(this.frames);
    // 바닥 격자 — 깊이 방향 선 + 가로 선
    const g=[];
    for(let x=-W/2;x<=W/2+1;x+=W/12)g.push(x,0,200, x,0,-6400);
    for(let z=200;z>=-6400;z-=360)g.push(-W/2,0,z, W/2,0,z);
    this.gridGeometry=new THREE.BufferGeometry();this.gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(g,3));
    this.gridMaterial=new THREE.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.07});
    this.grid=new THREE.LineSegments(this.gridGeometry,this.gridMaterial);this.scene.add(this.grid);
  }
  resize(h){
    this.scene.fog.color.copy(this.scene.background);
    const floor=-Math.max(h*.58,470);this.frames.position.y=floor;this.grid.position.y=floor;
  }
  dispose(){this.frameGeometry.dispose();this.frameMaterial.dispose();this.gridGeometry.dispose();this.gridMaterial.dispose();}
}
