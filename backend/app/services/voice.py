from __future__ import annotations

from pathlib import Path
import gc
import re
import threading
from typing import Any

from app.config import settings
from app.services.audio import apply_speed, concatenate_wavs


LANGUAGES = [
    {"code": "en", "name": "İngilizce", "native_name": "English"},
    {"code": "de", "name": "Almanca", "native_name": "Deutsch"},
    {"code": "es", "name": "İspanyolca", "native_name": "Español"},
    {"code": "it", "name": "İtalyanca", "native_name": "Italiano"},
    {"code": "pt", "name": "Portekizce", "native_name": "Português"},
]
LANGUAGE_CODES = {item["code"] for item in LANGUAGES}


def split_text(text: str, limit: int = 240) -> list[str]:
    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return []
    sentences = re.split(r"(?<=[.!?;:])\s+", compact)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        words = sentence.split()
        for word in words:
            candidate = f"{current} {word}".strip()
            if len(candidate) > limit and current:
                chunks.append(current)
                current = word
            else:
                current = candidate
        if current and len(current) >= limit * 0.6:
            chunks.append(current)
            current = ""
    if current:
        chunks.append(current)
    return chunks


class VoiceEngine:
    def __init__(self) -> None:
        self._model: Any | None = None
        self._device = "cuda" if self._cuda_available() else "cpu"
        self._load_lock = threading.Lock()
        self._generation_lock = threading.Lock()

    @staticmethod
    def _cuda_available() -> bool:
        try:
            import torch
            return bool(torch.cuda.is_available())
        except ImportError:
            return False

    @property
    def device(self) -> str:
        return self._device

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def _load(self) -> Any:
        if self._model is not None:
            return self._model
        with self._load_lock:
            if self._model is None:
                try:
                    from TTS.api import TTS
                except ImportError as exc:
                    raise RuntimeError("Coqui TTS kurulu değil. Colab kurulumunu yeniden çalıştır.") from exc
                self._model = TTS(settings.model_name).to(self._device)
        return self._model

    def synthesize(self, text: str, language: str, reference: Path, output: Path, speed: float) -> None:
        chunks = split_text(text)
        if not chunks:
            raise ValueError("Seslendirilecek metin boş olamaz.")
        temp_parts: list[Path] = []
        raw_output = output.with_name("raw-output.wav")
        with self._generation_lock:
            try:
                model = self._load()
                for index, chunk in enumerate(chunks):
                    part = output.with_name(f"part-{index:03d}.wav")
                    model.tts_to_file(
                        text=chunk,
                        speaker_wav=str(reference),
                        language=language,
                        file_path=str(part),
                        split_sentences=False,
                    )
                    temp_parts.append(part)
                concatenate_wavs(temp_parts, raw_output)
                apply_speed(raw_output, output, speed)
            finally:
                gc.collect()
                if self._device == "cuda":
                    try:
                        import torch
                        torch.cuda.empty_cache()
                    except (ImportError, RuntimeError):
                        pass


voice_engine = VoiceEngine()
