import test from 'node:test';
import assert from 'node:assert/strict';
import {flowPath,deformPoint,depthOpacity} from '../src/deformation.js';
test('구간별 곡면 이동의 길이 배율은 1이며 이미지를 늘리지 않는다',()=>{
 for(const depth of [700,1200,1900])for(const dip of [.4,.95,1.5])for(let s=1;s<2000;s+=3.1){
  const a=flowPath(s,depth,dip),b=flowPath(s+.01,depth,dip);
  const scale=Math.hypot(b.y-a.y,b.z-a.z)/.01;
  assert.ok(Math.abs(scale-1)<.00001,`arc metric ${scale} at ${s}`);
 }
});
test('작은 하강·복귀만 보이고 뒤쪽 깊이로 물러난다',()=>{
 const screenY=s=>{const p=flowPath(s);return (122+p.y)*1000/(1000-p.z);};
 const crest=screenY(135),dip=screenY(230),returning=screenY(600);
 assert.ok(crest-dip>12&&crest-dip<25);
 assert.ok(returning-dip>5&&returning-dip<20);
 const a=flowPath(300),b=flowPath(301);
 assert.ok(Math.abs(b.z-a.z)>4*Math.abs(b.y-a.y));
});
test('멀어진 면은 깊이에 따라 완전히 사라진다',()=>{
 assert.equal(depthOpacity(120),1);assert.equal(depthOpacity(900),0);
 let previous=1;
 for(let s=230;s<2000;s+=15){
  const alpha=depthOpacity(-flowPath(s).z);
  assert.ok(alpha<=previous);previous=alpha;
 }
 assert.equal(depthOpacity(-flowPath(1000).z),0);
});
test('두 열은 동일한 깊이와 높이 경로를 공유한다',()=>{
 const p={bendLow:122,depth:1200,dip:.95,wave:0,time:0};
 for(let y=0;y<1700;y+=21){
  const a=deformPoint(-278,y,p),b=deformPoint(278,y,p);
  assert.equal(a.y,b.y);assert.equal(a.z,b.z);assert.ok(Math.abs(b.x-a.x-556)<1e-8);
 }
});
test('곡면 접합점의 위치와 접선은 연속이다',()=>{
 for(const s of [0,175,203.5,223.5]){
  const a=flowPath(s-.01),b=flowPath(s),c=flowPath(s+.01);
  assert.ok(Math.hypot(c.y-a.y,c.z-a.z)<.02001);
  assert.ok(Math.hypot(c.y-2*b.y+a.y,c.z-2*b.z+a.z)<.00001);
 }
});
