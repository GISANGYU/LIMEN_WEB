// 베지어 키프레임 재생기 — Theatre.js 대신.
// 키프레임 형식은 Theatre state.json 과 같다: { t, v, h:[lx,ly,rx,ry], type, conn }.
// 구간 a→b 의 곡선은 cubic-bezier(a.h[2], a.h[3], b.h[0], b.h[1]).

const EASE = [0.5, 1, 0.5, 0];

function bezier(x1, y1, x2, y2) {
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const sx = (t) => ((ax * t + bx) * t + cx) * t;
	const sy = (t) => ((ay * t + by) * t + cy) * t;
	const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
	return (x) => {
		let t = x;
		for (let i = 0; i < 6; i++) {
			const e = sx(t) - x, d = dx(t);
			if (Math.abs(e) < 1e-5) break;
			if (Math.abs(d) < 1e-6) break;
			t -= e / d;
		}
		if (t < 0 || t > 1) { // 뉴턴이 빗나가면 이분법
			let lo = 0, hi = 1; t = x;
			for (let i = 0; i < 20; i++) { sx(t) < x ? (lo = t) : (hi = t); t = (lo + hi) / 2; }
		}
		return sy(t);
	};
}

const isColor = (v) => v && typeof v === 'object' && 'r' in v;
const lerp = (a, b, u) => a + (b - a) * u;

function evalTrack(kf, t) {
	if (t <= kf[0].t) return kf[0].v;
	const last = kf[kf.length - 1];
	if (t >= last.t) return last.v;
	let i = 0;
	while (i < kf.length - 2 && t >= kf[i + 1].t) i++;
	const a = kf[i], b = kf[i + 1];
	const numeric = typeof a.v === 'number' || isColor(a.v);
	if (!numeric || a.conn === false || a.type === 'hold') return a.v;
	if (!a._ease) a._ease = bezier(a.h[2], a.h[3], b.h[0], b.h[1]);
	const u = a._ease((t - a.t) / (b.t - a.t));
	if (isColor(a.v)) return { r: lerp(a.v.r, b.v.r, u), g: lerp(a.v.g, b.v.g, u), b: lerp(a.v.b, b.v.b, u) };
	return lerp(a.v, b.v, u);
}

export class Timeline {
	constructor() {
		this.tracks = new Map();
		this.statics = new Map();
	}

	static key(obj, path) { return obj + '|' + path.join('.'); }

	// scale < 1 이면 원본보다 빨리 재생 (0.75 = 1.33배 빠르게)
	load(json, offset = 0, until = Infinity, scale = 1) {
		for (const tr of json.tracks) {
			const kf = tr.kf.filter((k) => k.t <= until + 1e-3).map((k) => ({ ...k, t: k.t * scale + offset }));
			if (kf.length) this.tracks.set(Timeline.key(tr.obj, tr.path), kf);
		}
		for (const s of json.static) this.statics.set(Timeline.key(s.obj, s.path), s.v);
	}

	// 우리 구간(C·D)의 키프레임. 같은 키가 이미 있으면 뒤에 이어 붙인다.
	add(obj, path, frames) {
		const k = Timeline.key(obj, path);
		const kf = frames.map(([t, v, h]) => ({ t, v, h: h || EASE, type: 'bezier', conn: true }));
		const prev = this.tracks.get(k);
		this.tracks.set(k, prev ? [...prev, ...kf].sort((a, b) => a.t - b.t) : kf);
	}

	get(obj, path, t, fallback) {
		const k = Timeline.key(obj, path);
		const kf = this.tracks.get(k);
		if (kf) return evalTrack(kf, t);
		if (this.statics.has(k)) return this.statics.get(k);
		return fallback;
	}
}
