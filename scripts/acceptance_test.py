#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys
import wave

import requests


SAMPLES = {
    "en": "Hello, this is the Voice AI acceptance test.",
    "de": "Hallo, dies ist der Abnahmetest von Voice AI.",
    "es": "Hola, esta es la prueba de aceptación de Voice AI.",
    "it": "Ciao, questo è il test di accettazione di Voice AI.",
    "pt": "Olá, este é o teste de aceitação do Voice AI.",
}

CONTENT_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
}


def validate_wav(content: bytes, output: Path) -> float:
    output.write_bytes(content)
    with wave.open(str(output), "rb") as audio:
        frames = audio.getnframes()
        rate = audio.getframerate()
        if audio.getnchannels() < 1 or audio.getsampwidth() < 1 or frames < 1 or rate < 1:
            raise ValueError("Geçersiz veya boş WAV çıktısı.")
        return frames / rate


def main() -> int:
    parser = argparse.ArgumentParser(description="Voice AI five-language Colab acceptance test")
    parser.add_argument("reference", type=Path, help="3–30 saniyelik WAV, MP3 veya M4A ses örneği")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--output-dir", type=Path, default=Path("acceptance-results"))
    args = parser.parse_args()

    if not args.reference.is_file():
        parser.error(f"Ses örneği bulunamadı: {args.reference}")
    content_type = CONTENT_TYPES.get(args.reference.suffix.lower())
    if content_type is None:
        parser.error("Ses örneği WAV, MP3 veya M4A biçiminde olmalıdır.")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    health = requests.get(f"{args.api_url.rstrip('/')}/api/health", timeout=10)
    health.raise_for_status()
    print(f"API hazır · cihaz={health.json()['device']} · model_yüklü={health.json()['model_loaded']}")

    failures: list[str] = []
    for language, text in SAMPLES.items():
        try:
            with args.reference.open("rb") as reference:
                response = requests.post(
                    f"{args.api_url.rstrip('/')}/api/synthesize",
                    data={"text": text, "language": language, "speed": "1", "consent": "true"},
                    files={"voice": (args.reference.name, reference, content_type)},
                    timeout=600,
                )
            response.raise_for_status()
            duration = validate_wav(response.content, args.output_dir / f"voice-ai-{language}.wav")
            print(f"✓ {language}: {duration:.2f} saniye")
        except Exception as exc:
            failures.append(language)
            print(f"✗ {language}: {exc}", file=sys.stderr)

    if failures:
        print(f"Başarısız diller: {', '.join(failures)}", file=sys.stderr)
        return 1
    print("✓ Beş dilin tamamı gerçek XTTS-v2 üretimiyle doğrulandı.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
