import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(root,'data/test-logs.json'),'utf8'));

test('실제 12개 날짜와 182개 기록이 날짜순으로 보존되어 있다',()=>{
  assert.equal(data.entries.length,12);
  assert.equal(new Set(data.entries.map(e=>e.id)).size,12);
  assert.equal(data.entries.reduce((n,e)=>n+e.media.length,0),182);
  assert.equal(data.entries.flatMap(e=>e.media).filter(m=>m.video).length,34);
  for(let i=1;i<data.entries.length;i++)assert.ok(data.entries[i-1].date>data.entries[i].date);
});
test('썸네일·대표 이미지·모든 영상이 로컬에 있고 빈 파일이 아니다',()=>{
  for(const entry of data.entries){
    for(const media of [{image:entry.poster,video:entry.video},...entry.media]){
      for(const key of ['image','video']){
        if(!media[key])continue;
        assert.ok(!media[key].includes('..')&&!media[key].includes('://'));
        assert.ok(fs.statSync(path.join(root,media[key])).size>1024,media[key]);
      }
    }
  }
});
test('배포용 기록에 비밀번호·임시 인증 링크·미완성 설명이 들어가지 않는다',()=>{
  const serialized=JSON.stringify(data);
  assert.ok(!/token=|password|eyJraWQi|TODO|placeholder/i.test(serialized));
  for(const entry of data.entries){
    assert.ok(entry.title&&entry.date&&entry.place&&entry.focus&&entry.notes&&entry.summary);
    assert.ok(!/[가-힣]/.test([entry.title,entry.place,entry.focus,entry.notes,entry.summary,entry.en].join('')));
  }
});
