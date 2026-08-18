import { GenerationEntry } from '../services/generation-history.service';

const EXTENSION_BY_FORMAT: Record<string, string> = {
  'mp3-128': 'mp3',
  'mp3-192': 'mp3',
  wav: 'wav',
  ogg: 'ogg',
};

/**
 * Downloads the entry's real generated audio when it's ready, routed
 * through GET /api/tts/jobs/{id}/download rather than the presigned S3
 * URL directly — a presigned URL is always cross-origin (e.g. the
 * Docker-internal "minio" host, or a different port than the app), and
 * browsers silently ignore the `download` attribute on cross-origin
 * links: clicking it just opened/streamed the file instead of saving it.
 * Fetching through this API (same-origin) and saving the response as a
 * blob sidesteps that entirely. Falls back to a .txt of the text/settings
 * for a still-streaming or failed generation, or if the fetch itself fails.
 */
export async function downloadEntry(entry: GenerationEntry, accessToken: string | null): Promise<void> {
  if (entry.status === 'COMPLETED' && entry.downloadUrl) {
    try {
      const response = await fetch(`/api/tts/jobs/${entry.id}/download`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const extension = EXTENSION_BY_FORMAT[entry.outputFormat] ?? 'mp3';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entry.voiceName.toLowerCase()}-${entry.id}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    } catch {
      // Fall through to the text fallback below — the button should still
      // do something useful rather than silently failing.
    }
  }

  const lines = [
    entry.voiceName,
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
