import { BUILDINGS, ROADS, ROUTE } from '../_shared/js/campus.js';

// Source footprints: the team's visit_infographic.svg, via campus.js.
// Projection and equal floor spacing are graphic conventions, not surveyed heights or an indoor plan.
const clamp = v => Math.max(0, Math.min(1, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const smooth = v => v * v * (3 - 2 * v);
const project = (x, y, h = 0) => [(x - 400) * 1.12 + (y - 150) * .35 + 40, (y - 150) * .7 - (x - 400) * .13 + 290 - h];
const point = p => p.map(n => n.toFixed(2)).join(',');
const path = pts => 'M' + pts.map(point).join(' L');
const poly = pts => pts.map(point).join(' ');

export function createVisit(host) {
  const svg = host.querySelector('#visitSvg');
  const buildings = BUILDINGS.filter(b => b.x > 450).map((b, i) => {
    const corners = [[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    const floor = corners.map(([x,y])=>project(x,y));
    const roof = corners.map(([x,y])=>project(x,y,22));
    const c = project(b.x+b.w/2,b.y+b.h/2,22);
    const key = b.start || b.goal;
    return `<g class="vp-building ${key ? 'vp-key' : ''}" data-order="${i}">
      <path class="vp-side vp-build-line" d="${path([roof[2],floor[2],floor[3],roof[3]])}" pathLength="1"/>
      <path class="vp-side vp-build-line" d="${path([roof[1],floor[1],floor[2]])}" pathLength="1"/>
      <polygon class="vp-roof vp-build-line" points="${poly(roof)}" pathLength="1"/>
      <text class="${key ? 'vp-label' : 'vp-small-label'}" x="${c[0]}" y="${c[1]+4}" text-anchor="middle">${b.t || b.n}</text>
      ${key ? `<path class="vp-guide" d="M${c[0]},${c[1]-28}v-36"/><text class="vp-caption" x="${c[0]}" y="${c[1]-75}" text-anchor="middle">${b.start ? '01 / DEPARTURE' : '02 / INFORMATION'}</text>` : ''}
    </g>`;
  }).join('');
  let grid = '';
  for (let x=400;x<=1150;x+=50) grid+=`<path class="vp-grid" d="${path([project(x,100),project(x,510)])}"/>`;
  for (let y=100;y<=510;y+=50) grid+=`<path class="vp-grid" d="${path([project(400,y),project(1150,y)])}"/>`;
  const roads = ROADS.slice(0,3).map(r=>{
    const pts=r.split(' ').map(s=>s.split(',').map(Number)).map(([x,y])=>project(x,y));
    return `<path class="vp-road-bed" d="${path(pts)}"/><path class="vp-road vp-build-line" d="${path(pts)}" pathLength="1"/>`;
  }).join('');
  const route = ROUTE.map(([x,y])=>project(x,y));
  const start = route[0];
  const floors = Array.from({length:8},(_,i)=>{
    const y=536-i*42;
    return `<g class="vp-floor-group" data-floor="${i+1}"><polygon class="vp-floor ${i===7?'vp-floor-top':''}" points="650,${y} 790,${y-35} 925,${y+25} 785,${y+60}"/>
      <path class="vp-guide" d="M925,${y+25}h24"/><text class="vp-floor-number ${i===7?'vp-top-number':''}" x="959" y="${y+29}">${i+1}F</text></g>`;
  }).join('');
  svg.innerHTML = `<defs><clipPath id="visitCampusClip"><rect x="-30" y="95" width="1120" height="515"/></clipPath></defs>
    <g id="visitCampus">
      <g id="visitGrid">${grid}<path class="vp-guide" d="${path([project(400,238),project(1150,238)])}"/></g>
      <g clip-path="url(#visitCampusClip)">${roads}${buildings}</g>
      <path class="vp-route-track" d="${path(route)}"/>
      <path id="visitRoute" class="vp-route" d="${path(route)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <circle class="vp-start" cx="${start[0]}" cy="${start[1]}" r="5"/>
      <g id="visitWalker"><circle class="vp-dot-ring" r="12"/><circle class="vp-dot" r="3"/></g>
      <text class="vp-caption" x="240" y="591">KAYWON CAMPUS / SCHEMATIC PLAN</text>
    </g>
    <g id="visitElevation" opacity="0">
      <path class="vp-guide" d="M650,190v390M790,160v410M925,210v360"/>
      ${floors}
      <path class="vp-lift-track" d="M787,549V255"/>
      <path id="visitLift" class="vp-lift" d="M787,549V255" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <g id="visitLiftCar"><path d="M775,0l12,-4 12,4 -12,4Z" fill="#b2eee0"/><circle class="vp-dot-ring" cx="787" r="16"/></g>
      <text id="visitFloorCount" class="vp-floor-count" x="600" y="417" text-anchor="end">1</text><text class="vp-floor-count-small" x="606" y="417">F</text>
      <text class="vp-caption" x="787" y="639" text-anchor="middle">INFORMATION / VERTICAL CONNECTION</text>
    </g>
    <g class="vp-arrival" id="visitArrival" opacity="0">
      <path class="vp-route" d="M787,242V162H856" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <circle cx="856" cy="162" r="3" fill="#b2eee0"/>
      <text class="vp-caption" x="650" y="108">YOU HAVE ARRIVED / 8F</text>
      <text class="vp-destination" x="650" y="145">Horizon Studio.</text>
    </g>
    <g id="visitConnector" opacity="0"><path class="vp-guide" d="M520,430C590,430 580,549 650,549"/><text class="vp-caption" x="530" y="471">UP TO 8F ↗</text></g>`;

  const get=id=>host.querySelector('#'+id);
  const campus=get('visitCampus'), routeEl=get('visitRoute'), walker=get('visitWalker');
  const elevation=get('visitElevation'), lift=get('visitLift'), car=get('visitLiftCar');
  const arrival=get('visitArrival'), connector=get('visitConnector'), gridEl=get('visitGrid');
  const outline=[...svg.querySelectorAll('.vp-build-line')];
  outline.forEach(el=>{el.style.strokeDasharray='1';el.style.strokeDashoffset='1';});
  const blocks=[...svg.querySelectorAll('.vp-building')];
  const layers=[...svg.querySelectorAll('.vp-floor-group')];
  const stops=[...host.querySelectorAll('[data-stop]')];
  const progress=get('visitProgress'), number=get('visitStageNumber'), label=get('visitStageLabel'), title=get('visitStageTitle');
  const mode=get('visitMode'), hint=get('visitHint'), counter=get('visitFloorCount');
  const routeLength=routeEl.getTotalLength();
  const stages=[['CAMPUS','디자인관에서 출발'],['ON THE WAY','정보관으로 이동'],['GOING UP','정보관 8층으로'],['ARRIVAL','호라이즌 스튜디오']];
  let lastPhase=-1, previous=-1;
  function update(p) {
    if (p===previous) return;
    previous=p;
    const drawing=range(p,0,.18), walking=range(p,.18,.51), rising=range(p,.65,.88);
    const shift=smooth(range(p,.50,.65)), arrived=range(p,.88,.94);
    const phase=p<.18?0:p<.56?1:p<.88?2:3;
    host.dataset.phase=String(phase);
    progress.style.transform=`scaleX(${p})`;
    outline.forEach((el,i)=>{el.style.strokeDashoffset=String(1-range(drawing,(i%5)*.07,.65+(i%5)*.07));});
    blocks.forEach((el,i)=>{el.style.opacity=.15+.85*range(drawing,i*.035,.5+i*.035);});
    gridEl.style.opacity=String(.25+.75*drawing);
    routeEl.style.strokeDashoffset=String(1-walking);
    const pos=routeEl.getPointAtLength(routeLength*walking);
    walker.setAttribute('transform',`translate(${pos.x} ${pos.y})`);
    walker.style.opacity=String(range(p,.14,.18));
    campus.setAttribute('transform',`translate(${-70*shift} ${130*shift}) scale(${1-.35*shift})`);
    campus.style.opacity=String(1-.25*shift);
    elevation.style.opacity=String(shift);
    connector.style.opacity=String(shift);
    elevation.setAttribute('transform',`translate(0 ${24*(1-shift)})`);
    layers.forEach((el,i)=>{
      const appear=range(p,.52+i*.009,.60+i*.009);
      el.style.opacity=String(appear);
      el.setAttribute('transform',`translate(0 ${14*(1-appear)})`);
      const lit = i/7<=rising;
      el.querySelector('polygon').style.fillOpacity=lit?(i===7?.22:.12):.035;
      el.querySelector('text').style.fill=lit?'#b2eee0':'#69879c';
    });
    lift.style.strokeDashoffset=String(1-rising);
    car.setAttribute('transform',`translate(0 ${549-294*rising})`);
    counter.textContent=String(Math.min(8,1+Math.floor(rising*7+1e-6)));
    arrival.style.opacity=String(arrived);
    arrival.querySelector('path').style.strokeDashoffset=String(1-arrived);
    if (phase!==lastPhase) {
      lastPhase=phase;
      number.textContent=String(phase+1).padStart(2,'0');
      [label.textContent,title.textContent]=stages[phase];
      stops.forEach((el,i)=>{
        el.classList.toggle('is-current',i===phase);
        el.classList.toggle('is-past',i<phase);
        if(i===phase) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
      });
      mode.textContent=phase<2?'CAMPUS PLAN':phase===2?'VERTICAL CONNECTION':'HORIZON STUDIO';
      hint.textContent=phase===3?'정보관 8층, LIMEN에서 만나요.':'스크롤해 길을 따라가세요 ↓';
    }
  }
  update(0);
  return {update};
}
