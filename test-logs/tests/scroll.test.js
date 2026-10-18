import test from 'node:test';
import assert from 'node:assert/strict';
import {InfiniteScroll} from '../src/scroll.js';

globalThis.Element=class {constructor(panel=false){this.panel=panel;}closest(){return this.panel;}};
globalThis.innerHeight=800;
globalThis.document={body:{classList:{add(){},remove(){}}}};
globalThis.window={addEventListener(){},removeEventListener(){}};
const surface={addEventListener(){},removeEventListener(){},setPointerCapture(){}};

test('위아래 휠을 제한 없이 처리하고 설정 패널 입력은 가로채지 않는다',()=>{
  const scroll=new InfiniteScroll(surface,1);
  for(let i=0;i<1000;i++)scroll.onWheel({target:new Element(),preventDefault(){},deltaMode:0,deltaY:500});
  assert.equal(scroll.target,500000);
  for(let i=0;i<2000;i++)scroll.onWheel({target:new Element(),preventDefault(){},deltaMode:0,deltaY:-500});
  assert.equal(scroll.target,-500000);
  scroll.onWheel({target:new Element(true),preventDefault(){throw Error('패널 스크롤 가로챔');},deltaMode:0,deltaY:700});
  assert.equal(scroll.target,-500000);
});
test('장시간 순환 재정규화가 위상과 관성 잔여 거리를 보존한다',()=>{
  for(const sign of [-1,1]){
    const scroll=new InfiniteScroll(surface,1);scroll.current=sign*1000123;scroll.target=scroll.current+400;
    const cycle=3900;const expected=scroll.current+(scroll.target-scroll.current)*0.07;
    scroll.update(1/60,.07,cycle);
    const mod=x=>((x%cycle)+cycle)%cycle;
    assert.ok(Math.abs(mod(scroll.current)-mod(expected))<1e-6);
    assert.ok(Math.abs((scroll.target-scroll.current)-372)<1e-6);
    assert.ok(Math.abs(scroll.current)<cycle);
  }
});
test('60Hz와 120Hz에서 같은 시간 후의 스크롤 관성이 같다',()=>{
  const a=new InfiniteScroll(surface,1),b=new InfiniteScroll(surface,1);a.target=b.target=1000;
  for(let i=0;i<60;i++)a.update(1/60,.07,100000);
  for(let i=0;i<120;i++)b.update(1/120,.07,100000);
  assert.ok(Math.abs(a.current-b.current)<1e-8);
});
test('드래그와 방향키가 같은 가상 스크롤에 연결된다',()=>{
  const scroll=new InfiniteScroll(surface,1);
  scroll.onDown({target:new Element(),button:0,pointerId:4,clientY:500});
  scroll.onMove({pointerId:4,clientY:200});assert.equal(scroll.target,300);
  scroll.onUp();scroll.onMove({pointerId:4,clientY:100});assert.equal(scroll.target,300);
  scroll.onKey({target:new Element(),key:'PageDown',preventDefault(){}});assert.equal(scroll.target,900);
  scroll.onKey({target:new Element(),key:'Home',preventDefault(){}});assert.equal(scroll.target,0);
});

test('기본 휠 이동량을 35%로 줄인다',()=>{
 const scroll=new InfiniteScroll(surface);
 scroll.onWheel({target:new Element(),preventDefault(){},deltaMode:0,deltaY:100});
 assert.equal(scroll.target,35);
});

test('상세 화면에서는 휠과 키보드를 가로채지 않아 기본 스크롤이 가능하다',()=>{
 const scroll=new InfiniteScroll(surface);scroll.current=scroll.target=327.5;scroll.enabled=false;
 const event={target:new Element(),preventDefault(){throw Error('상세 화면 입력 가로챔');},deltaMode:0,deltaY:500,key:'PageDown'};
 scroll.onWheel(event);scroll.onKey(event);scroll.onDown({...event,button:0,pointerId:1,clientY:500});
 assert.equal(scroll.target,327.5);assert.equal(scroll.drag,null);
});
