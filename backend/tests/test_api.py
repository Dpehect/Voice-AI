from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
import app.main as main_module


client = TestClient(app)


def test_health_and_languages() -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    languages = client.get("/api/languages")
    assert languages.status_code == 200
    assert {item["code"] for item in languages.json()} == {"en", "de", "es", "it", "pt"}


def test_consent_is_required() -> None:
    response = client.post(
        "/api/synthesize",
        data={"text": "Hello world", "language": "en", "speed": "1", "consent": "false"},
        files={"voice": ("voice.wav", b"not-empty", "audio/wav")},
    )
    assert response.status_code == 400
    assert "izni" in response.json()["detail"]


def test_unsupported_language_is_rejected() -> None:
    response = client.post(
        "/api/synthesize",
        data={"text": "Hei maailma", "language": "fi", "speed": "1", "consent": "true"},
        files={"voice": ("voice.wav", b"not-empty", "audio/wav")},
    )
    assert response.status_code == 400


def test_synthesis_happy_path_without_loading_model(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(main_module, "probe_duration", lambda _: 8.0)
    monkeypatch.setattr(main_module, "normalize_reference", lambda _source, destination, _max: destination.write_bytes(b"wav"))

    def fake_synthesize(_text: str, _language: str, _reference: Path, output: Path, _speed: float) -> None:
        output.write_bytes(b"RIFF-fake-wave")

    monkeypatch.setattr(main_module.voice_engine, "synthesize", fake_synthesize)
    response = client.post(
        "/api/synthesize",
        data={"text": "Hello from Voice AI", "language": "en", "speed": "1", "consent": "true"},
        files={"voice": ("voice.wav", b"reference-audio", "audio/wav")},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.content == b"RIFF-fake-wave"

