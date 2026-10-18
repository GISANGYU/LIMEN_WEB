import {presets,controls} from './config.js';
import {Gallery} from './gallery.js';
import {EntryDetail} from './entry-detail.js';
import {loadImageUrl,loadImageFile} from './textures.js';

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const settings={...(reducedMotion.matches?presets.still:presets.reference),single:false,pause:false,wire:false,light:true};
const $=selector=>document.querySelector(selector);
let gallery,detail,entries=[],animationFrame,loading=false;
const error=message=>{$('#error').hidden=false;$('#error').textContent=message;};
function sync(){controls.forEach(([key])=>{const input=$(`#${key}`);input.value=settings[key];$(`#out-${key}`).textContent=Number(settings[key]).toFixed(key==='depth'||key==='wave'?0:2);});}
for(const [key,label,min,max,step] of controls){
  const row=document.createElement('label');row.className='range-row';row.htmlFor=key;
  const text=document.createElement('span');text.textContent=label;
  const output=document.createElement('output');output.id=`out-${key}`;output.htmlFor=key;
  const input=document.createElement('input');Object.assign(input,{type:'range',id:key,min,max,step});
  input.addEventListener('input',()=>{settings[key]=Number(input.value);sync();});row.append(text,output,input);$('#ranges').append(row);
}
sync();
$('#preset').value=reducedMotion.matches?'still':'reference';
function showPanel(open){$('#panel').hidden=!open;$('#toggle').setAttribute('aria-expanded',String(open));if(open)$('#close').focus();else $('#toggle').focus();}
$('#toggle').onclick=()=>showPanel($('#panel').hidden);$('#close').onclick=()=>showPanel(false);
$('.skip').onclick=e=>{e.preventDefault();showPanel(true);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#panel').hidden)showPanel(false);});
$('#preset').onchange=e=>{Object.assign(settings,presets[e.target.value]);sync();};
for(const key of ['single','pause','wire'])$(`#${key}`).onchange=e=>{settings[key]=e.target.checked;if(key==='single')gallery?.resize();};
$('#home').onclick=()=>{gallery?.reset();$('#gallery-surface').focus();};
$('#gallery-nav').onclick=()=>$('#gallery-surface').focus();
$('#theme').onclick=()=>{settings.light=!settings.light;$('#theme').textContent=settings.light?'Dark mode':'Light mode';$('#theme').setAttribute('aria-pressed',String(settings.light));gallery?.resize();};
$('#add-images').onclick=()=>showPanel(true);
$('#reset').onclick=()=>{
  Object.assign(settings,reducedMotion.matches?presets.still:presets.reference,{single:false,pause:false,wire:false});
  $('#preset').value=reducedMotion.matches?'still':'reference';for(const key of ['single','pause','wire'])$(`#${key}`).checked=false;
  $('#images').value='';void restoreCollection();sync();
};
$('#export').onclick=()=>{
  const blob=new Blob([JSON.stringify({schema:'limen-scroll-study-v7.1',status:'Prototype proposal',settings},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='limen-motion-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#images').onchange=async e=>{
  if(loading||!gallery)return;
  const files=[...e.target.files].slice(0,12);if(!files.length)return;
  if(files.some(file=>file.size>30*1024*1024)){$('#status').textContent='Choose images smaller than 30 MB each.';return;}
  loading=true;$('#images').disabled=true;$('#reset').disabled=true;$('#status').textContent='Loading images…';
  const assets=[];
  try{
    for(const file of files)assets.push(await loadImageFile(file));
    gallery.setItems(files.map((file,i)=>({title:`Image ${String(i+1).padStart(2,'0')}`,en:'Personal collection · Motion study'})),assets);gallery.onActivate=null;
    $('#content-count').textContent=`Projects ${String(files.length).padStart(2,'0')}`;$('#status').textContent=`${files.length} images loaded · Infinite loop`;
  }catch{assets.forEach(asset=>asset.map.dispose());$('#status').textContent='Unable to load images. Choose PNG, JPG or WebP files.';}
  finally{loading=false;$('#images').disabled=false;$('#reset').disabled=false;}
};
function animate(now){
  try{gallery.frame(now);}catch(e){console.error(e);error('Rendering stopped. Reload the page or try another browser.');return;}
  animationFrame=requestAnimationFrame(animate);
}
async function restoreCollection(){
  if(!gallery||!entries.length)return;
  $('#reset').disabled=true;
  try{const assets=await Promise.all(entries.map(e=>loadImageUrl(e.poster)));gallery.setItems(entries,assets);gallery.onActivate=(index,item)=>detail.open(entries[index],item);$('#content-count').textContent=`Sessions ${entries.length}`;$('#status').textContent='12 sessions · 182 records from SNOOZE';}
  catch(e){console.error(e);$('#status').textContent='Unable to restore the collection. Reload to try again.';}
  finally{$('#reset').disabled=false;}
}
try{
  const response=await fetch('./data/test-logs.json');if(!response.ok)throw Error('Test log data unavailable');
  entries=(await response.json()).entries;
  const assets=await Promise.all(entries.map(entry=>loadImageUrl(entry.poster)));
  gallery=new Gallery($('#stage'),settings);gallery.setItems(entries,assets);detail=new EntryDetail(gallery,entries,reducedMotion);
  $('#status').textContent='12 sessions · 182 records from SNOOZE';
  animationFrame=requestAnimationFrame(animate);requestAnimationFrame(()=>detail.openFromHash());
  $('#stage').addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(animationFrame);error('Graphics connection lost. Reload to restart.');});
}catch(e){console.error(e);error('Unable to start the gallery. Check that the local server is running and the data and assets folders are present. WebGL and hardware acceleration must be available.');}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(animationFrame);else if(gallery&&$('#error').hidden){gallery.last=performance.now();animationFrame=requestAnimationFrame(animate);}});
reducedMotion.addEventListener('change',e=>{if(e.matches){Object.assign(settings,presets.still);$('#preset').value='still';sync();}});
