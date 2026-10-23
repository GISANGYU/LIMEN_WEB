// VISIT — studio10b.com "Click and drag to explore" applied to the team's campus map.
// studio10b OrbitControls (measured): enableDamping true, dampingFactor .05, rotateSpeed 1, zoomSpeed 1.5,
// enablePan false, autoRotate true, autoRotateSpeed .5, cursor grab. Zoom is disabled here so the wheel keeps
// scrolling the page (the hero on studio10b is the only thing on screen, ours is mid-page).
// The orbit math below is the same as three's OrbitControls: sphericalDelta accumulates input,
// spherical += delta * dampingFactor, delta *= (1 - dampingFactor); autoRotate adds 2π/60/60*speed per frame.
import * as THREE from 'three';
import { BUILDINGS, ROADS, ROUTE } from './_shared/js/campus.js';
import { clamp } from './_shared/js/core.js';

const S = 1 / 40, CX = 760, CY = 270;
const W = (x, y) => new THREE.Vector3((x - CX) * S, 0, (y - CY) * S);

export function createMap(canvas, host) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x0b0d12);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x0b0d12, 30, 70);
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 200);
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b0d12, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(-8, 16, 6); scene.add(dl);

  // ground + fine grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; scene.add(ground);
  const grid = new THREE.GridHelper(60, 60, 0x1b2130, 0x151a26); grid.position.y = 0; scene.add(grid);

  // roads — flat ribbons along the team's polylines (widths 18 / 10 / 8 px like campusSVG)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: .9 });
  ROADS.forEach((pts, ri) => {
    const P = pts.split(' ').map((s) => s.split(',').map(Number)); const w = (ri === 0 ? 18 : ri === 3 ? 8 : 10) * S;
    for (let i = 0; i < P.length - 1; i++) {
      const a = W(...P[i]), b = W(...P[i + 1]); const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + w, .03, w), roadMat);
      m.position.copy(a).add(b).multiplyScalar(.5); m.position.y = .015; m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(m);
    }
  });

  // buildings — extruded footprints; start/goal outlined in the route colour
  const tags = [];
  const mBase = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: .75, metalness: .05 });
  BUILDINGS.forEach((o) => {
    const hgt = o.goal ? 4.2 : o.start ? 1.8 : (o.t ? 1.1 + (o.w * o.h) / 9000 : .7);
    const mat = o.goal ? new THREE.MeshStandardMaterial({ color: 0x0f3a3a, emissive: 0x1a8f84, emissiveIntensity: .55, roughness: .4 })
      : o.start ? new THREE.MeshStandardMaterial({ color: 0x23364a, emissive: 0x16404a, emissiveIntensity: .4 }) : mBase;
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.w * S, hgt, o.h * S), mat);
    const c = W(o.x + o.w / 2, o.y + o.h / 2); m.position.set(c.x, hgt / 2, c.z); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: o.goal || o.start ? 0x6ff0d8 : 0x33405a, transparent: true, opacity: o.goal || o.start ? .9 : .6 }));
    e.position.copy(m.position); scene.add(e);
    if (o.t) {
      const el = document.createElement('div'); el.className = 'tag3d' + (o.goal ? ' goal' : '');
      el.textContent = o.goal ? '3 정보관 · 8F Horizon Studio' : o.n + ' ' + o.t; host.appendChild(el);
      tags.push({ el, p: new THREE.Vector3(c.x, hgt + .35, c.z), key: o.goal || o.start });
    }
  });
  // goal beacon (8th floor)
  const goal = BUILDINGS.find((b) => b.goal); const gc = W(goal.x + goal.w / 2, goal.y + goal.h / 2);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 10, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x6ff0d8, transparent: true, opacity: .5 }));
  beacon.position.set(gc.x, 4.2 + 5, gc.z); scene.add(beacon);
  const floor8 = new THREE.Mesh(new THREE.BoxGeometry(goal.w * S + .12, .14, goal.h * S + .12), new THREE.MeshBasicMaterial({ color: 0x6ff0d8 }));
  floor8.position.set(gc.x, 4.2 * 7.5 / 8, gc.z); scene.add(floor8);

  // route tube, drawn by scroll
  const path = new THREE.CurvePath(); for (let i = 0; i < ROUTE.length - 1; i++) { const a = W(...ROUTE[i]), b = W(...ROUTE[i + 1]); a.y = b.y = .12; path.add(new THREE.LineCurve3(a, b)); }
  const tube = new THREE.TubeGeometry(path, 200, .09, 8, false);
  const route = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0x6ff0d8 })); scene.add(route);
  const total = tube.index.count;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(dot);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.3, .42, 40), new THREE.MeshBasicMaterial({ color: 0x6ff0d8, transparent: true, opacity: .6, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; scene.add(halo);

  // ---- OrbitControls-equivalent (rotate only)
  const target = new THREE.Vector3((900 - CX) * S, 0, (230 - CY) * S);
  const sph = new THREE.Spherical(26, .92, -.5), delta = new THREE.Spherical(0, 0, 0);
  const C = { dampingFactor: .05, rotateSpeed: 1, autoRotate: true, autoRotateSpeed: .5, minPolar: .28, maxPolar: 1.3 };
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    const h = canvas.clientHeight;
    delta.theta -= 2 * Math.PI * dx / h * C.rotateSpeed;                 // rotateLeft
    if (drag.type !== 'touch') delta.phi -= 2 * Math.PI * dy / h * C.rotateSpeed;   // rotateUp (touch keeps vertical for page scroll)
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);
  const v = new THREE.Vector3();
  return {
    update(t, prog) {
      if (C.autoRotate && !drag) delta.theta -= 2 * Math.PI / 60 / 60 * C.autoRotateSpeed;
      sph.theta += delta.theta * C.dampingFactor; sph.phi += delta.phi * C.dampingFactor;
      sph.phi = clamp(sph.phi, C.minPolar, C.maxPolar);
      delta.theta *= 1 - C.dampingFactor; delta.phi *= 1 - C.dampingFactor;
      sph.radius = innerWidth < 820 ? 34 : 26;
      camera.position.setFromSpherical(sph).add(target); camera.lookAt(target);
      // route by scroll
      const p = clamp(prog);
      route.geometry.setDrawRange(0, Math.max(0, Math.floor(total * p / 6) * 6));
      const pt = path.getPointAt(Math.min(.999, Math.max(.001, p)));
      dot.position.copy(pt); halo.position.set(pt.x, .05, pt.z); halo.scale.setScalar(1 + Math.sin(t * 3) * .15);
      beacon.material.opacity = .25 + .3 * (.5 + .5 * Math.sin(t * 2)) * (.4 + p);
      renderer.render(scene, camera);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      tags.forEach(({ el, p: pp, key }) => {
        v.copy(pp).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        el.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px) translate(-50%,-100%)`;
        el.style.opacity = vis ? (key ? 1 : .75) : 0;
      });
    },
  };
}
