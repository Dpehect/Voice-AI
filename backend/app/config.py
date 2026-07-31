from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    model_name: str = os.getenv("VOICE_AI_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")
    max_upload_bytes: int = int(os.getenv("VOICE_AI_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
    min_reference_seconds: float = float(os.getenv("VOICE_AI_MIN_REFERENCE_SECONDS", "3"))
    max_reference_seconds: float = float(os.getenv("VOICE_AI_MAX_REFERENCE_SECONDS", "30"))
    max_text_chars: int = int(os.getenv("VOICE_AI_MAX_TEXT_CHARS", "2000"))
    cors_origins: tuple[str, ...] = tuple(
        item.strip()
        for item in os.getenv("VOICE_AI_CORS_ORIGINS", "http://localhost:3000").split(",")
        if item.strip()
    )


settings = Settings()

