// Reveal the reference palette only beneath the pointer, even while rows scroll.
const list = document.querySelector('#sgPairs');
const stage = document.querySelector('#slogan .sg-sticky');
const colors = ['#71c9ea','#62bbee','#65a8f4','#7695f3','#8d87ef','#a07cec','#b17ce6','#bf83df','#cc97cd','#d4adbd','#ddc1ad','#e3cfae','#e8dab9'];
let words = [], visible = false, running = false;
const pointer = {x: -1000, y: -1000, present: false};
function prepare() {
  words = [];
  [...list.querySelectorAll('li:not(.foot)')].forEach((row, i) => {
    row.querySelectorAll('span').forEach(word => {
      word.dataset.hoverWord = word.textContent;
      word.style.setProperty('--word-color', colors[Math.min(i, colors.length - 1)]);
      words.push(word);
    });
  });
}
prepare();
if (!words.length) {
  const observer = new MutationObserver(() => {prepare(); if (words.length) observer.disconnect();});
  observer.observe(list, {childList: true});
}
function start() {if (!running) {running = true; requestAnimationFrame(frame);}}
function frame() {
  if (!visible) {list.style.setProperty('--word-hover-on','0');running = false;return;}
  const bounds = stage.getBoundingClientRect();
  const inside = pointer.present && pointer.x >= bounds.left && pointer.x <= bounds.right && pointer.y >= bounds.top && pointer.y <= bounds.bottom;
  list.style.setProperty('--word-hover-on', inside ? '1' : '0');
  if (inside) {
    // Read the live transformed positions so a still cursor also colors scrolling text.
    const rects = words.map(word => word.getBoundingClientRect());
    words.forEach((word, i) => {
      word.style.setProperty('--word-hover-x', `${pointer.x - rects[i].left}px`);
      word.style.setProperty('--word-hover-y', `${pointer.y - rects[i].top}px`);
    });
  }
  requestAnimationFrame(frame);
}
addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  pointer.x = event.clientX; pointer.y = event.clientY; pointer.present = true;
  if (visible) start();
}, {passive: true});
document.documentElement.addEventListener('pointerleave', () => {pointer.present = false;}, {passive: true});
addEventListener('blur', () => {pointer.present = false;});
new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; if (visible) start();}, {threshold: 0}).observe(stage);
