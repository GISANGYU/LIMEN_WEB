// 잔잔한 탐험 음악 — 파일 없이 브라우저에서 만든다.
// 낮은 지속음 + 8초마다 바뀌는 화음 패드(D 도리안) + 드문드문 울리는 펜타토닉 벨 + 긴 잔향.
// 나레이션이 나올 때는 duck() 으로 살짝 낮춘다.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [
	[50, 57, 62, 65, 69, 76],   // Dm9
	[46, 53, 58, 62, 65, 69],   // Bbmaj7
	[41, 48, 53, 57, 60, 67],   // Fmaj9
	[48, 55, 60, 64, 67, 74],   // Cadd9
];
const BELL = [62, 65, 67, 69, 72, 74, 77, 79, 81];   // D 펜타토닉 계열
const VOL = 1.5;                                      // 전체 음량 (1차 0.55 → 작다는 피드백으로 키움)

export class Music {
	constructor() {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		this.ctx = ctx;
		// 음량을 키워도 찢어지지 않게 마지막에 컴프레서
		const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.connect(ctx.destination);
		this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(comp);
		this.duckGain = ctx.createGain(); this.duckGain.gain.value = 1; this.duckGain.connect(this.master);
		// 잔향: 지수 감쇠 잡음 임펄스
		this.verb = ctx.createConvolver();
		const len = ctx.sampleRate * 5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
		for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
		this.verb.buffer = ir;
		const wet = ctx.createGain(); wet.gain.value = 0.55; this.verb.connect(wet).connect(this.duckGain);
		this.dry = ctx.createGain(); this.dry.gain.value = 0.6; this.dry.connect(this.duckGain);
		this.dry.connect(this.verb);
		// 패드 필터가 천천히 열렸다 닫힌다
		this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 700; this.padFilter.Q.value = 0.5;
		const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04;
		const lg = ctx.createGain(); lg.gain.value = 380; lfo.connect(lg).connect(this.padFilter.frequency); lfo.start();
		this.padBus = ctx.createGain(); this.padBus.gain.value = 0.22; this.padFilter.connect(this.padBus).connect(this.dry);
		// 낮은 지속음 D1 + A1
		for (const [n, g] of [[26, 0.22], [33, 0.12]]) {
			const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midi(n);
			const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg).connect(this.dry); o.start();
		}
		this.chordIx = 0; this.nextChord = 0; this.nextBell = 0; this.voices = [];
		this.timer = setInterval(() => this.tick(), 120);
	}

	start() {
		this.ctx.resume();
		const t = this.ctx.currentTime;
		this.master.gain.cancelScheduledValues(t);
		this.master.gain.setValueAtTime(this.master.gain.value, t);
		this.master.gain.linearRampToValueAtTime(VOL, t + 4);
	}

	setMuted(m) { this.master.gain.setTargetAtTime(m ? 0 : VOL, this.ctx.currentTime, 0.4); }

	duck(on) { this.duckGain.gain.setTargetAtTime(on ? 0.7 : 1, this.ctx.currentTime, on ? 0.25 : 1.2); }

	chord(t) {
		for (const v of this.voices) { v.g.gain.setTargetAtTime(0, t, 1.6); v.o.forEach((o) => o.stop(t + 8)); }
		this.voices = [];
		for (const n of CHORDS[this.chordIx % CHORDS.length]) {
			const g = this.ctx.createGain(); g.gain.value = 0;
			g.gain.setTargetAtTime(0.11, t, 2.2);
			const o = [-6, 6].map((det) => {
				const x = this.ctx.createOscillator(); x.type = 'sawtooth'; x.frequency.value = midi(n); x.detune.value = det;
				x.connect(g); x.start(t); return x;
			});
			g.connect(this.padFilter);
			this.voices.push({ g, o });
		}
		this.chordIx++;
	}

	bell(t) {
		const n = BELL[Math.floor(Math.random() * BELL.length)] + (Math.random() < 0.25 ? 12 : 0);
		const g = this.ctx.createGain(); g.gain.value = 0;
		g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
		const pan = this.ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.4 - 0.7;
		for (const [mul, type, amp] of [[1, 'sine', 1], [2.01, 'sine', 0.25], [3.0, 'triangle', 0.08]]) {
			const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = midi(n) * mul;
			const a = this.ctx.createGain(); a.gain.value = amp; o.connect(a).connect(g); o.start(t); o.stop(t + 3.6);
		}
		g.connect(pan).connect(this.dry);
	}

	tick() {
		const t = this.ctx.currentTime;
		if (t >= this.nextChord) { this.chord(t + 0.05); this.nextChord = t + 8; }
		if (t >= this.nextBell) { this.bell(t + 0.05); this.nextBell = t + 0.7 + Math.random() * 1.9; }
	}
}
