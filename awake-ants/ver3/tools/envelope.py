"""나레이션 음성의 음량 곡선(50Hz)을 data/env.json 으로 뽑는다 — '말하는 구체'가 이 곡선으로 움직인다.
python -I tools/envelope.py
소리를 끈 상태·헤드리스 촬영에서도 같은 움직임이 나오도록 실시간 분석 대신 미리 뽑아 둔다.
"""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE, HZ = 16000, 50
cues = json.loads((ROOT / "data/cues.json").read_text(encoding="utf-8"))["cues"]
out = {}
for c in cues:
    src = c.get("src")
    if not src or not (ROOT / src).exists():
        continue
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "quiet", "-i", str(ROOT / src), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = RATE // HZ
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    top = np.percentile(db, 98)
    v = np.clip((db - (top - 30)) / 30, 0, 1) ** 1.6   # 파일 최대 근처 → 1, 30dB 아래 → 0
    out[c["id"]] = [round(float(a), 2) for a in v]
    print(c["id"], n / HZ, "s")
(ROOT / "data/env.json").write_text(json.dumps({"hz": HZ, "env": out}, separators=(",", ":")), encoding="utf-8")
