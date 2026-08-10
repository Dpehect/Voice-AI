from __future__ import annotations

import asyncio
from pathlib import Path
import shutil
import tempfile

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas import HealthResponse, LanguageResponse
from app.services.audio import AudioProcessingError, normalize_reference, probe_duration
from app.services.voice import LANGUAGES, LANGUAGE_CODES, voice_engine


app = FastAPI(
    title="Voice AI API",
    version="0.1.0",
    description="Temporary, consent-first multilingual voice synthesis API.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a"}
ALLOWED_CONTENT_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave",
    "audio/mpeg", "audio/mp3", "audio/x-mp3",
    "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/x-aac", "audio/mp4a-latm",
    "audio/ogg", "audio/webm", "audio/flac", "application/octet-stream", ""
}


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=voice_engine.loaded, device=voice_engine.device)


@app.get("/api/languages", response_model=list[LanguageResponse])
async def languages() -> list[LanguageResponse]:
    return [LanguageResponse(**item) for item in LANGUAGES]


def remove_tree(path: str) -> None:
    shutil.rmtree(path, ignore_errors=True)


async def save_upload(upload: UploadFile, destination: Path) -> int:
    total = 0
    with destination.open("wb") as target:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > settings.max_upload_bytes:
                raise HTTPException(413, "Ses dosyası en fazla 15 MB olabilir.")
            target.write(chunk)
    return total


@app.post("/api/synthesize")
async def synthesize(
    background_tasks: BackgroundTasks,
    voice: UploadFile = File(...),
    text: str = Form(..., min_length=2),
    language: str = Form(...),
    speed: float = Form(1.0, ge=0.8, le=1.2),
    consent: bool = Form(...),
) -> FileResponse:
    if not consent:
        raise HTTPException(400, "Ses sahibinin açık izni onaylanmalıdır.")
    text = text.strip()
    if not text or len(text) > settings.max_text_chars:
        raise HTTPException(400, f"Metin 2–{settings.max_text_chars} karakter arasında olmalıdır.")
    if language not in LANGUAGE_CODES:
        raise HTTPException(400, "Desteklenmeyen hedef dil.")
    suffix = Path(voice.filename or "").suffix.lower()
    content_type = (voice.content_type or "").lower().split(";")[0].strip()
    if suffix not in ALLOWED_EXTENSIONS and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(415, "Yalnızca WAV, MP3 veya M4A ses dosyaları kabul edilir.")

    workspace = Path(tempfile.mkdtemp(prefix="voice-ai-"))
    source = workspace / f"upload{suffix}"
    reference = workspace / "reference.wav"
    output = workspace / "voice-ai-output.wav"
    try:
        size = await save_upload(voice, source)
        if size == 0:
            raise HTTPException(400, "Yüklenen ses dosyası boş.")
        duration = await asyncio.to_thread(probe_duration, source)
        if duration < settings.min_reference_seconds:
            raise HTTPException(400, f"Ses örneği en az {settings.min_reference_seconds:g} saniye olmalıdır.")
        await asyncio.to_thread(normalize_reference, source, reference, settings.max_reference_seconds)
        await asyncio.to_thread(voice_engine.synthesize, text, language, reference, output, speed)
    except HTTPException:
        remove_tree(str(workspace))
        raise
    except (AudioProcessingError, ValueError) as exc:
        remove_tree(str(workspace))
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        remove_tree(str(workspace))
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        remove_tree(str(workspace))
        raise HTTPException(500, "Ses üretimi beklenmeyen bir nedenle tamamlanamadı.") from exc
    finally:
        await voice.close()

    background_tasks.add_task(remove_tree, str(workspace))
    return FileResponse(output, media_type="audio/wav", filename=f"voice-ai-{language}.wav")

