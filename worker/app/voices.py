"""Maps the frontend's fixed voice IDs to XTTS reference speaker samples.

XTTS is a voice-cloning model, not a fixed voice bank — it needs a real
audio sample of each voice to clone from. The frontend's voice picker
(src/app/core/services/voice-library.service.ts) hardcodes these five
IDs, so this registry has to use the exact same ones.

The wav files themselves are NOT included here — see voices/README.md
for the recording requirements. Until real samples are added, every
voice falls back to whichever sample IS present so a job never hard-fails
just because a specific persona's sample is missing.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .config import settings

VOICE_IDS = ["marek", "ania", "kuba", "zosia", "tomasz"]


@dataclass(frozen=True)
class VoiceProfile:
    id: str
    reference_wav: Path


def get_voice_profile(voice_id: str) -> VoiceProfile:
    candidate = settings.voices_dir / f"{voice_id}.wav"
    if voice_id in VOICE_IDS and candidate.exists():
        return VoiceProfile(id=voice_id, reference_wav=candidate)

    for fallback_id in VOICE_IDS:
        fallback_path = settings.voices_dir / f"{fallback_id}.wav"
        if fallback_path.exists():
            return VoiceProfile(id=voice_id, reference_wav=fallback_path)

    raise FileNotFoundError(
        f"No reference sample found for voice '{voice_id}' and no fallback "
        f"sample exists in {settings.voices_dir} — see voices/README.md."
    )
