import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.text_chunking import chunk_text  # noqa: E402


def test_empty_text_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text_is_a_single_chunk():
    assert chunk_text("Hello there.", max_chars=250) == ["Hello there."]


def test_splits_on_sentence_boundaries_within_limit():
    text = "First sentence. Second sentence. Third sentence."
    chunks = chunk_text(text, max_chars=20)
    assert chunks == ["First sentence.", "Second sentence.", "Third sentence."]
    for chunk in chunks:
        assert len(chunk) <= 30  # sentences here are all under max_chars anyway


def test_groups_short_sentences_together_up_to_the_limit():
    text = "One. Two. Three."
    chunks = chunk_text(text, max_chars=100)
    assert chunks == ["One. Two. Three."]


def test_hard_splits_a_single_sentence_longer_than_the_limit():
    text = ("word " * 20).strip() + "."  # no punctuation mid-string, over any small limit
    chunks = chunk_text(text, max_chars=20)
    assert all(len(c) <= 20 for c in chunks)
    # No words lost or duplicated in the split.
    assert sum(chunk.count("word") for chunk in chunks) == 20


def test_no_chunk_exceeds_max_chars_on_mixed_input():
    text = (
        "Krótkie zdanie. " * 3
        + "A very very very very very very very very very very long sentence that on its own exceeds the limit."
    )
    chunks = chunk_text(text, max_chars=40)
    assert chunks
    assert all(len(c) <= 40 for c in chunks)
