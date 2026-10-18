// 나레이션 큐: 큐 하나가 소리와 자막을 같이 띄운다 (레퍼런스 'playAudio' 이벤트와 같은 구조).
// 자막은 흐림 → 선명 3.5초, 음성이 끝나면 흐려지며 퇴장. 커서가 가까운 낱말은 다시 흐려진다.

const REVEAL = 3.5, HIDE = 2.2;
const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);
const MAX_BLUR = 5;

export class Narration {
	constructor(root, data, { onSpeak } = {}) {
		this.root = root;
		this.cues = data.cues.slice().sort((a, b) => a.t - b.t);
		this.items = new Map();
		this.prevT = -1;
		this.muted = false;
		this.onSpeak = onSpeak || (() => {});
		this.mouse = { x: -9999, y: -9999 };
		this.audios = new Map();
		for (const c of this.cues) {
			const el = document.createElement('div');
			el.className = 'subtitle';
			el.innerHTML = c.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
			root.appendChild(el);
			this.items.set(c.id, { el, words: [...el.querySelectorAll('.w')], p: 0, dir: 0, start: 0 });
			if (c.src) { const a = new Audio(c.src); a.preload = 'auto'; this.audios.set(c.id, a); }
		}
		addEventListener('pointermove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
	}

	speak(c, offset = 0) {
		const a = this.audios.get(c.id);
		if (!a || this.muted) return;
		this.stopVoice();
		a.currentTime = offset; a.volume = 1;
		a.play().catch(() => {});
		this.current = a;
		this.onSpeak(true);
		a.onended = () => { if (this.current === a) { this.current = null; this.onSpeak(false); } };
	}

	stopVoice() {
		if (this.current) { this.current.pause(); this.current = null; this.onSpeak(false); }
	}

	show(id, now, instant = false) {
		for (const [k, it] of this.items) {
			if (k === id) { it.dir = 1; it.start = now; if (instant) it.p = 1; }
			else if (it.p > 0) this.hide(it, now);
		}
	}

	hide(it, now) { if (it.dir !== -1) { it.dir = -1; it.start = now; it.from = it.p; } }

	// 화면 이동(?t=, 건너뛰기) 뒤: 그 시점에 나오고 있어야 할 큐만 그 자리부터 이어서
	seek(t, now) {
		this.stopVoice();
		for (const it of this.items.values()) { it.p = 0; it.dir = 0; }
		const c = this.cues.find((q) => t >= q.t && t < q.t + q.dur);
		if (c) { this.show(c.id, now, true); this.speak(c, t - c.t); }
		this.prevT = t;
	}

	update(t, now) {
		if (t < this.prevT) this.prevT = t;
		for (const c of this.cues) {
			if (c.t > this.prevT && c.t <= t) { this.show(c.id, now); this.speak(c); }
			const end = c.t + Math.max(c.dur, 6) + 0.6;   // 음성은 영어, 자막은 한국어 — 읽을 시간을 최소 6초 남긴다
			if (end > this.prevT && end <= t) this.hide(this.items.get(c.id), now);
		}
		this.prevT = t;

		for (const it of this.items.values()) {
			if (it.dir === 1) it.p = Math.max(it.p, easeOut((now - it.start) / REVEAL));
			else if (it.dir === -1) {
				it.p = it.from * (1 - easeOut((now - it.start) / HIDE));
				if (it.p <= 0.001) { it.p = 0; it.dir = 0; }
			}
			const on = it.p > 0.001;
			it.el.style.visibility = on ? 'visible' : 'hidden';
			if (!on) continue;
			const base = MAX_BLUR * (1 - it.p);
			for (const w of it.words) {
				const r = w.getBoundingClientRect();
				const dx = (r.left + r.width / 2 - this.mouse.x) / innerHeight, dy = (r.top + r.height / 2 - this.mouse.y) / innerHeight;
				const near = 1 - Math.min(1, Math.hypot(dx, dy) / 0.5);
				const blur = base + near * near * (3 - 2 * near) * 4;
				const op = Math.min(1, Math.max(0, MAX_BLUR - blur));
				w.style.filter = blur > 0.05 ? `blur(${(blur * 1.6).toFixed(2)}px)` : 'none';
				w.style.opacity = op.toFixed(3);
				w.style.setProperty('--accent-mix', Math.min(1, blur / 4).toFixed(3));
			}
		}
	}
}
