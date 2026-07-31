from app.services.voice import LANGUAGE_CODES, split_text


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

