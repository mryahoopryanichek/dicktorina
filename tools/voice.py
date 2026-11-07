"""Голоса роликов через edge-tts, паузы ужаты.

    python tools/voice.py            — концовка: скорость подобрана под длину → public/voices/<id>.mp3
                                       и src/outro/voices.ts (длина фразы, когда начинается каждый кусок)
    python tools/voice.py questions [id …] — хук, вопрос и ответ из src/reel/q/<id>.json каждым голосом →
                                       public/voices/q/*.mp3 и src/reel/lines/<id>.json (файл и длина).
                                       Уже озвученное не трогает: имя файла — от текста, голоса и скорости.

edge-tts ставить во временную папку, не в систему:
    python -m pip install --target <tmp>/pylib edge-tts==7.3.1
    PYTHONPATH=<tmp>/pylib PYTHONIOENCODING=utf-8 python tools/voice.py [questions]
"""
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

import edge_tts

TEXT = "Поиграл бы в такую викторину? Если да, регистрируйся на сайте. Наберём пять тысяч игроков — сделаем!"
# Куски фразы: имя → слово, с которого кусок начинается. По ним в ролике появляются строки
MARKS = {"yes": "Если", "reg": "регистрируйся", "gather": "Наберём", "done": "сделаем"}
VOICES = {  # id → голос edge-tts, высота
    "vivienne": ("fr-FR-VivienneMultilingualNeural", "+0Hz"),
    "andrew": ("en-US-AndrewMultilingualNeural", "+0Hz"),
    "remy": ("fr-FR-RemyMultilingualNeural", "+0Hz"),
    "svetlana": ("ru-RU-SvetlanaNeural", "+12Hz"),
}
TARGET = 4.9  # с: фраза концовки целиком, с запасом до 5
# Вопросы читаются живее обычного, но без гонки, как в концовке
QRATE = {"vivienne": "+20%", "andrew": "+35%", "remy": "+28%", "svetlana": "+22%"}
GAP, MAXGAP, PAD = 0.14, 0.2, 0.03  # пауза длиннее MAXGAP становится GAP; поля у кусков речи
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ffmpeg(name):
    found = shutil.which(name)
    if found:
        return found
    base = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")
    for d in os.listdir(base) if os.path.isdir(base) else []:
        if d.startswith("Gyan.FFmpeg"):
            for root, _, files in os.walk(os.path.join(base, d)):
                if name + ".exe" in files:
                    return os.path.join(root, name + ".exe")
    sys.exit(f"нет {name}")


FF = ffmpeg("ffmpeg")


async def synth(text, voice, rate, pitch):
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append((ch["offset"] / 1e7, ch["text"]))
    return bytes(audio), words


def speech_segments(path):
    err = subprocess.run([FF, "-v", "info", "-i", path, "-af", "silencedetect=n=-40dB:d=0.1", "-f", "null", "-"],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    dur = sum(float(x) * k for x, k in zip(re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups(), (3600, 60, 1)))
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)] + [dur]
    segs, t = [], 0.0
    for s, e in zip(starts, ends):
        if s <= 0.01:
            t = e
            continue
        if e - s > MAXGAP:
            segs.append((t, s))
            t = e
    if t < dur - 0.05:
        segs.append((t, dur))
    return [(max(0, a - PAD), b + PAD) for a, b in segs if b - a > 0.05]


def squeeze(src, dst, segs):
    parts, labels, starts, pos = [], [], [], 0.0
    for i, (a, b) in enumerate(segs):
        parts.append(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[s{i}]")
        labels.append(f"[s{i}]")
        starts.append(pos)
        pos += b - a
        if i < len(segs) - 1:
            parts.append(f"aevalsrc=0:d={GAP}:s=24000[g{i}]")
            labels.append(f"[g{i}]")
            pos += GAP
    fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[o]"
    subprocess.run([FF, "-y", "-v", "error", "-i", src, "-filter_complex", fc, "-map", "[o]",
                    "-c:a", "libmp3lame", "-b:a", "160k", dst], check=True)
    return starts, pos


def remap(t, segs, starts):
    """Время в исходной записи → время после ужатых пауз."""
    for (a, b), n in zip(segs, starts):
        if t < a:
            return n
        if t <= b:
            return n + (t - a)
    return starts[-1] + segs[-1][1] - segs[-1][0]


def say(text, voice, rate, pitch, label):
    for _try in range(6):  # сервис иногда не отдаёт звук — повторить
        try:
            audio, words = asyncio.run(synth(text, voice, rate, pitch))
        except edge_tts.exceptions.NoAudioReceived:
            audio = b""
        if audio:
            return audio, words
        time.sleep(2)
    sys.exit(f"{label}: голос не отдаёт звук")


def build(vid, voice, pitch, tmp, text=TEXT, target=TARGET, marks_of=MARKS, out_name=None):
    rate = 0.2
    for _ in range(6):
        r = f"{round(rate * 100):+d}%"
        audio, words = say(text, voice, r, pitch, vid)
        raw = os.path.join(tmp, f"{vid}.raw.mp3")
        with open(raw, "wb") as f:
            f.write(audio)
        segs = speech_segments(raw)
        dst = os.path.join(ROOT, "public", "voices", out_name or f"{vid}.mp3")
        starts, length = squeeze(raw, dst, segs)
        if target - 0.35 <= length <= target:
            break
        rate = (1 + rate) * length / target - 1 + (0.01 if length > target else 0)
    marks = {}
    for name, word in marks_of.items():
        hit = next((t for t, w in words if w.strip(",.!?—").lower() == word.lower()), None)
        if hit is None:
            sys.exit(f"{vid}: нет слова «{word}» в границах слов: {[w for _, w in words]}")
        marks[name] = round(remap(hit, segs, starts), 2)
    print(f"{vid}: скорость {r}, {length:.2f} с, {marks}")
    return {"name": voice, "rate": r, "len": round(length, 2), **marks}


# Блок «как играть» после ответа (решающий, 2026-11-07): его текст слово в слово, голос подогнан под длину
EXPLAIN = ("Мы хотим сделать Дикторину, в которую вы с друзьями будете играть, когда собираетесь вместе. "
           "Включите телевизор, создайте комнату, подключитесь с телефонов — и начинайте!")
EXPLAIN_MARKS = {"tv": "Включите", "room": "создайте", "join": "подключитесь", "go": "начинайте"}
EXPLAIN_TARGET = 7.6


def explain():
    """Блок «как играть» каждым голосом → public/voices/explain-<id>.mp3 и src/reel/explain.json."""
    with tempfile.TemporaryDirectory() as tmp:
        out = {vid: build(vid, v, p, tmp, EXPLAIN, EXPLAIN_TARGET, EXPLAIN_MARKS, f"explain-{vid}.mp3") for vid, (v, p) in VOICES.items()}
    with open(os.path.join(ROOT, "src", "reel", "explain.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


def main():
    os.makedirs(os.path.join(ROOT, "public", "voices"), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        out = {vid: build(vid, v, p, tmp) for vid, (v, p) in VOICES.items()}
    lines = [
        "// Сгенерировано tools/voice.py — не править руками. Голоса концовки: длина фразы, с, и когда начинается",
        "// кусок «Если да», «регистрируйся», «Наберём», «сделаем» — по ним появляются строки.",
        "export const VOICES = {",
    ]
    for vid, d in out.items():
        lines.append(
            f"  {vid}: {{name: '{d['name']}', rate: '{d['rate']}', len: {d['len']}, "
            f"yes: {d['yes']}, reg: {d['reg']}, gather: {d['gather']}, done: {d['done']}}},"
        )
    lines += ["};", "export type VoiceId = keyof typeof VOICES;", ""]
    with open(os.path.join(ROOT, "src", "outro", "voices.ts"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


def questions(only):
    """Озвучка вопросов из questions.json (корень репо) — строго по очереди: вопрос за вопросом, по 4 голоса.
    Файлы: public/voices/q/<id>-<часть>-<голос>.mp3 (часть: h — хук, q — вопрос, a — ответ).
    Длины и тексты — src/reel/lines/<id>.json, пишется сразу после каждого вопроса: упало — запусти снова,
    продолжит с того же места. Озвученное с тем же текстом не трогает. only — список id; пусто — все."""
    qs = json.load(open(os.path.join(ROOT, "questions.json"), encoding="utf-8"))
    ldir = os.path.join(ROOT, "src", "reel", "lines")
    qdir = os.path.join(ROOT, "public", "voices", "q")
    os.makedirs(qdir, exist_ok=True)
    os.makedirs(ldir, exist_ok=True)
    # без id — только то, что идёт в ролики: «готов» и «черновик» (не заготовки и не «не брать»)
    ids = only or [k for k, v in qs.items() if v.get("status") in ("готов", "черновик")]
    voices = "|".join(VOICES)
    for n, qid in enumerate(ids, 1):
        q = qs[qid]
        answer = q["options"][q["answer"]] if isinstance(q["answer"], int) else q["answer"]
        texts = {"q": q.get("say") or q["text"], "a": q.get("answerSay") or f"Правильный ответ — {answer}!"}
        if q.get("hook"):  # хук в начале ролика
            texts["h"] = q.get("hookSay") or f"Внимание! {q['hook']}!"
        lpath = os.path.join(ldir, f"{qid}.json")
        old = json.load(open(lpath, encoding="utf-8")) if os.path.exists(lpath) else {}
        out, keep, made = {}, set(), 0
        with tempfile.TemporaryDirectory() as tmp:
            for vid, (voice, pitch) in VOICES.items():
                rate = QRATE[vid]
                out[vid] = {}
                for kind, text in texts.items():
                    name = f"{qid}-{kind}-{vid}.mp3"
                    dst = os.path.join(qdir, name)
                    keep.add(name)
                    if not (os.path.exists(dst) and old.get(vid, {}).get(kind, {}).get("text") == text):
                        # озвучка того же текста со старым именем (с хешем) — переименовать, не генерировать заново
                        h = hashlib.sha1(f"{text}|{voice}|{rate}|{pitch}".encode()).hexdigest()[:8]
                        legacy = os.path.join(qdir, f"{qid}-{vid}-{kind}-{h}.mp3")
                        if os.path.exists(legacy):
                            os.replace(legacy, dst)
                        else:
                            audio, _ = say(text, voice, rate, pitch, f"{qid}/{vid}/{kind}")
                            raw = os.path.join(tmp, "raw.mp3")
                            with open(raw, "wb") as f:
                                f.write(audio)
                            squeeze(raw, dst, speech_segments(raw))
                            made += 1
                    err = subprocess.run([FF, "-i", dst], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
                    h_, m_, s_ = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()
                    out[vid][kind] = {"file": f"q/{name}", "len": round(int(h_) * 3600 + int(m_) * 60 + float(s_), 2), "text": text}
        with open(lpath, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        mine = re.compile(rf"^{re.escape(qid)}-(?:(?:h|q|a)-(?:{voices})|(?:{voices})-(?:h|q|a)-[0-9a-f]{{8}})\.mp3$")
        for f in os.listdir(qdir):  # старые файлы этого вопроса: прежние имена, поменявшиеся тексты
            if mine.match(f) and f not in keep:
                os.remove(os.path.join(qdir, f))
        print(f"[{n}/{len(ids)}] {qid}: сгенерировано {made}, всего {sum(len(v) for v in out.values())}", flush=True)


if len(sys.argv) > 1 and sys.argv[1] == "questions":
    questions(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "explain":
    explain()
else:
    main()
