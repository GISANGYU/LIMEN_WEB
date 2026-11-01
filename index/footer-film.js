// UNCOMMON Studio's observed Vidzflow footer film (1onGsLqU9w).
// Original 8.25-second loop, native playback, no pointer / scroll-time seeking.
export function createFooterFilm(host){
  const video=host.querySelector('video'),button=host.querySelector('button');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,paused=reduced.matches,failed=false,requestId=0;
  video.muted=true;
  function label(){
    button.textContent=paused?'영상 재생 ▶':'영상 멈춤 Ⅱ';
    button.setAttribute('aria-pressed',String(paused));
    host.dataset.motion=paused?'paused':'playing';
  }
  async function sync(){
    const request=++requestId;
    if(!active||paused||document.hidden||failed){video.pause();return;}
    if(!video.getAttribute('src')){video.preload='auto';video.src=video.dataset.src;}
    try{await video.play();if(request!==requestId&&(!active||paused||document.hidden))video.pause();}
    catch(error){if(request===requestId&&error.name!=='AbortError'){paused=true;label();}}
  }
  button.addEventListener('click',()=>{paused=!paused;label();sync();});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',e=>{paused=e.matches;label();sync();});
  video.addEventListener('error',()=>{failed=true;video.pause();button.textContent='영상을 불러오지 못했습니다';button.disabled=true;host.dataset.motion='error';});
  label();
  return {set active(value){active=value;host.dataset.active=String(value);sync();}};
}
