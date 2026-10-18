import test from 'node:test';
import assert from 'node:assert/strict';
import {EntryDetail} from '../src/entry-detail.js';

function setup(reduced=true){
  const elements=new Map(),frames=[];
  const el=()=>({open:false,className:'',dataset:{},onclick:null,addEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},focus(){this.focused=true;},getBoundingClientRect(){return{left:100,top:120,width:800,height:450};},showModal(){this.open=true;},close(){this.open=false;}});
  for(const id of ['#entry-detail','#entry-hero','#entry-hero-media','#entry-back'])elements.set(id,el());
  const dialog=elements.get('#entry-detail');dialog.classList={contains:name=>dialog.className.split(' ').includes(name)};
  globalThis.document={querySelector:id=>elements.get(id),activeElement:el(),body:{classList:{add(){},remove(){}}},title:''};
  globalThis.window={addEventListener(){}};globalThis.innerWidth=1000;globalThis.innerHeight=800;
  globalThis.location={hash:'',pathname:'/',search:''};
  const historyCalls=[];globalThis.history={pushState(a,b,url){location.hash=url;historyCalls.push('push');},replaceState(){historyCalls.push('replace');},back(){historyCalls.push('back');}};
  globalThis.requestAnimationFrame=fn=>frames.push(fn);
  const item={index:0,art:{visible:true,position:{y:10}}};
  const gallery={items:[item],scroll:{enabled:true,current:327.5,target:400,onUp(){}},touch:{clear(){}},pointer:{active:true,last:null},
    startExpansion(item){this.expansion={item,progress:0,target:{set(){}}};},finishExpansion(){this.expansion=null;}};
  const entry={id:'2026-09-22',title:'Inside the horizon'};
  const controller=new EntryDetail(gallery,[entry],{matches:reduced});
  // Test controller lifecycle, independent of DOM rendering and WebGL.
  controller.render=()=>{};
  return {controller,gallery,entry,item,dialog,frames,historyCalls};
}
test('상세 진입은 목록 위치를 보존하고 닫으면 입력과 포커스를 복구한다',async()=>{
  const s=setup();const focus=document.activeElement;
  await s.controller.open(s.entry,s.item);
  assert.equal(s.gallery.scroll.current,327.5);assert.equal(s.gallery.scroll.target,327.5);
  assert.equal(s.gallery.scroll.enabled,false);assert.equal(s.dialog.open,true);
  assert.equal(s.gallery.expansion.progress,1);assert.equal(s.dialog.className,'is-ready');
  s.dialog.scrollTop=1200;
  await s.controller.close();
  assert.equal(s.dialog.scrollTop,0);
  assert.equal(s.gallery.scroll.current,327.5);assert.equal(s.gallery.scroll.enabled,true);
  assert.equal(s.gallery.expansion,null);assert.equal(s.dialog.open,false);assert.equal(focus.focused,true);
  assert.deepEqual(s.historyCalls,['push','back']);
});
test('확장 중 즉시 닫아도 오래된 애니메이션이 상세를 다시 열지 않는다',async()=>{
  const s=setup(false);const opening=s.controller.open(s.entry,s.item);
  const closing=s.controller.close();
  while(s.frames.length)s.frames.shift()(performance.now()+2000);
  await Promise.all([opening,closing]);
  assert.equal(s.dialog.open,false);assert.equal(s.gallery.expansion,null);
  assert.equal(s.gallery.scroll.enabled,true);assert.notEqual(s.dialog.className,'is-ready');
});
