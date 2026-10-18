"""Symphony of Vines Theatre.js state.json -> data/sov_ch2_1.json

레퍼런스 2챕터 2-1 시트의 키프레임(베지어 핸들 포함)과 정적 값을 우리 재생기 형식으로 옮긴다.
사용: python -I tools/extract_theatre.py <state.json 경로> data/sov_ch2_1.json
"""
import json, sys

SHEET = "Chapter two-one"
OBJECTS = ["Cameras / Camera 1", "Cameras / Camera 2", "Cameras / Settings",
           "Contour Lines", "Audio", "Global Settings"]


def flat(d, prefix=()):
    """정적 값 dict 를 경로 튜플 → 값으로 편다 (색은 하나의 값으로 둔다)."""
    out = {}
    for k, v in d.items():
        p = prefix + (k,)
        if isinstance(v, dict) and not {"r", "g", "b"} <= set(v):
            out.update(flat(v, p))
        else:
            out[p] = v
    return out


def main(src, dst):
    sheet = json.load(open(src, encoding="utf-8"))["sheetsById"][SHEET]
    seq = sheet["sequence"]
    static = sheet["staticOverrides"]["byObject"]
    tracks = []
    for obj, t in seq["tracksByObject"].items():
        if obj not in OBJECTS:
            continue
        ids = {v: k for k, v in t["trackIdByPropPath"].items()}
        for tid, td in t["trackData"].items():
            path = json.loads(ids[tid])
            kfs = [{"t": round(k["position"], 4), "v": k["value"],
                    "h": k.get("handles", [0.5, 1, 0.5, 0]),
                    "type": k.get("type", "bezier"),
                    "conn": k.get("connectedRight", True)} for k in td["keyframes"]]
            tracks.append({"obj": obj, "path": path, "kf": kfs})
    statics = []
    for obj in OBJECTS:
        for p, v in flat(static.get(obj, {})).items():
            statics.append({"obj": obj, "path": list(p), "v": v})
    out = {"source": "symphonyofvines.unseen.co state.json / " + SHEET,
           "note": "로컬 테스트용 수치. 공개 배포 전 팀 확정 수치로 교체할 것.",
           "length": seq["length"], "tracks": tracks, "static": statics}
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(dst, len(tracks), "tracks", len(statics), "static")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
