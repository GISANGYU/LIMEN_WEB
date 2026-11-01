// Campus map data — taken from the team's own visit_infographic.svg (8주차, 학교 캠퍼스맵 단순화).
// Coordinates are in its 1280 x 540 viewBox. Scale and entrances are simplified (see caption on pages).
export const VB = [1280, 540];
export const ROADS = [
  '20,128 350,225 430,350 600,350 660,295 780,290 1260,432',
  '655,300 655,238 1000,238',
  '876,238 876,300',
  '150,245 350,225',
];
export const BUILDINGS = [
  { x: 38, y: 182, w: 100, h: 128, n: '8', t: '창조관' },
  { x: 100, y: 322, w: 210, h: 66, n: '7', t: '조형관' },
  { x: 310, y: 135, w: 58, h: 48, n: 'D', t: '' },
  { x: 415, y: 228, w: 36, h: 52, n: 'E', t: '' },
  { x: 478, y: 172, w: 190, h: 64, n: '1', t: '본관' },
  { x: 730, y: 165, w: 130, h: 50, n: '2', t: '디자인관', start: true },
  { x: 625, y: 345, w: 105, h: 65, n: '6', t: '우경아트홀' },
  { x: 737, y: 300, w: 64, h: 110, n: '5', t: '학생식당' },
  { x: 990, y: 408, w: 100, h: 82, n: '4', t: '평생교육관' },
  { x: 950, y: 268, w: 56, h: 34, n: 'A', t: '' },
  { x: 955, y: 160, w: 120, h: 92, n: '3', t: '정보관', goal: true },
];
// 디자인관 → 길 → 동쪽 → 정보관 (4 steps on the page)
export const ROUTE = [[795, 215], [795, 238], [905, 238], [1000, 238], [1015, 252]];
export const routeD = () => 'M' + ROUTE.map((p) => p.join(',')).join(' L');

export function campusSVG({ road = '#3a4558', fill = '#1c2433', stroke = '#2c3647', label = '#6f7d93', route = '#6ff0d8', goalGlow = '#2495ff', routeW = 6, cls = '' } = {}) {
  const b = BUILDINGS.map((o) => `<g class="bd${o.start ? ' bd-start' : ''}${o.goal ? ' bd-goal' : ''}"><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="10" fill="${o.goal || o.start ? 'none' : fill}" stroke="${o.goal || o.start ? route : stroke}" stroke-width="${o.goal || o.start ? 2 : 1.5}"/>` +
    `<text x="${o.x + o.w / 2}" y="${o.y + o.h / 2 + (o.t ? -2 : 8)}" text-anchor="middle" font-size="22" font-weight="800" fill="${o.goal || o.start ? route : label}">${o.n}</text>` +
    (o.t ? `<text x="${o.x + o.w / 2}" y="${o.y + o.h / 2 + 16}" text-anchor="middle" font-size="12.5" font-weight="500" fill="${o.goal || o.start ? route : label}">${o.t}</text>` : '') + '</g>').join('');
  return `<svg class="${cls}" viewBox="0 0 ${VB[0]} ${VB[1]}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard Variable, Pretendard, sans-serif">` +
    ROADS.map((p, i) => `<polyline points="${p}" fill="none" stroke="${road}" stroke-width="${i === 0 ? 18 : i === 3 ? 8 : 10}" stroke-linejoin="round" stroke-linecap="round"/>`).join('') +
    `<circle cx="1015" cy="206" r="74" fill="${goalGlow}" fill-opacity=".14"/>` + b +
    `<path class="route" d="${routeD()}" fill="none" stroke="${route}" stroke-width="${routeW}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>` +
    `<circle class="route-dot" cx="795" cy="215" r="9" fill="${route}"/>` +
    `<text x="1015" y="150" text-anchor="middle" font-size="13" font-weight="700" fill="${route}" letter-spacing="1.5">8F HORIZON STUDIO</text></svg>`;
}
