FROM python:3.11-slim

# ffmpeg: required by pydub for mp3/ogg export and any non-wav decoding.
# git: some torch/coqui-tts transitive installs still shell out to git.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY voices ./voices

# Not pre-downloaded at build time on purpose: the ~2GB of XTTS weights
# would otherwise bloat every image rebuild. It downloads once into
# ~/.local/share/tts on first job and is cached after that — mount a
# volume at /root/.local/share/tts in production so it isn't re-fetched
# on every container restart.

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "app.main"]
