import {drawMockup} from './mockups.js';
import * as THREE from '../vendor/three.module.min.js';

function texture(canvas){
  const map=new THREE.CanvasTexture(canvas);
  map.generateMipmaps=true;
  return {map,width:canvas.width,height:canvas.height};
}
// 재현 가능한 절차적 테스트 비주얼. 전시 장면을 표현하는 자산이 아닙니다.
export function createArtwork(kind){return texture(drawMockup(kind%6));}

export function createCaption(item,index,displayWidth=520,light=false){
  const canvas=document.createElement('canvas');const factor=2;
  canvas.width=Math.round(displayWidth*factor);canvas.height=132;
  const c=canvas.getContext('2d');c.scale(factor,factor);
  c.fillStyle=light?'#17191c':'#e0e3e7';c.font='600 16px Arial,sans-serif';c.fillText(item.title,0,22,displayWidth-40);
  c.fillStyle=light?'#53565b':'#9da5b0';c.font='400 16px Arial,sans-serif';c.fillText(item.en||'Motion study',0,43,displayWidth-40);
  c.textAlign='right';c.fillStyle=light?'#17191c':'#e0e3e7';c.font='400 20px Arial';c.fillText('↘',displayWidth,43);
  c.strokeStyle=light?'#484b50':'#89919c';c.lineWidth=.8;c.beginPath();c.moveTo(0,57);c.lineTo(displayWidth,57);c.stroke();
  return texture(canvas);
}

export async function loadImageFile(file){
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return texture(canvas);
  }finally{URL.revokeObjectURL(url);}
}

export async function loadImageUrl(url){
  const image=new Image();image.src=url;await image.decode();
  const map=new THREE.Texture(image);map.needsUpdate=true;map.generateMipmaps=true;
  return {map,width:image.naturalWidth,height:image.naturalHeight};
}
