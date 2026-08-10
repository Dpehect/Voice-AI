from __future__ import annotations

import json
from pathlib import Path
import shutil
import subprocess
import wave


class AudioProcessingError(ValueError):
    pass


def require_ffmpeg() -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise AudioProcessingError("FFmpeg bulunamadı. Colab kurulum hücresini yeniden çalıştır.")


def probe_duration(path: Path) -> float:
    require_ffmpeg()
    command = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", str(path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30)
        duration = float(json.loads(result.stdout)["format"]["duration"])
    except (subprocess.SubprocessError, KeyError, ValueError, json.JSONDecodeError) as exc:
        raise AudioProcessingError("Ses dosyası okunamadı veya bozuk.") from exc
    if duration <= 0:
        raise AudioProcessingError("Ses dosyası boş görünüyor.")
    return duration


def normalize_reference(source: Path, destination: Path, max_seconds: float) -> None:
    require_ffmpeg()
    command = [
        "ffmpeg", "-y", "-v", "error", "-i", str(source),
        "-t", str(max_seconds), "-ac", "1", "-ar", "22050",
        "-af", "highpass=f=60,lowpass=f=10000,loudnorm=I=-20:TP=-2:LRA=11",
        "-c:a", "pcm_s16le", str(destination),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=90)
    except subprocess.SubprocessError as exc:
        raise AudioProcessingError("Ses örneği hazırlanamadı.") from exc


def concatenate_wavs(parts: list[Path], destination: Path) -> None:
    if not parts:
        raise AudioProcessingError("Birleştirilecek ses parçası oluşmadı.")
    with wave.open(str(parts[0]), "rb") as first:
        params = first.getparams()
        frames = [first.readframes(first.getnframes())]
    for part in parts[1:]:
        with wave.open(str(part), "rb") as current:
            if current.getparams()[:3] != params[:3]:
                raise AudioProcessingError("Üretilen ses parçalarının biçimleri uyuşmuyor.")
            frames.append(current.readframes(current.getnframes()))
    with wave.open(str(destination), "wb") as output:
        output.setparams(params)
        output.setnframes(sum(len(b) // (params.sampwidth * params.nchannels) for b in frames))
        for block in frames:
            output.writeframes(block)


def apply_speed(source: Path, destination: Path, speed: float) -> None:
    if abs(speed - 1.0) < 0.001:
        shutil.copy2(source, destination)
        return
    command = [
        "ffmpeg", "-y", "-v", "error", "-i", str(source),
        "-filter:a", f"atempo={speed:.2f}", "-c:a", "pcm_s16le", str(destination),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=120)
    except subprocess.SubprocessError as exc:
        raise AudioProcessingError("Konuşma hızı uygulanamadı.") from exc

