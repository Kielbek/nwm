"""Auto-detects which of XTTS v2's supported languages a job's text is in.

There is currently no explicit language field in the job message contract
(`settings.languageOverride` is just a boolean placeholder on the frontend
today) — so instead of requiring a contract change, this module guesses
the language from the text itself and falls back to DEFAULT_LANGUAGE when
detection fails or lands on something XTTS doesn't support.

Note: XTTS has one "en" — it does not have separate en-US/en-GB/en-AU
locales. Distinct English accents have to come from the reference voice
sample used for cloning, not a language code, so a truly "many English
accents" story means registering multiple English reference voices (see
voices.py), not passing a different language here.
"""

from __future__ import annotations

from langdetect import DetectorFactory, LangDetectException, detect

# Deterministic results — langdetect is otherwise seeded from wall-clock
# time, which makes short/ambiguous inputs flaky across runs.
DetectorFactory.seed = 0

XTTS_SUPPORTED_LANGUAGES = {
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "pl",
    "tr",
    "ru",
    "nl",
    "cs",
    "ar",
    "zh-cn",
    "ja",
    "hu",
    "ko",
    "hi",
}

_LANGDETECT_TO_XTTS = {
    "zh-cn": "zh-cn",
    "zh-tw": "zh-cn",
}


def detect_language(text: str, default: str) -> str:
    try:
        code = detect(text)
    except LangDetectException:
        return default

    code = _LANGDETECT_TO_XTTS.get(code, code)
    return code if code in XTTS_SUPPORTED_LANGUAGES else default
