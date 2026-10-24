// 호라이즌 스튜디오 — 하나의 3D 정의에서 (1) 블루프린트 SVG 선과 (2) three.js 모델을 같이 뽑는다.
// 같은 카메라로 투영하므로 도면 → 모델 전환 때 선이 정확히 겹친다.
//
// [08_drift_main] 06_index_v03/js/studio.js 사본 (원본: LIMEN_WEB_CLONES/limen_launch/studio.js = LIMEN_WEB ver2) —
// [LIMEN INDEX v01] LIMEN_WEB_CLONES/limen_launch/studio.js 이식 — 장비 설명(INFO)을 현재 기준(02 웹표현기준 3장)으로 고치고,
// 곡면 벽 · 바닥에 UV 를 붙여 장면 영상을 투사할 수 있게 했다. 재질 색은 밤 색으로. (08_drift_main: DRIFT 검정 바탕에 맞춰 남색 → 먹색)
//
// 실측: 정면 7.2×4m, 옆면 4×4m, 바닥 7.2×4m (2026-09-30 사용자 실측)
// 실측(2026-10-05): 무대 단차 0.2m, 철골 = 천장 − 0.4m(천장 4m 가정 → 3.6m), 프로젝터 4대 위치
// 키넥트(10-23 사용자 지시 + 배치안 이미지 '키넥트카메라 투사각.png'): 천장 1대 → 후방(관객 쪽) 좌·우 스탠드 2대, 높이 1.7m,
//   무대 안쪽으로 사선 교차 = 2중 감지. 벽에서 0.6m · 안쪽 35° 는 그 이미지 비율에서 잰 값(현장 확정 전)
// 프로젝터(10-23 사용자 지시): 본체는 수평(바닥용 P2 만 수직), 렌즈 시프트로 아래쪽으로 투사
// 추정: 모서리 곡률 반경, 철골 격자 간격(장비가 걸린 줄 외), 스피커 위치, 운영 공간 깊이 — 현장 사진 기준
import * as THREE from 'three';

export const DIM = {
  X0: -3.6, X1: 3.6,      // 정면 폭 7.2
  ZB: -2, ZF: 2,          // 투사 바닥 깊이 4 (뒤벽 z=-2)
  ZR: 5.2,                // 방 앞쪽 끝 (운영 공간 포함, 추정)
  H: 4,                   // 벽 높이 4
  R: 0.45,                // 바닥-벽 곡면 반경 (추정)
  RC: 0.6,                // 벽-벽 세로 모서리 곡면 반경 (추정)
  TRUSS: 3.6,             // 철골 높이 = 천장 − 0.4 (천장은 벽 높이 4m 로 가정)
  CEIL: 4,                // 천장 (가정)
  STEP: 0.2,              // 무대 단차 (실측)
};
const { X0, X1, ZB, ZF, ZR, H, R, RC, TRUSS, CEIL, STEP } = DIM;

/* ---------- 장비 설명 (호버 패널) ---------- */
export const INFO = [
  { id: 'projector', no: '01', title: '프로젝터', lines: ['4대 — 정면 · 바닥 · 좌벽 · 우벽', '천장 철골(약 3.6m)에 설치', '한 대가 한 면씩 맡아 투사한다'] },
  { id: 'space',     no: '02', title: '4면 투사 공간', lines: ['정면 7.2×4m · 옆면 4×4m · 바닥 7.2×4m', '네 면의 영상을 워핑·블렌딩해 한 장면으로 잇는다(계획)', '모서리가 곡면으로 이어지는 스튜디오'] },
  { id: 'kinect',    no: '03', title: '움직임 인식 카메라', lines: ['Kinect v2 2대 — 후방 좌 · 우 스탠드, 높이 1.7m', '무대 안쪽으로 사선 촬영, 두 대가 겹치는 가운데에서 감지', '설치 높이 · 각도는 현장 테스트로 확정'] },
  { id: 'speaker',   no: '04', title: '스피커', lines: ['4대 · 벽 위 네 모서리', '방 전체를 감싸는 4채널 사운드'] },
  { id: 'visitor',   no: '05', title: '관객', lines: ['움직이면 반딧불이가 더 밝게 반응하고', '움직이는 방향으로 화면 속 사람들도 함께 움직인다', '관객과 공간은 서로 영향을 주고받는다'] },
  { id: 'pc',        no: '06', title: '운영 데스크', lines: ['메인 PC · 송출 PC(노트북) 2대', '오른쪽 센서 정보를 메인 PC 로 보내 함께 처리 · 보정', '영상 장면은 사전 제작, 개미 · 반딧불이 · 사람·군중은 Unity 실시간'],
    // 포커스 때 두 대에 각각 붙는 카드 (10-23 사용자 설명: 왼쪽 키넥트 = 메인 PC, 오른쪽 키넥트 = 송출 PC → 메인 PC 로 보냄)
    subs: [
      { no: '06-01', title: '메인 PC', lines: ['왼쪽 키넥트 연결', '두 센서 정보를 함께 처리 · 보정'] },
      { no: '06-02', title: '송출 PC · 노트북', lines: ['오른쪽 키넥트 연결', '센서 정보를 메인 PC 로 송출'] },
    ] },
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
  L([V(X0, 0, ZF), V(X0, -STEP, ZF), V(X1, -STEP, ZF), V(X1, 0, ZF)], 'k-struct', S0 + 0.09, S0 + 0.13);   // 무대 단차
  L(line(V(X0, -STEP, ZF), V(X0, -STEP, ZR)), 'k-struct', S0 + 0.1, S0 + 0.14);
  L(line(V(X1, -STEP, ZF), V(X1, -STEP, ZR)), 'k-struct', S0 + 0.1, S0 + 0.14);
  L(line(V(X0, -STEP, ZR), V(X1, -STEP, ZR)), 'k-struct', S0 + 0.12, S0 + 0.15);
  L(line(V(X0, H, ZF), V(X0, H, ZR)), 'k-struct', S0 + 0.11, S0 + 0.15);
  L(line(V(X1, H, ZF), V(X1, H, ZR)), 'k-struct', S0 + 0.11, S0 + 0.15);
  L(line(V(X0, -STEP, ZR), V(X0, H, ZR)), 'k-struct', S0 + 0.13, S0 + 0.16);
  L(line(V(X1, -STEP, ZR), V(X1, H, ZR)), 'k-struct', S0 + 0.13, S0 + 0.16);
  // 문 (오른벽 앞쪽)
  L([V(X1, -STEP, 3.7), V(X1, 1.9, 3.7), V(X1, 1.9, 4.6), V(X1, -STEP, 4.6)], 'k-struct', S0 + 0.14, S0 + 0.17);
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
  texts.push({ pos: V(-1.6, -STEP, ZF + 1.6), text: '운영 공간', a: D0 + 0.08 });
  dim(V(X1, -STEP, ZF), V(X1, 0, ZF), V(0.6, 0, 0), '단차 200');
  // 장비 줄(앞에서 2m) 바닥 치수 · 무대 밖 P1·P2
  [[X0, -1.5, '2,100'], [-1.5, 0, '1,500'], [0, 1.5, '1,500'], [1.5, X1, '2,100']].forEach(([a, b, t]) => dim(V(a, 0, 0), V(b, 0, 0), V(0, 0.001, 0), t, V((a + b) / 2, 0, -0.3)));
  dim(V(X0 + 0.5, 0, ZF), V(X0 + 0.5, 0, 0), V(0, 0.001, 0), '2,000', V(X0 + 0.95, 0, 1));
  dim(V(0.5, -STEP, ZF), V(0.5, -STEP, ZF + 0.2), V(0, 0.001, 0), '200', V(0.85, -STEP, ZF + 0.1));
  dim(V(0.5, -STEP, ZF + 0.2), V(0.5, -STEP, ZF + 1.5), V(0, 0.001, 0), '1,300', V(0.95, -STEP, ZF + 0.85));
  // 높이 표기와 단면 표시
  for (const [y, t] of [[H, 'EL +4,000 CEIL*'], [TRUSS, 'EL +3,600 철골 (천장 −400)'], [0, 'EL ±0 STAGE'], [-STEP, 'EL −200 ROOM']]) {
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
  const room = { white: M({ color: '#1b1d24', side: THREE.FrontSide }), floor: M({ color: '#15171d' }), ops: M({ color: '#0b0c10' }), wall: M({ color: '#111318', side: THREE.FrontSide }) };
  const dev = M({ color: '#454a56', roughness: 0.5, metalness: 0.35 });
  const truss = M({ color: '#30343d', roughness: 0.6, metalness: 0.4 });
  const trussGrid = M({ color: '#30343d', roughness: 0.6, metalness: 0.4 });   // 천장 철골만 — 포커스 동안 반투명 (space.js)
  const glass = M({ color: '#9fd7ff', emissive: '#203a66', roughness: 0.2, metalness: 0.4 });
  const wood = M({ color: '#2c2f37', roughness: 0.8 });

  const reg = (id, obj, edges = true) => {
    (groups[id] ||= { objs: [], helpers: [], id }).objs.push(obj);
    obj.traverse((o) => { if (o.isMesh) { o.userData.id = id; pick.push(o); } });
    obj.userData.edges = edges;
    root.add(obj);
    return obj;
  };

  // 곡면 벽 메쉬
  const cg = new THREE.BufferGeometry(), NSu = 220, NTv = 70, pos = [], idx = [];
  const uvs = [];
  for (let i = 0; i <= NSu; i++) for (let j = 0; j <= NTv; j++) { const p = cyc(ULEN * i / NSu, j / NTv); pos.push(p.x, p.y, p.z); uvs.push(i / NSu, j / NTv); }
  for (let i = 0; i < NSu; i++) for (let j = 0; j < NTv; j++) { const a = i * (NTv + 1) + j, b = a + NTv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); cg.setIndex(idx); cg.computeVertexNormals();
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
  const opsFloor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, ZR - ZF), room.ops); opsFloor.rotation.x = -Math.PI / 2; opsFloor.position.set(0, -STEP - 0.002, (ZF + ZR) / 2);
  const stepFace = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, STEP), room.wall); stepFace.position.set(0, -STEP / 2, ZF + 0.001);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(ZR - ZF, H + STEP), room.wall); wl.rotation.y = Math.PI / 2; wl.position.set(X0, (H - STEP) / 2, (ZF + ZR) / 2);
  const wr = wl.clone(); wr.position.x = X1; wr.rotation.y = -Math.PI / 2;
  ops.add(opsFloor, stepFace, wl, wr); ops.traverse((o) => (o.userData.noEdges = true)); root.add(ops);

  // 천장 트러스
  const tr = new THREE.Group();
  const bar = (a, b, r = 0.035) => { const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(r, r, len), trussGrid); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); return m; };
  // 장비가 걸린 줄(앞에서 2m 가로줄, 가운데 세로줄, x=±1.5)은 실측, 나머지 간격은 사진 기준
  const TZ = [-1.4, 0, 1.4, 2.8], TX = [-2.7, -1.5, 0, 1.5, 2.7], tz1 = (x) => (x === 0 ? 3.8 : 3.0);
  for (const z of TZ) tr.add(bar(V(-3.05, TRUSS, z), V(3.05, TRUSS, z)));
  for (const x of TX) tr.add(bar(V(x, TRUSS + 0.04, -1.65), V(x, TRUSS + 0.04, tz1(x))));
  for (const z of [TZ[0], TZ[2]]) for (const x of [-2.7, 0, 2.7]) tr.add(bar(V(x, TRUSS, z), V(x, CEIL, z), 0.025));
  root.add(tr);
  const D1 = 0.40;
  for (const z of TZ) L(line(V(-3.05, TRUSS, z), V(3.05, TRUSS, z)), 'k-device', D1 + (z + 1.5) * 0.006, D1 + 0.04 + (z + 1.5) * 0.006);
  for (const x of TX) L(line(V(x, TRUSS + 0.04, -1.65), V(x, TRUSS + 0.04, tz1(x))), 'k-device', D1 + 0.01, D1 + 0.05);

  // 프로젝터 4대 — 정면벽·바닥·좌벽·우벽
  const projHelp = [];
  const PROJ = [
    { p: V(0, 3.42, ZF + 1.5), yaw: Math.PI, pitch: 0, name: 'P1 · 정면 벽',   // P1 정면 벽 · 무대 밖 1.5m · 본체 수평
      target: [V(X0, 0, ZB), V(X1, 0, ZB), V(X1, H, ZB), V(X0, H, ZB)] },
    { p: V(0, 3.42, ZF + 0.2), yaw: Math.PI, pitch: Math.PI / 2, name: 'P2 · 바닥',    // P2 바닥 (YXZ 에서 +x 회전 = 렌즈가 아래) · 무대 밖 0.2m · 본체 수직(렌즈가 바닥을 향함)
      target: [V(X0 + R, 0, ZB + R), V(X1 - R, 0, ZB + R), V(X1 - R, 0, ZF), V(X0 + R, 0, ZF)] },
    { p: V(1.5, 3.42, 0), yaw: -Math.PI / 2, pitch: 0, name: 'P3 · 좌벽',   // P3 좌벽 · 오른쪽 벽에서 2.1m · 본체 수평
      target: [V(X0, 0, ZB), V(X0, 0, ZF), V(X0, H, ZF), V(X0, H, ZB)] },
    { p: V(-1.5, 3.42, 0), yaw: Math.PI / 2, pitch: 0, name: 'P4 · 우벽',   // P4 우벽 · 왼쪽 벽에서 2.1m · 본체 수평
      target: [V(X1, 0, ZB), V(X1, 0, ZF), V(X1, H, ZF), V(X1, H, ZB)] },
  ];
  PROJ.forEach((d, i) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.45), dev);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 14), glass); lens.rotation.x = Math.PI / 2; lens.position.set(0.1, -0.035, 0.27);   // 렌즈를 본체 아래쪽에 — 투사는 렌즈 시프트로 아래로
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), truss); mount.position.y = 0.17;
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.2), truss); vent.position.set(-0.05, 0.095, -0.05);
    g.add(box, lens, vent);
    g.position.copy(d.p); g.rotation.order = 'YXZ'; g.rotation.y = d.yaw; g.rotation.x = d.pitch;
    const m2 = mount.clone(); m2.position.copy(d.p).add(V(0, 0.12, 0)); root.add(m2);
    reg('projector', g);
    // 포커스 때 보이는 투사 범위 — 렌즈에서 네 모서리로 가는 선 + 비춰지는 면. 한 대씩 차례로 진하게 켠다 (space.js)
    g.updateMatrixWorld(true);
    const lensW = lens.getWorldPosition(new THREE.Vector3());
    const fr = []; for (const t of d.target) fr.push(lensW, t);
    fr.push(...d.target.flatMap((t, k) => [t, d.target[(k + 1) % 4]]));
    const frustum = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fr), new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.85, depthWrite: false }));
    const [q0, q1, q2, q3] = d.target, fg2 = new THREE.BufferGeometry().setFromPoints([q0, q1, q2, q0, q2, q3]);
    const face = new THREE.Mesh(fg2, new THREE.MeshBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    frustum.visible = face.visible = false; root.add(frustum, face);
    groups.projector.helpers.push(frustum, face);
    const center = d.target.reduce((c, q) => c.add(q), V(0, 0, 0)).multiplyScalar(1 / d.target.length);   // 맡은 면 가운데 (신호 그래픽 끝점)
    projHelp.push({ frustum, face, name: d.name, lensW: lensW.clone(), center });
  });

  // 스피커 4채널 — 벽 위쪽 모서리 4곳 (현장 사진 기준)
  const spkG = new THREE.Group();
  const speaker = () => {
    const s = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.19), dev);
    const woof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), truss); woof.rotation.x = Math.PI / 2; woof.position.set(0, -0.035, 0.1);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), truss); tw.rotation.x = Math.PI / 2; tw.position.set(0, 0.075, 0.1);
    s.add(cab, woof, tw); return s;
  };
  for (const [x, z, yaw] of [[-3.3, -1.6, 0.7], [3.3, -1.6, -0.7], [-3.42, 1.85, 2.4], [3.42, 1.85, -2.4]]) { const s = speaker(); s.position.set(x, H - 0.28, z); s.rotation.order = 'YXZ'; s.rotation.y = yaw; s.rotation.x = 0.35; spkG.add(s); }   // 앞면(+z)이 살짝 아래 — 관객 귀 높이 쪽
  reg('speaker', spkG);

  // 키넥트 2대 — 후방(관객 쪽, z = ZF) 좌·우 스탠드, 높이 1.7m, 아래로 17° · 안쪽으로 35° 돌려 무대를 사선으로 교차 촬영.
  // 시야 70.6° × 60°, 감지 0.5~4.5m → 한쪽 시선은 같은 쪽 벽을 따라 정면 벽까지, 다른 쪽은 바닥 가운데를 가로지른다
  const KH = 1.7, KIN_IN = 0.6, KYAW = THREE.MathUtils.degToRad(35), KPITCH = 0.3, KFOV = THREE.MathUtils.degToRad(70.6), KNEAR = 0.5, KFAR = 4.5;
  const KIN = [{ x: X0 + KIN_IN, yaw: Math.PI - KYAW }, { x: X1 - KIN_IN, yaw: Math.PI + KYAW }];
  const kG = new THREE.Group();
  const kinectPos = [];
  KIN.forEach(({ x, yaw }) => {
    const k = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.066, 0.066), dev);
    const kf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), glass); kf.position.z = 0.034;
    const kc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), glass); kc.rotation.x = Math.PI / 2; kc.position.set(-0.06, 0, 0.04);
    k.add(kb, kf, kc);
    k.position.set(x, KH, ZF); k.rotation.order = 'YXZ'; k.rotation.y = yaw; k.rotation.x = KPITCH;
    kG.add(k); kinectPos.push(V(x, KH, ZF));
    // 스탠드: 기둥 + 삼각 다리 (무대 끝 바로 뒤 운영 바닥에 선다)
    const sz = ZF + 0.12, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, KH + STEP - 0.05, 8), truss);
    pole.position.set(x, (KH - STEP - 0.05) / 2, sz); kG.add(pole);
    for (let j = 0; j < 3; j++) {
      const a = j / 3 * Math.PI * 2 + 0.4, foot = V(x + Math.cos(a) * 0.32, -STEP, sz + Math.sin(a) * 0.32), top = V(x, 0.45, sz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, foot.distanceTo(top), 6), truss);
      leg.position.copy(foot).lerp(top, 0.5); leg.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(foot).normalize()); kG.add(leg);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.14), truss); head.position.set(x, KH - 0.06, (ZF + sz) / 2); kG.add(head);
  });
  reg('kinect', kG);
  {
    // 감지 범위: 센서별 바닥 부채꼴(0.5~4.5m, 수평 시야 70.6°)을 투사 바닥 사각형으로 잘라 그린다. 두 대가 겹치는 가운데가 진해진다
    // 곡면 벽 발치(R) 안쪽 평평한 바닥까지만 — 벽선(X0 · X1 · ZB)까지 그리면 부채꼴 판이 곡면 벽을 뚫고 지나가 면이 깨져 보인다
    const RX0 = X0 + R, RX1 = X1 - R, RZ0 = ZB + R, RZ1 = ZF;
    // Sutherland–Hodgman: 바닥 사각형 네 변으로 차례로 자른다
    const clipRect = (poly) => {
      const edges = [[(p) => p.x >= RX0, (a, b) => (RX0 - a.x) / (b.x - a.x)], [(p) => p.x <= RX1, (a, b) => (RX1 - a.x) / (b.x - a.x)],
        [(p) => p.z >= RZ0, (a, b) => (RZ0 - a.z) / (b.z - a.z)], [(p) => p.z <= RZ1, (a, b) => (RZ1 - a.z) / (b.z - a.z)]];
      let out = poly;
      for (const [inside, t] of edges) {
        const src = out; out = [];
        src.forEach((cur, i) => {
          const prev = src[(i + src.length - 1) % src.length];
          if (inside(cur)) { if (!inside(prev)) out.push(prev.clone().lerp(cur, t(prev, cur))); out.push(cur); }
          else if (inside(prev)) out.push(prev.clone().lerp(cur, t(prev, cur)));
        });
      }
      return out.map((p) => V(p.x, 0.015, p.z));
    };
    const sector = ({ x, yaw }) => {
      const pts = [], N = 40, base = V(x, 0, ZF - 0.001);
      for (let i = 0; i <= N; i++) { const a = yaw - KFOV / 2 + KFOV * i / N; pts.push(base.clone().add(V(Math.sin(a) * KFAR, 0, Math.cos(a) * KFAR))); }
      for (let i = N; i >= 0; i--) { const a = yaw - KFOV / 2 + KFOV * i / N; pts.push(base.clone().add(V(Math.sin(a) * KNEAR, 0, Math.cos(a) * KNEAR))); }
      return clipRect(pts);
    };
    KIN.forEach((s, i) => {
      const poly = sector(s), c = kinectPos[i];
      const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, p.z)));
      const g = new THREE.ShapeGeometry(shape); g.rotateX(Math.PI / 2); g.translate(0, i * 0.002, 0);
      const area = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints([...poly, poly[0]]), new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.8 }));
      // 센서에서 시야 양 끝으로 뻗는 선 (바닥에 닿는 곳까지)
      const edgeAt = (a) => { const d = V(Math.sin(a), 0, Math.cos(a)); let t = KFAR; if (d.z < 0) t = Math.min(t, (RZ0 - ZF) / d.z); if (d.x < 0) t = Math.min(t, (RX0 - s.x) / d.x); if (d.x > 0) t = Math.min(t, (RX1 - s.x) / d.x); return V(s.x + d.x * t, 0.015, ZF + d.z * t); };
      const rays = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([c, edgeAt(s.yaw - KFOV / 2), c, edgeAt(s.yaw + KFOV / 2)]), new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 0.55 }));
      area.visible = outline.visible = rays.visible = false; root.add(area, outline, rays); groups.kinect.helpers.push(area, outline, rays);
      L([...poly, poly[0]], 'k-construct', 0.5 + i * 0.01, 0.56 + i * 0.01);       // 도면에도 감지 부채꼴
    });
  }

  // 관객 — 3D 메시 없이 위치만. 사람은 space.js 가 화면에 SVG 실루엣으로 그린다(카메라를 늘 향하는 깔끔한 윤곽)
  const VISITORS = [{ x: -0.9, z: 0.3, s: 1, pose: 0 }, { x: 1.15, z: -0.7, s: 0.93, pose: 1 }, { x: 0.2, z: 1.3, s: 0.97, pose: 2 }];
  const visG = new THREE.Group();
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
  pcG.position.set(-2.55, -STEP, 4.25); pcG.rotation.y = 0.12;
  reg('pc', pcG);

  // 송출 PC — 오른쪽 키넥트 스탠드 뒤 작은 사이드 테이블 위 노트북 (위치는 도면용 가안)
  const subG = new THREE.Group();
  const stop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.45), wood); stop.position.y = 0.66; subG.add(stop);
  for (const [lx, lz] of [[-0.27, -0.19], [0.27, -0.19], [-0.27, 0.19], [0.27, 0.19]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.65, 0.025), truss); lg.position.set(lx, 0.325, lz); subG.add(lg); }
  const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.24), dev); lapBase.position.set(0, 0.685, 0.03); subG.add(lapBase);
  const lapLid = new THREE.Group(); lapLid.position.set(0, 0.694, -0.09); lapLid.rotation.x = -0.32;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.012), dev); lid.position.y = 0.11;
  const lscr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), glass); lscr.position.set(0, 0.11, 0.007);
  lapLid.add(lid, lscr); subG.add(lapLid);
  subG.position.set(X1 - 0.95, -STEP, ZF + 0.85); subG.rotation.y = 0.5;
  reg('pc', subG);

  // 선반 (왼벽, 운영 공간)
  const shelf = new THREE.Group();
  const sbody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.9, 0.62), M({ color: '#1c1e25' })); sbody.position.y = 0.95; shelf.add(sbody);
  for (let k = 1; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.22), dev); b.position.set(0.06, k * 0.38 - 0.05, (k % 2 ? 0.12 : -0.12)); shelf.add(b); }
  shelf.position.set(X0 + 0.18, -STEP, 2.75); shelf.traverse((o) => { if (o.isMesh) o.userData.id = null; }); root.add(shelf);

  // ===== 장비 SVG 선: 메쉬 모서리(EdgesGeometry)를 월드 좌표로 =====
  root.updateMatrixWorld(true);
  const DEV = { projector: [0.44, 0.5], speaker: [0.48, 0.53], kinect: [0.5, 0.54], pc: [0.47, 0.54], visitor: [0.51, 0.56] };
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
  const anchors = {
    // 배열 = 같은 장비 여러 대. 첫 번째로 설명 칩이 이어지고 나머지엔 점만 찍힌다
    space: [V(0.0, 2.6, ZB + 0.05)], projector: PROJ.map((d) => d.p.clone()), kinect: kinectPos.map((p) => p.clone()),
    speaker: [V(-3.3, H - 0.28, -1.6), V(3.3, H - 0.28, -1.6), V(-3.42, H - 0.28, 1.85), V(3.42, H - 0.28, 1.85)],
    visitor: [V(-0.9, 1.7, 0.3), V(1.15, 1.6, -0.7), V(0.2, 1.65, 1.3)], pc: [pcG.getWorldPosition(new THREE.Vector3()).add(V(0.1, 1.2, -0.1)), subG.getWorldPosition(new THREE.Vector3()).add(V(0, 0.95, 0))],
  };
  INFO.forEach((it, i) => marks.push({ pos: anchors[it.id][0], no: it.no, id: it.id, a: 0.54 + i * 0.006 }));

  // 06 데이터 흐름: 왼쪽 키넥트 → 메인 PC, 오른쪽 키넥트 → 송출 PC → (포물선) → 메인 PC
  const links = { kL: kinectPos[0].clone(), kR: kinectPos[1].clone(), main: anchors.pc[0].clone(), sub: anchors.pc[1].clone() };
  return { root, pick, groups, mats, lines, texts, marks, anchors, cycMesh, floor, projHelp, links, trussGrid, visitors: VISITORS };
}
