// 호라이즌 스튜디오 — 하나의 3D 정의에서 (1) 블루프린트 SVG 선과 (2) three.js 모델을 같이 뽑는다.
// 같은 카메라로 투영하므로 도면 → 모델 전환 때 선이 정확히 겹친다.
//
// 실측: 정면 7.2×4m, 옆면 4×4m, 바닥 7.2×4m (2026-09-30 사용자 실측)
// 추정: 모서리 곡률 반경, 장비 위치·크기, 운영 공간 깊이 — 5주차 PDF 의 배치도·현장 사진을 보고 잡은 값
import * as THREE from 'three';

export const DIM = {
  X0: -3.6, X1: 3.6,      // 정면 폭 7.2
  ZB: -2, ZF: 2,          // 투사 바닥 깊이 4 (뒤벽 z=-2)
  ZR: 5.2,                // 방 앞쪽 끝 (운영 공간 포함, 추정)
  H: 4,                   // 벽 높이 4
  R: 0.45,                // 바닥-벽 곡면 반경 (추정)
  RC: 0.6,                // 벽-벽 세로 모서리 곡면 반경 (추정)
  TRUSS: 3.6,             // 천장 트러스 높이 (추정)
};
const { X0, X1, ZB, ZF, ZR, H, R, RC, TRUSS } = DIM;

/* ---------- 장비 설명 (호버 패널) ---------- */
export const INFO = [
  { id: 'space',     no: '01', title: '4면 투사 공간', lines: ['정면 7.2×4m · 옆면 4×4m · 바닥 7.2×4m', '모서리가 곡면으로 이어진 사이클로라마 구조', '벽 세 면은 흐르는 세계, 바닥은 선택의 자리'] },
  { id: 'projector', no: '02', title: '프로젝터', lines: ['엡손 10,000 ANSI · 천장 트러스 고정', '정면·좌·우 벽과 흰 무대 바닥에 투사', 'MadMapper 로 면마다 잘라 워핑·블렌딩'] },
  { id: 'kinect',    no: '03', title: '움직임 인식 카메라', lines: ['Kinect v2 · 정면 천장에서 비스듬히', '관객의 발밑 위치만 감지 (탑뷰)', '감지 범위 약 4.2×3.5m'] },
  { id: 'light',     no: '04', title: '조명', lines: ['호라이즌 스튜디오 LED 패널·스폿', '프로젝션 환경에 맞춘 조도 조절', '전시 중에는 꺼서 투사 대비를 지킨다'] },
  { id: 'speaker',   no: '05', title: '스피커', lines: ['Genelec 8020D · 4채널', '네 모서리에서 공간 음향', '장면 전환과 맞춘 몰입형 사운드'] },
  { id: 'visitor',   no: '06', title: '관객', lines: ['바닥 위의 걸음이 곧 입력', '지나간 자리에 흔적이 남아', '다음 사람의 선택 환경이 된다'] },
  { id: 'pc',        no: '07', title: '컴퓨터 · 모니터', lines: ['Unity 씬 1개 → 3800×2000 텍스처 1장', 'Spout 로 같은 PC 의 MadMapper 에 전달', '실시간 인터랙션 처리·전시 모니터링'] },
];

/* ---------- 사이클로라마 곡면: U 자 경로(평면) × 단면(바닥→곡면→벽) ---------- */
const SEG = [
  { len: ZF - (ZB + RC), at: (u) => ({ x: X0, z: ZF - u, nx: 1, nz: 0 }) },
  { len: Math.PI / 2 * RC, at: (u) => { const f = Math.PI + u / RC; return { x: X0 + RC + RC * Math.cos(f), z: ZB + RC + RC * Math.sin(f), nx: -Math.cos(f), nz: -Math.sin(f) }; } },
  { len: (X1 - RC) - (X0 + RC), at: (u) => ({ x: X0 + RC + u, z: ZB, nx: 0, nz: 1 }) },
  { len: Math.PI / 2 * RC, at: (u) => { const f = Math.PI * 1.5 + u / RC; return { x: X1 - RC + RC * Math.cos(f), z: ZB + RC + RC * Math.sin(f), nx: -Math.cos(f), nz: -Math.sin(f) }; } },
  { len: ZF - (ZB + RC), at: (u) => ({ x: X1, z: ZB + RC + u, nx: -1, nz: 0 }) },
];
export const ULEN = SEG.reduce((a, s) => a + s.len, 0);
function U(s) {
  s = Math.max(0, Math.min(ULEN, s));
  for (const g of SEG) { if (s <= g.len + 1e-9) return g.at(s); s -= g.len; }
  return SEG[4].at(SEG[4].len);
}
const TA = (Math.PI / 2 * R) / (Math.PI / 2 * R + (H - R));   // 단면에서 곡면이 차지하는 비율
function cyc(s, t) {
  const p = U(s); let o, h;
  if (t < TA) { const th = t / TA * Math.PI / 2; o = R * (1 - Math.sin(th)); h = R * (1 - Math.cos(th)); }
  else { o = 0; h = R + (t - TA) / (1 - TA) * (H - R); }
  return new THREE.Vector3(p.x + p.nx * o, h, p.z + p.nz * o);
}
const tAtH = (h) => (h <= R ? TA * Math.acos(1 - h / R) / (Math.PI / 2) : TA + (h - R) / (H - R) * (1 - TA));

/* ---------- 도구 ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const hash01 = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const line = (a, b, n = 2) => Array.from({ length: n }, (_, i) => a.clone().lerp(b, i / (n - 1)));
const circle = (c, r, axis = 'y', n = 64, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => {
  const f = a0 + (a1 - a0) * i / n, u = Math.cos(f) * r, v = Math.sin(f) * r;
  return axis === 'y' ? V(c.x + u, c.y, c.z + v) : axis === 'z' ? V(c.x + u, c.y + v, c.z) : V(c.x, c.y + v, c.z + u);
});

export function buildStudio() {
  const lines = [];      // { pts, cls, a, b }  — a~b : 전체 진행도에서 이 선이 그려지는 구간
  const texts = [];      // { pos, text, a }
  const marks = [];      // { pos, no, id, a }
  const L = (pts, cls, a, b, op = 1) => lines.push({ pts, cls, a, b, op });

  /* ===== 1. 격자 (Grid) — 화면 밖 먼 곳에서 크게 밀려 들어온다 ===== */
  const G0 = -0.022;                                          // 진입 순간 이미 선 끝이 화면 가장자리에 걸려 있게
  const FAR = 12, CZ = 1.6;                                   // 격자 범위(±16m)와 방 중심
  const fade = (d) => Math.max(0.12, 1 - Math.max(0, d - 4.5) / (FAR - 4.5));   // 방에서 멀수록 옅게
  // 각 선을 바깥 끝 → 방 쪽으로 그린다 (두 쪽에서 동시에 밀려든다)
  const sweep = (a, b, mid, cls, t0, t1, op) => {
    L(line(a, mid, 24), cls, t0, t1, op);
    L(line(b, mid, 24), cls, t0, t1, op);
  };
  for (let x = -FAR; x <= FAR + 0.001; x += 0.5) {
    const major = Math.abs(x % 1) < 1e-6, d = Math.abs(x);
    const t0 = G0 + 0.003 + (1 - d / FAR) * 0.018;            // 바깥 줄이 먼저 출발
    sweep(V(x, 0, CZ - FAR), V(x, 0, CZ + FAR), V(x, 0, CZ), major ? 'k-gridMajor' : 'k-grid', t0, t0 + 0.06, fade(d));
  }
  for (let z = CZ - FAR; z <= CZ + FAR + 0.001; z += 0.5) {
    const zz = Math.round(z * 2) / 2, major = Math.abs(zz % 1) < 1e-6, d = Math.abs(zz - CZ);
    const t0 = G0 + 0.008 + (1 - d / FAR) * 0.018;
    sweep(V(-FAR, 0, zz), V(FAR, 0, zz), V(0, 0, zz), major ? 'k-gridMajor' : 'k-grid', t0, t0 + 0.06, fade(d));
  }
  // 벽 격자 — 하늘 쪽 화면 밖에서 내려와 벽 높이에 닿는다
  const W0 = 0.05, SKY = 7;
  for (let x = X0; x <= X1 + 0.001; x += 0.6) L(line(V(x, H + SKY, ZB), V(x, 0, ZB), 24), 'k-grid', W0 + Math.abs(x) * 0.004, W0 + 0.07 + Math.abs(x) * 0.004, 0.9);
  for (let z = ZB; z <= ZF + 0.001; z += 0.5) {
    L(line(V(X0, H + SKY, z), V(X0, 0, z), 24), 'k-grid', W0 + 0.01, W0 + 0.08, 0.9);
    L(line(V(X1, H + SKY, z), V(X1, 0, z), 24), 'k-grid', W0 + 0.01, W0 + 0.08, 0.9);
  }
  for (let y = 0.5; y <= H + 0.001; y += 0.5) {
    // 가로줄은 방 양옆 바깥에서 들어온다
    L(line(V(X0 - 8, y, ZB), V(X1, y, ZB), 24), 'k-grid', W0 + 0.03 + y * 0.008, W0 + 0.1 + y * 0.008, 0.85);
    L(line(V(X0, y, ZF + 8), V(X0, y, ZB), 24), 'k-grid', W0 + 0.035 + y * 0.008, W0 + 0.1 + y * 0.008, 0.85);
    L(line(V(X1, y, ZF + 8), V(X1, y, ZB), 24), 'k-grid', W0 + 0.035 + y * 0.008, W0 + 0.1 + y * 0.008, 0.85);
  }

  /* ===== 작도선 (애플 로고 작도처럼 원과 중심선) ===== */
  const C0 = 0.13;
  L(line(V(0, 0, ZB - 0.8), V(0, 0, ZR + 0.6)), 'k-center', C0, C0 + 0.05);
  L(line(V(X0 - 0.8, 0, 0), V(X1 + 0.8, 0, 0)), 'k-center', C0 + 0.01, C0 + 0.06);
  L(line(V(0, 0, ZB), V(0, H + 0.6, ZB)), 'k-center', C0 + 0.02, C0 + 0.06);
  L(line(V(X0, 0, ZB), V(X1, 0, ZF)), 'k-construct', C0 + 0.02, C0 + 0.07);
  L(line(V(X1, 0, ZB), V(X0, 0, ZF)), 'k-construct', C0 + 0.02, C0 + 0.07);
  L(circle(V(0, 0, 0), 2, 'y', 96), 'k-construct', C0 + 0.03, C0 + 0.09);                 // 바닥 내접원 Ø4000
  L(circle(V(-2.4, 0, 0), 1.2, 'y', 72), 'k-construct', C0 + 0.05, C0 + 0.1);
  L(circle(V(2.4, 0, 0), 1.2, 'y', 72), 'k-construct', C0 + 0.05, C0 + 0.1);
  // 곡면 반경을 정하는 원들
  L(circle(V(X0 + RC, 0, ZB + RC), RC, 'y', 48), 'k-construct', C0 + 0.07, C0 + 0.11);
  L(circle(V(X1 - RC, 0, ZB + RC), RC, 'y', 48), 'k-construct', C0 + 0.07, C0 + 0.11);
  L(circle(V(X0 + R, R, ZF), R, 'x', 40), 'k-construct', C0 + 0.08, C0 + 0.12);
  L(circle(V(X1 - R, R, ZF), R, 'x', 40), 'k-construct', C0 + 0.08, C0 + 0.12);
  L(circle(V(0, R, ZB + R), R, 'x', 40), 'k-construct', C0 + 0.08, C0 + 0.12);
  texts.push({ pos: V(1.45, 0, 1.45), text: 'Ø4000', a: C0 + 0.08 });
  // 축선 번호 (건축 도면의 그리드 버블) — 가로 1~7, 세로 A~H
  for (let i = 0; i < 7; i++) {
    const x = -3 + i, c = V(x, 0, ZB - 1.0);
    L(circle(c, 0.2, 'y', 28), 'k-gridMajor', G0 + 0.1 + i * 0.006, G0 + 0.14 + i * 0.006);
    L(line(V(x, 0, ZB - 0.8), V(x, 0, ZB - 0.6)), 'k-gridMajor', G0 + 0.1, G0 + 0.13);
    texts.push({ pos: c, text: String(i + 1), a: G0 + 0.12 + i * 0.006, cls: 'bub' });
  }
  'ABCDEFGH'.split('').forEach((ch, i) => {
    const z = -2 + i, c = V(X0 - 0.85, 0, z);
    L(circle(c, 0.2, 'y', 28), 'k-gridMajor', G0 + 0.11 + i * 0.006, G0 + 0.15 + i * 0.006);
    L(line(V(X0 - 0.65, 0, z), V(X0 - 0.4, 0, z)), 'k-gridMajor', G0 + 0.11, G0 + 0.14);
    texts.push({ pos: c, text: ch, a: G0 + 0.13 + i * 0.006, cls: 'bub' });
  });

  /* ===== 2. 공간 (Space) — 곡면 벽 ===== */
  const S0 = 0.22;
  const T = (t, a, b, cls = 'k-struct') => L(Array.from({ length: 160 }, (_, i) => cyc(ULEN * i / 159, t)), cls, a, b);
  T(0, S0, S0 + 0.07);                          // 바닥 접선
  T(TA, S0 + 0.02, S0 + 0.09);                  // 벽 접선
  T(1, S0 + 0.04, S0 + 0.11);                   // 벽 윗선
  for (const h of [1, 2, 3]) T(tAtH(h), S0 + 0.06 + h * 0.01, S0 + 0.12 + h * 0.01, 'k-wire');
  // 단면선 — U 를 따라 차례로
  const NS = 34;
  for (let i = 0; i <= NS; i++) {
    const s = ULEN * i / NS, edge = i === 0 || i === NS;
    L(Array.from({ length: 40 }, (_, j) => cyc(s, j / 39)), edge ? 'k-struct' : 'k-wire', S0 + 0.03 + i / NS * 0.1, S0 + 0.07 + i / NS * 0.1);
  }
  // 바닥 앞선(투사 경계)과 운영 공간
  L(line(V(X0 + R, 0, ZF), V(X1 - R, 0, ZF), 2), 'k-struct', S0 + 0.08, S0 + 0.12);
  L(line(V(X0, 0, ZF), V(X0, 0, ZR)), 'k-struct', S0 + 0.1, S0 + 0.14);
  L(line(V(X1, 0, ZF), V(X1, 0, ZR)), 'k-struct', S0 + 0.1, S0 + 0.14);
  L(line(V(X0, 0, ZR), V(X1, 0, ZR)), 'k-struct', S0 + 0.12, S0 + 0.15);
  L(line(V(X0, H, ZF), V(X0, H, ZR)), 'k-struct', S0 + 0.11, S0 + 0.15);
  L(line(V(X1, H, ZF), V(X1, H, ZR)), 'k-struct', S0 + 0.11, S0 + 0.15);
  L(line(V(X0, 0, ZR), V(X0, H, ZR)), 'k-struct', S0 + 0.13, S0 + 0.16);
  L(line(V(X1, 0, ZR), V(X1, H, ZR)), 'k-struct', S0 + 0.13, S0 + 0.16);
  // 문 (오른벽 앞쪽)
  L([V(X1, 0, 3.7), V(X1, 2.1, 3.7), V(X1, 2.1, 4.6), V(X1, 0, 4.6)], 'k-struct', S0 + 0.14, S0 + 0.17);
  L(circle(V(X1, 0, 3.7), 0.9, 'y', 24, 0, Math.PI / 2).map((p) => V(X1 - (p.z - 3.7), 0, 3.7 + (p.x - X1))), 'k-wire', S0 + 0.15, S0 + 0.18);

  /* 치수선 */
  const D0 = 0.34;
  const dim = (a, b, off, text, tPos) => {
    const ea = a.clone().add(off), eb = b.clone().add(off);
    L([a.clone().add(off.clone().multiplyScalar(0.15)), ea.clone().add(off.clone().multiplyScalar(0.25))], 'k-dim', D0, D0 + 0.03);
    L([b.clone().add(off.clone().multiplyScalar(0.15)), eb.clone().add(off.clone().multiplyScalar(0.25))], 'k-dim', D0, D0 + 0.03);
    L([ea, eb], 'k-dim', D0 + 0.02, D0 + 0.06);
    const dir = eb.clone().sub(ea).normalize().multiplyScalar(0.09), n = off.clone().normalize().multiplyScalar(0.09);
    for (const e of [ea, eb]) L([e.clone().sub(dir).sub(n), e.clone().add(dir).add(n)], 'k-dim', D0 + 0.05, D0 + 0.07);
    texts.push({ pos: tPos || ea.clone().lerp(eb, 0.5).add(off.clone().normalize().multiplyScalar(0.28)), text, a: D0 + 0.06 });
  };
  dim(V(X0, 0, ZF), V(X1, 0, ZF), V(0, 0, 0.6), '7,200');
  dim(V(X1, 0, ZB), V(X1, 0, ZF), V(0.6, 0, 0), '4,000');
  dim(V(X0, 0, ZB), V(X0, H, ZB), V(-0.6, 0, 0), '4,000');
  texts.push({ pos: V(X0 + 0.2, R + 0.75, ZF), text: 'R 곡면', a: D0 + 0.07 });
  texts.push({ pos: V(X1 - RC - 0.1, 0.05, ZB + RC + 0.95), text: 'R 곡면 모서리', a: D0 + 0.07 });
  texts.push({ pos: V(0, 0, ZF + 1.6), text: '운영 공간', a: D0 + 0.08 });
  // 높이 표기와 단면 표시
  for (const [y, t] of [[H, 'EL +4,000'], [TRUSS, 'EL +3,600 TRUSS'], [0, 'EL ±0 STAGE']]) {
    L(line(V(X1 + 0.15, y, ZB), V(X1 + 1.1, y, ZB)), 'k-dim', D0 + 0.03, D0 + 0.06);
    L([V(X1 + 0.15, y + 0.12, ZB), V(X1 + 0.27, y, ZB), V(X1 + 0.39, y + 0.12, ZB)], 'k-dim', D0 + 0.05, D0 + 0.07);
    texts.push({ pos: V(X1 + 1.25, y + 0.16, ZB), text: t, a: D0 + 0.07, cls: 'left' });
  }
  texts.push({ pos: V(X0 + R, R * 2 + 0.35, ZF), text: 'SECTION A', a: C0 + 0.1 });
  // 단면 해치 (곡면 끝 단면의 두께 표현)
  for (const side of [0, 1]) {
    const sx = side ? X1 : X0, dir = side ? 1 : -1;
    for (let k = 0; k < 9; k++) {
      const h = 0.15 + k * 0.42;
      L(line(V(sx + dir * 0.02, h, ZF), V(sx + dir * 0.18, h + 0.16, ZF)), 'k-wire', S0 + 0.12 + k * 0.004, S0 + 0.15 + k * 0.004);
    }
    L(line(V(sx + dir * 0.2, 0, ZF), V(sx + dir * 0.2, H, ZF)), 'k-wire', S0 + 0.12, S0 + 0.16);
  }

  /* ===== 3D 모델 ===== */
  const root = new THREE.Group();
  const pick = [];
  const groups = {};
  const mats = [];
  const M = (o) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide, ...o }); mats.push(m); return m; };
  // 벽은 안쪽 면만 그린다 → 카메라 쪽 벽은 저절로 비쳐 보이는 컷어웨이가 된다
  const room = { white: M({ color: '#f3f6fb', side: THREE.FrontSide }), floor: M({ color: '#eef2f8' }), ops: M({ color: '#aeb7c6' }), wall: M({ color: '#c9d0dc', side: THREE.FrontSide }) };
  const dev = M({ color: '#2a3140', roughness: 0.55, metalness: 0.25 });
  const truss = M({ color: '#1b2029', roughness: 0.6, metalness: 0.3 });
  const glass = M({ color: '#9fd7ff', emissive: '#203a66', roughness: 0.2, metalness: 0.4 });
  const panel = M({ color: '#e6ecf5', emissive: '#55657e', roughness: 0.4 });
  const body = M({ color: '#dfe5ee', roughness: 0.9 });
  const wood = M({ color: '#c8a77e', roughness: 0.8 });

  const reg = (id, obj, edges = true) => {
    (groups[id] ||= { objs: [], helpers: [], id }).objs.push(obj);
    obj.traverse((o) => { if (o.isMesh) { o.userData.id = id; pick.push(o); } });
    obj.userData.edges = edges;
    root.add(obj);
    return obj;
  };

  // 곡면 벽 메쉬
  const cg = new THREE.BufferGeometry(), NSu = 220, NTv = 70, pos = [], idx = [];
  for (let i = 0; i <= NSu; i++) for (let j = 0; j <= NTv; j++) { const p = cyc(ULEN * i / NSu, j / NTv); pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < NSu; i++) for (let j = 0; j < NTv; j++) { const a = i * (NTv + 1) + j, b = a + NTv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
  const cycMesh = new THREE.Mesh(cg, room.white); cycMesh.userData.noEdges = true;
  // 투사 바닥 (곡면 접선 안쪽, 뒤 모서리 둥근 사각)
  const sh = new THREE.Shape(), r2 = RC - R;
  sh.moveTo(X0 + R, ZF); sh.lineTo(X0 + R, ZB + RC); sh.absarc(X0 + RC, ZB + RC, r2, Math.PI, Math.PI * 1.5, false);
  sh.lineTo(X1 - RC, ZB + R); sh.absarc(X1 - RC, ZB + RC, r2, Math.PI * 1.5, Math.PI * 2, false); sh.lineTo(X1 - R, ZF); sh.lineTo(X0 + R, ZF);
  const fg = new THREE.ShapeGeometry(sh, 24); fg.rotateX(Math.PI / 2);   // shape y → z
  const floor = new THREE.Mesh(fg, room.floor); floor.userData.noEdges = true;
  const spaceG = new THREE.Group(); spaceG.add(cycMesh, floor); reg('space', spaceG, false);
  // 운영 공간 (회색 바닥 + 옆벽)
  const ops = new THREE.Group();
  const opsFloor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, ZR - ZF), room.ops); opsFloor.rotation.x = -Math.PI / 2; opsFloor.position.set(0, -0.002, (ZF + ZR) / 2);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(ZR - ZF, H), room.wall); wl.rotation.y = Math.PI / 2; wl.position.set(X0, H / 2, (ZF + ZR) / 2);
  const wr = wl.clone(); wr.position.x = X1; wr.rotation.y = -Math.PI / 2;
  ops.add(opsFloor, wl, wr); ops.traverse((o) => (o.userData.noEdges = true)); root.add(ops);

  // 천장 트러스
  const tr = new THREE.Group();
  const bar = (a, b, r = 0.035) => { const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(r, r, len), truss); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); return m; };
  const TZ = [-1.5, -0.3, 0.9, 2.1, 3.3], TX = [-2.7, 0, 2.7];
  for (const z of TZ) tr.add(bar(V(-3.05, TRUSS, z), V(3.05, TRUSS, z)));
  for (const x of TX) tr.add(bar(V(x, TRUSS + 0.04, -1.65), V(x, TRUSS + 0.04, 3.45)));
  for (const z of [TZ[0], TZ[2], TZ[4]]) for (const x of TX) tr.add(bar(V(x, TRUSS, z), V(x, H + 0.35, z), 0.025));
  root.add(tr);
  const D1 = 0.40;
  for (const z of TZ) L(line(V(-3.05, TRUSS, z), V(3.05, TRUSS, z)), 'k-device', D1 + (z + 1.5) * 0.006, D1 + 0.04 + (z + 1.5) * 0.006);
  for (const x of TX) L(line(V(x, TRUSS + 0.04, -1.65), V(x, TRUSS + 0.04, 3.45)), 'k-device', D1 + 0.01, D1 + 0.05);

  // 프로젝터 4대 — 정면벽·바닥·좌벽·우벽
  const PROJ = [
    { p: V(0, 3.42, 2.6), yaw: Math.PI, pitch: -0.26, target: [V(X0, 0, ZB), V(X1, 0, ZB), V(X1, H, ZB), V(X0, H, ZB)] },
    { p: V(0, 3.42, 0.25), yaw: Math.PI, pitch: -Math.PI / 2, target: [V(X0 + R, 0, ZB + R), V(X1 - R, 0, ZB + R), V(X1 - R, 0, ZF), V(X0 + R, 0, ZF)] },
    { p: V(1.35, 3.42, -0.3), yaw: -Math.PI / 2, pitch: -0.3, target: [V(X0, 0, ZB), V(X0, 0, ZF), V(X0, H, ZF), V(X0, H, ZB)] },
    { p: V(-1.35, 3.42, -0.3), yaw: Math.PI / 2, pitch: -0.3, target: [V(X1, 0, ZB), V(X1, 0, ZF), V(X1, H, ZF), V(X1, H, ZB)] },
  ];
  PROJ.forEach((d, i) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.45), dev);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 14), glass); lens.rotation.x = Math.PI / 2; lens.position.set(0.1, 0, 0.27);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), truss); mount.position.y = 0.17;
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.2), truss); vent.position.set(-0.05, 0.095, -0.05);
    g.add(box, lens, vent);
    g.position.copy(d.p); g.rotation.order = 'YXZ'; g.rotation.y = d.yaw; g.rotation.x = d.pitch;
    const m2 = mount.clone(); m2.position.copy(d.p).add(V(0, 0.12, 0)); root.add(m2);
    reg('projector', g);
    // 호버 때 보이는 투사 원뿔
    g.updateMatrixWorld(true);
    const lensW = lens.getWorldPosition(new THREE.Vector3());
    const fr = []; for (const t of d.target) fr.push(lensW, t);
    fr.push(...d.target.flatMap((t, k) => [t, d.target[(k + 1) % 4]]));
    const fgeo = new THREE.BufferGeometry().setFromPoints(fr);
    const frustum = new THREE.LineSegments(fgeo, new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.85 }));
    frustum.visible = false; root.add(frustum); groups.projector.helpers.push(frustum);
  });

  // 조명 — LED 패널 2줄 + 스폿 4개
  const lightG = new THREE.Group();
  for (const z of [-1.5, 0.9]) for (const x of [-2.25, -1.1, 0.4, 1.55]) {
    const pnl = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.4), dev);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), panel); face.rotation.x = Math.PI / 2; face.position.y = -0.027;
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.02), truss); yoke.position.y = 0.12;
    pnl.add(fr, face, yoke); pnl.position.set(x, TRUSS - 0.2, z + 0.08); pnl.rotation.x = 0.5; lightG.add(pnl);
  }
  for (const [x, z] of [[-3.0, -1.5], [3.0, -1.5], [-3.0, 2.1], [3.0, 2.1]]) {
    const sp = new THREE.Group();
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 12), dev);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 16, Math.PI), truss); yoke.rotation.z = Math.PI;
    sp.add(can, yoke); sp.position.set(x, TRUSS - 0.16, z); sp.rotation.x = z < 0 ? 0.7 : -0.6; sp.rotation.z = x < 0 ? 0.35 : -0.35; lightG.add(sp);
  }
  reg('light', lightG);

  // 스피커 4채널 — 뒤쪽 두 개는 트러스, 앞쪽 두 개는 스탠드
  const spkG = new THREE.Group();
  const speaker = () => {
    const s = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.19), dev);
    const woof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), truss); woof.rotation.x = Math.PI / 2; woof.position.set(0, -0.035, 0.1);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), truss); tw.rotation.x = Math.PI / 2; tw.position.set(0, 0.075, 0.1);
    s.add(cab, woof, tw); return s;
  };
  for (const [x, z, yaw] of [[-3.05, -1.55, 0.6], [3.05, -1.55, -0.6]]) { const s = speaker(); s.position.set(x, TRUSS - 0.25, z); s.rotation.set(-0.35, yaw + Math.PI, 0, 'YXZ'); s.rotation.y = yaw; spkG.add(s); }
  for (const [x, z, yaw] of [[-3.2, 2.45, 2.6], [3.2, 2.45, -2.6]]) {
    const s = speaker(); s.position.set(x, 1.25, z); s.rotation.y = yaw; spkG.add(s);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 8), truss); pole.position.set(x, 0.56, z); spkG.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 3), truss); base.position.set(x, 0.01, z); spkG.add(base);
  }
  reg('speaker', spkG);

  // 키넥트 — 정면 천장에서 바닥을 비스듬히
  const kG = new THREE.Group();
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.066, 0.066), dev);
  const kf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), glass); kf.position.z = 0.034;
  const kc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), glass); kc.rotation.x = Math.PI / 2; kc.position.set(-0.06, 0, 0.04);
  const km = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), truss); km.position.y = 0.08;
  kG.add(kb, kf, kc, km); kG.position.set(0, TRUSS - 0.14, 3.3); kG.rotation.order = 'YXZ'; kG.rotation.y = Math.PI; kG.rotation.x = -0.62;
  reg('kinect', kG);
  {
    const k = V(0, TRUSS - 0.14, 3.3), cov = [V(-2.1, 0.01, -1.6), V(2.1, 0.01, -1.6), V(2.1, 0.01, 1.9), V(-2.1, 0.01, 1.9)];
    const pts = []; for (const c of cov) pts.push(k, c); cov.forEach((c, i) => pts.push(c, cov[(i + 1) % 4]));
    const fz = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.85 }));
    const area = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.5), new THREE.MeshBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.16, depthWrite: false }));
    area.rotation.x = -Math.PI / 2; area.position.set(0, 0.015, 0.15);
    fz.visible = area.visible = false; root.add(fz, area); groups.kinect.helpers.push(fz, area);
  }

  // 관객 (스케일 감)
  const visG = new THREE.Group();
  for (const [x, z, s] of [[-0.9, 0.3, 1], [1.15, -0.7, 0.93], [0.2, 1.3, 0.97]]) {
    const p = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 10), body); torso.position.y = 1.16; torso.scale.z = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), body); head.position.y = 1.64;
    p.add(torso, head);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.72, 4, 8), body); leg.position.set(sx * 0.085, 0.43, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.5, 4, 8), body); arm.position.set(sx * 0.215, 1.08, 0); arm.rotation.z = sx * 0.12;
      p.add(leg, arm);
    }
    p.rotation.y = hash01(x, z) * Math.PI * 2; p.position.set(x, 0, z); p.scale.setScalar(s); visG.add(p);
  }
  reg('visitor', visG);
  {
    const rings = new THREE.Group();
    for (const [x, z] of [[-0.9, 0.3], [1.15, -0.7], [0.2, 1.3]]) {
      const rg = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.36, 40), new THREE.MeshBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      rg.rotation.x = -Math.PI / 2; rg.position.set(x, 0.012, z); rings.add(rg);
    }
    rings.visible = false; root.add(rings); groups.visitor.helpers.push(rings);
  }

  // 운영 데스크 · PC · 모니터
  const pcG = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.7), wood); top.position.y = 0.74; pcG.add(top);
  for (const [lx, lz] of [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.72, 0.035), truss); lg.position.set(lx, 0.36, lz); pcG.add(lg); }
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.03), dev); mon.position.set(0.1, 1.08, -0.18); pcG.add(mon);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), glass); scr.position.set(0.1, 1.08, -0.164); pcG.add(scr);
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), truss); st.position.set(0.1, 0.83, -0.2); pcG.add(st);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.45), dev); tower.position.set(-0.45, 0.23, 0); pcG.add(tower);
  const kbd = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.14), dev); kbd.position.set(0.1, 0.77, 0.08); pcG.add(kbd);
  pcG.position.set(-2.55, 0, 4.25); pcG.rotation.y = 0.12;
  reg('pc', pcG);

  // 선반 (왼벽, 운영 공간)
  const shelf = new THREE.Group();
  const sbody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.9, 0.62), M({ color: '#f1f3f6' })); sbody.position.y = 0.95; shelf.add(sbody);
  for (let k = 1; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.22), dev); b.position.set(0.06, k * 0.38 - 0.05, (k % 2 ? 0.12 : -0.12)); shelf.add(b); }
  shelf.position.set(X0 + 0.18, 0, 2.75); shelf.traverse((o) => { if (o.isMesh) o.userData.id = null; }); root.add(shelf);

  // ===== 장비 SVG 선: 메쉬 모서리(EdgesGeometry)를 월드 좌표로 =====
  root.updateMatrixWorld(true);
  const DEV = { projector: [0.44, 0.5], light: [0.46, 0.52], speaker: [0.48, 0.53], kinect: [0.5, 0.54], pc: [0.47, 0.54], visitor: [0.51, 0.56] };
  const edgeLines = (obj, cls, a, b) => {
    obj.traverse((o) => {
      if (!o.isMesh || o.userData.noEdges) return;
      const eg = new THREE.EdgesGeometry(o.geometry, 25), p = eg.attributes.position;
      // 이어지는 선분을 한 경로로 묶어 path 수를 줄인다
      let cur = null; const out = [];
      for (let i = 0; i < p.count; i += 2) {
        const v1 = V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(o.matrixWorld), v2 = V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)).applyMatrix4(o.matrixWorld);
        if (cur && cur[cur.length - 1].distanceToSquared(v1) < 1e-8) cur.push(v2);
        else { cur = [v1, v2]; out.push(cur); }
      }
      out.forEach((pts, k) => L(pts, cls, a + (k / out.length) * (b - a) * 0.5, b));
    });
  };
  for (const id in DEV) for (const o of groups[id].objs) edgeLines(o, 'k-device', ...DEV[id]);
  edgeLines(shelf, 'k-wire', 0.47, 0.53);

  // 번호 표식
  const center = (id) => { const b = new THREE.Box3(); groups[id].objs.forEach((o) => b.expandByObject(o)); return b.getCenter(new THREE.Vector3()); };
  const anchors = {
    space: V(0.0, 2.6, ZB + 0.05), projector: PROJ[0].p.clone(), kinect: V(0, TRUSS - 0.14, 3.3), light: V(-1.1, TRUSS - 0.2, -1.42),
    speaker: V(-3.05, TRUSS - 0.25, -1.55), visitor: V(-0.9, 1.7, 0.3), pc: center('pc').add(V(0, 0.35, 0)),
  };
  INFO.forEach((it, i) => marks.push({ pos: anchors[it.id], no: it.no, id: it.id, a: 0.54 + i * 0.006 }));

  return { root, pick, groups, mats, lines, texts, marks, anchors, cycMesh };
}
