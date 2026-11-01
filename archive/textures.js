import * as THREE from 'three';

// 아카이브 카드 텍스처 — 사진은 그대로, 캡션은 사이트 글꼴(Pretendard)로 캔버스에 그린다
function texture(canvas){const map=new THREE.CanvasTexture(canvas);map.generateMipmaps=true;return {map,width:canvas.width,height:canvas.height};}
const SANS='"Pretendard Variable",Pretendard,"Inter Tight",system-ui,sans-serif';

export function createCaption(item,index,displayWidth=520){
  const canvas=document.createElement('canvas');const factor=2;
  canvas.width=Math.round(displayWidth*factor);canvas.height=132;
  const c=canvas.getContext('2d');c.scale(factor,factor);
  c.fillStyle='#ffffff';c.font=`300 18px ${SANS}`;c.fillText(item.ko.title,0,22,displayWidth-150);
  c.fillStyle='rgba(255,255,255,.5)';c.font=`400 13px ${SANS}`;c.fillText(`${item.title} · ${item.ko.place}`,0,45,displayWidth-150);
  c.textAlign='right';c.fillStyle='#6ff0d8';c.font=`800 11px ${SANS}`;
  c.letterSpacing='2px';c.fillText(item.date.replaceAll('-','.'),displayWidth,20);c.letterSpacing='0px';
  c.fillStyle='rgba(255,255,255,.75)';c.font=`400 18px ${SANS}`;c.fillText('↘',displayWidth,45);
  c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=.8;c.beginPath();c.moveTo(0,57);c.lineTo(displayWidth,57);c.stroke();
  return texture(canvas);
}

export async function loadImageUrl(url){
  const image=new Image();image.src=url;await image.decode();
  const map=new THREE.Texture(image);map.needsUpdate=true;map.generateMipmaps=true;
  return {map,width:image.naturalWidth,height:image.naturalHeight};
}
