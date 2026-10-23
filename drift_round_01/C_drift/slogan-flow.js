const clamp = n => Math.max(0, Math.min(1, n));
const smooth = (a,b,n) => { const k=clamp((n-a)/(b-a)); return k*k*(3-2*k); };

export function createSloganFlow(section) {
  const type = section.querySelector('.slogan-type');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    update(rect, vh) {
      // Begin narrowing as the next section enters; finish well before the film rises.
      const p = clamp((vh*.7-rect.top)/(rect.height-vh*.3));
      const pass = smooth(0,.78,p);
      const x = .24+1.01*smooth(.22,.78,pass);
      const bounds = type.getBoundingClientRect();
      const local = (innerWidth*x-bounds.left)/bounds.width*100;
      type.style.setProperty('--light-x', `${local.toFixed(3)}%`);
      type.style.setProperty('--glass', reduced.matches ? '0' : (smooth(.16,.32,pass)*(1-smooth(.72,.85,pass))).toFixed(3));
      section.style.setProperty('--quiet', smooth(.65,.85,p).toFixed(3));
      return reduced.matches ? (p>0 ? 1 : 0) : pass;
    }
  };
}
