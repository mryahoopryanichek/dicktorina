# Расшифровка песни или речи с таймкодами слов: faster-whisper 1.1.1, модель small, русский.
# python words.py <аудио или видео> [с секунды] [по секунду] [подсказка]
# Звук декодирует ffmpeg (из PATH или из папки winget), в faster-whisper идёт массивом:
# его decode_audio не работает с установленной версией av.
import os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = "ffmpeg"
winget = os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe")
if os.path.exists(winget):
    FFMPEG = winget

src = sys.argv[1]
start = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
end = float(sys.argv[3]) if len(sys.argv) > 3 else None
prompt = sys.argv[4] if len(sys.argv) > 4 else None

cmd = [FFMPEG, "-v", "error", "-ss", str(start)]
if end is not None:
    cmd += ["-to", str(end)]
cmd += ["-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
pcm = subprocess.run(cmd, capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768

model = WhisperModel("small", device="cpu", compute_type="int8", download_root=os.path.join(HERE, "models"))
segs, _ = model.transcribe(audio, language="ru", word_timestamps=True, beam_size=5,
                           initial_prompt=prompt, condition_on_previous_text=False)
for s in segs:
    print(f"[{s.start + start:7.2f}-{s.end + start:7.2f}] {s.text.strip()}")
    for w in s.words:
        print(f"      {w.start + start:7.2f}-{w.end + start:7.2f} {w.word.strip()}")
