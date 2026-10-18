import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchField} from '../src/touch-field.js';
test('커서 파동이 유한값을 유지하며 입력 종료 후 감쇠한다',()=>{
 const field=new TouchField(32);field.disturb(.5,.5,.08);
 for(let i=0;i<20;i++)field.update(1/60);
 assert.ok(field.energy>0);const active=field.energy;
 for(let i=0;i<900;i++)field.update(1/60);
 assert.ok(field.height.every(Number.isFinite));assert.ok(field.energy<active*.1);
 field.clear();assert.equal(field.sample(.5,.5),0);field.dispose();
});
