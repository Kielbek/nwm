"""Splits long text into XTTS-friendly chunks.

XTTS's prosody gets noticeably worse (drifting pace, occasional
truncation) on long single calls, so the community-recommended approach
is to synthesize per-sentence (or per-clause) in short chunks and
concatenate the resulting audio. This module only does the splitting;
concatenation happens in synthesis.py where the actual audio exists.
"""

from __future__ import annotations

import re

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def chunk_text(text: str, max_chars: int = 250) -> list[str]:
    text = text.strip()
    if not text:
        return []

    sentences = [s for s in _SENTENCE_SPLIT.split(text) if s]
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= max_chars:
            current = candidate
            continue

        if current:
            chunks.append(current)

        if len(sentence) <= max_chars:
            current = sentence
        else:
            # A single sentence longer than the limit on its own — fall
            # back to hard-splitting on word boundaries.
            chunks.extend(_split_on_words(sentence, max_chars))
            current = ""

    if current:
        chunks.append(current)

    return chunks


def _split_on_words(sentence: str, max_chars: int) -> list[str]:
    words = sentence.split(" ")
    pieces: list[str] = []
    current = ""

    for word in words:
        candidate = f"{current} {word}".strip() if current else word
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                pieces.append(current)
            # A single word longer than max_chars (rare — e.g. a URL) is
            # kept whole rather than mangled mid-word.
            current = word

    if current:
        pieces.append(current)

    return pieces
