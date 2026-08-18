import { JobChunk, JobStatus } from '../models/tts.models';

/** Shared by the player, sidebar/history rows, and the "Generate" button — one source of truth for "is this entry still streaming in, and how far along is it". */
export function isGenerating(status: JobStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

/** Null once the job isn't generating; 0 while connecting (no chunks yet, total unknown). */
export function generationProgressPercent(status: JobStatus, chunks: JobChunk[]): number | null {
  if (!isGenerating(status)) {
    return null;
  }
  const total = chunks[0]?.total ?? 0;
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((chunks.length / total) * 100));
}
