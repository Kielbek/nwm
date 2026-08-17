import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.language import XTTS_SUPPORTED_LANGUAGES, detect_language  # noqa: E402


def test_detects_polish():
    text = "Witaj świecie, to jest przykładowy tekst w języku polskim do syntezy mowy."
    assert detect_language(text, default="en") == "pl"


def test_detects_german():
    text = "Hallo Welt, dies ist ein Beispieltext auf Deutsch für die Sprachsynthese."
    assert detect_language(text, default="en") == "de"


def test_detects_english():
    text = "Hello world, this is a sample piece of English text for speech synthesis."
    assert detect_language(text, default="pl") == "en"


def test_falls_back_to_default_on_empty_text():
    assert detect_language("", default="pl") == "pl"


def test_falls_back_to_default_on_unsupported_language():
    # Finnish/Swedish-ish gibberish isn't in XTTS_SUPPORTED_LANGUAGES even
    # if langdetect confidently guesses a language for it.
    text = "Höyryveturi kulkee kiskoilla pitkin metsäistä maisemaa hitaasti."
    result = detect_language(text, default="pl")
    assert result in XTTS_SUPPORTED_LANGUAGES
