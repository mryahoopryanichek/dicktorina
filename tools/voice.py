"""Голос концовки: edge-tts → паузы ужаты → скорость подобрана под длину → public/voices/<id>.mp3
и src/outro/voices.ts — длина фразы и когда начинается каждый кусок (по границам слов).

edge-tts ставить во временную папку, не в систему:
    python -m pip install --target <tmp>/pylib edge-tts==7.3.1
    PYTHONPATH=<tmp>/pylib PYTHONIOENCODING=utf-8 python tools/voice.py
"""
import asyncio
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

import edge_tts

TEXT = "Поиграл бы в такую викторину? Если да, регистрируйся на сайте. Наберём тысячу игроков — сделаем!"
# Куски фразы: имя → слово, с которого кусок начинается. По ним в ролике появляются строки
MARKS = {"yes": "Если", "reg": "регистрируйся", "gather": "Наберём", "done": "сделаем"}
VOICES = {  # id → голос edge-tts, высота
    "vivienne": ("fr-FR-VivienneMultilingualNeural", "+0Hz"),
    "andrew": ("en-US-AndrewMultilingualNeural", "+0Hz"),
    "remy": ("fr-FR-RemyMultilingualNeural", "+0Hz"),
    "svetlana": ("ru-RU-SvetlanaNeural", "+12Hz"),
}
TARGET = 4.9  # с: фраза целиком, с запасом до 5
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


async def synth(voice, rate, pitch):
    c = edge_tts.Communicate(TEXT, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
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


def build(vid, voice, pitch, tmp):
    rate = 0.2
    for _ in range(6):
        r = f"{round(rate * 100):+d}%"
        for _try in range(6):  # сервис иногда не отдаёт звук — повторить
            try:
                audio, words = asyncio.run(synth(voice, r, pitch))
            except edge_tts.exceptions.NoAudioReceived:
                audio = b""
            if audio:
                break
            time.sleep(2)
        else:
            sys.exit(f"{vid}: голос не отдаёт звук")
        raw = os.path.join(tmp, f"{vid}.raw.mp3")
        with open(raw, "wb") as f:
            f.write(audio)
        segs = speech_segments(raw)
        dst = os.path.join(ROOT, "public", "voices", f"{vid}.mp3")
        starts, length = squeeze(raw, dst, segs)
        if TARGET - 0.35 <= length <= TARGET:
            break
        rate = (1 + rate) * length / TARGET - 1 + (0.01 if length > TARGET else 0)
    marks = {}
    for name, word in MARKS.items():
        hit = next((t for t, w in words if w.strip(",.!?—").lower() == word.lower()), None)
        if hit is None:
            sys.exit(f"{vid}: нет слова «{word}» в границах слов: {[w for _, w in words]}")
        marks[name] = round(remap(hit, segs, starts), 2)
    print(f"{vid}: скорость {r}, {length:.2f} с, {marks}")
    return {"name": voice, "rate": r, "len": round(length, 2), **marks}


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


main()
