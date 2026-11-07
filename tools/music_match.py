"""Какая музыка играла в записи игры в данный момент: кусок звука записи ищем во всех треках папок
(нормированная взаимная корреляция, 8 кГц моно). Печатает лучшие совпадения: трек, с какой секунды трека
играл кусок, сила совпадения (у настоящего — заметно выше остальных, обычно > 0,3).

    python tools/music_match.py <секунда в записи> <длина куска, с> <папка> [папка …]
    python tools/music_match.py 559 12 "materials/game1/Раунд 2 плюс минус"
"""
import os
import shutil
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, "materials", "kvizv2", "КВИЗV2-копия.mp4")
SR = 8000
AUDIO = (".mp3", ".m4a", ".wav", ".mp4", ".mov")


def ffmpeg():
    found = shutil.which("ffmpeg")
    if found:
        return found
    base = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")
    for d in os.listdir(base) if os.path.isdir(base) else []:
        if d.startswith("Gyan.FFmpeg"):
            for r, _, files in os.walk(os.path.join(base, d)):
                if "ffmpeg.exe" in files:
                    return os.path.join(r, "ffmpeg.exe")
    sys.exit("нет ffmpeg")


FF = ffmpeg()


def pcm(path, start=None, dur=None):
    cmd = [FF, "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", path]
    if dur is not None:
        cmd += ["-t", str(dur)]
    cmd += ["-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32)


def match(seg, track):
    """Лучшее место seg в track: (корреляция −1…1, секунда в track)."""
    if len(track) < len(seg):
        return 0.0, 0.0
    seg = seg - seg.mean()
    n = 1 << int(np.ceil(np.log2(len(track) + len(seg))))
    corr = np.fft.irfft(np.fft.rfft(track, n) * np.conj(np.fft.rfft(seg, n)), n)[: len(track) - len(seg) + 1]
    # энергия трека в скользящем окне длины куска
    c1 = np.concatenate([[0], np.cumsum(track.astype(np.float64))])
    c2 = np.concatenate([[0], np.cumsum(track.astype(np.float64) ** 2)])
    L = len(seg)
    s1 = c1[L:] - c1[:-L]
    s2 = c2[L:] - c2[:-L]
    var = s2 - s1 * s1 / L
    # тихие места трека не сравниваем: деление на почти ноль даёт ложные «совпадения»
    var = np.where(var < 0.05 * float(np.dot(seg, seg)), np.inf, var)
    norm = corr / (np.sqrt(var) * np.linalg.norm(seg) + 1e-6)
    i = int(np.argmax(norm))
    return float(norm[i]), i / SR


def main():
    start, dur, folders = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3:]
    seg = pcm(VIDEO, start, dur)
    res = []
    for folder in folders:
        for f in sorted(os.listdir(folder)):
            if f.lower().endswith(AUDIO):
                score, at = match(seg, pcm(os.path.join(folder, f)))
                res.append((score, at, os.path.join(os.path.basename(folder), f)))
    for score, at, name in sorted(res, reverse=True)[:5]:
        print(f"{score:.2f}  с {at:6.1f} с  {name}")


main()
