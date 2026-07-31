from pathlib import Path

from app.services.voice import LANGUAGE_CODES, VoiceEngine, split_text


def test_supported_languages_are_exactly_mvp_scope() -> None:
    assert LANGUAGE_CODES == {"en", "de", "es", "it", "pt"}


def test_split_text_keeps_content_and_limits_chunks() -> None:
    text = " ".join(["This is a useful sentence for synthesis."] * 30)
    chunks = split_text(text, limit=120)
    assert len(chunks) > 1
    assert all(len(chunk) <= 120 for chunk in chunks)
    assert " ".join(chunks) == " ".join(text.split())


def test_split_text_rejects_blank_content() -> None:
    assert split_text("  \n  ") == []


def test_engine_loads_model_once_and_synthesizes_all_chunks(monkeypatch, tmp_path: Path) -> None:
    engine = VoiceEngine()
    calls: list[str] = []

    class FakeModel:
        def tts_to_file(self, *, text: str, file_path: str, **_kwargs: object) -> None:
            calls.append(text)
            Path(file_path).write_bytes(b"part")

    fake_model = FakeModel()
    monkeypatch.setattr(engine, "_load", lambda: fake_model)
    monkeypatch.setattr("app.services.voice.concatenate_wavs", lambda _parts, output: output.write_bytes(b"raw"))
    monkeypatch.setattr("app.services.voice.apply_speed", lambda _source, output, _speed: output.write_bytes(b"result"))

    output = tmp_path / "output.wav"
    engine.synthesize("One sentence. " * 40, "en", tmp_path / "reference.wav", output, 1.0)

    assert len(calls) > 1
    assert output.read_bytes() == b"result"
