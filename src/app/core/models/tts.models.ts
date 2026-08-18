import { IconName } from '../../shared/components/icon/icon.component';

export interface Voice {
  id: string;
  name: string;
  description: string;
  avatarColor: string;
}

export interface TtsModel {
  id: string;
  badge: string;
  name: string;
}

export type OutputFormat = 'mp3-128' | 'mp3-192' | 'wav' | 'ogg';

export interface TtsSettings {
  voiceId: string;
  modelId: string;
  speed: number;
  stability: number;
  similarity: number;
  styleExaggeration: number;
  languageOverride: boolean;
  outputFormat: OutputFormat;
}

export interface StarterPrompt {
  icon: IconName;
  label: string;
  text: string;
}

export interface SynthesizeRequest {
  text: string;
  settings: TtsSettings;
}

export interface SynthesizeResult {
  audioUrl: string;
  durationSeconds: number;
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobChunk {
  index: number;
  total: number;
  url: string;
  durationSeconds: number | null;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  text: string;
  voiceId: string;
  modelId: string;
  outputFormat: string;
  characterCount: number;
  durationSeconds: number | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  chunks: JobChunk[];
}
