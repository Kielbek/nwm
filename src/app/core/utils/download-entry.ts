import { GenerationEntry } from '../services/generation-history.service';

const EXTENSION_BY_FORMAT: Record<string, string> = {
  'mp3-128': 'mp3',
  'mp3-192': 'mp3',
  wav: 'wav',
  ogg: 'ogg',
};

/**
 * Downloads the entry's real generated audio when it's ready (job
 * COMPLETED with a presigned combined-file URL); falls back to a .txt of
 * the text/settings otherwise so the download action still does something
 * useful for a still-streaming or failed generation.
 */
export function downloadEntry(entry: GenerationEntry): void {
  if (entry.downloadUrl) {
    const extension = EXTENSION_BY_FORMAT[entry.outputFormat] ?? 'mp3';
    const link = document.createElement('a');
    link.href = entry.downloadUrl;
    link.download = `${entry.voiceName.toLowerCase()}-${entry.id}.${extension}`;
    link.click();
    return;
  }

  const lines = [
    `${entry.voiceName} — ${entry.modelName}`,
    new Date(entry.createdAt).toLocaleString(),
    '',
    entry.text,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entry.voiceName.toLowerCase()}-${entry.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
