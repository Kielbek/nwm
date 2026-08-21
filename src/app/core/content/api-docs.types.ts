import { IconName } from '../../shared/components/icon/icon.component';

export type ApiMethod = 'GET' | 'POST' | 'PATCH';

export interface ApiCodeSample {
  label: string;
  code: string;
}

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: ApiMethod;
  path: string;
  title: string;
  description: string;
  params?: ApiParam[];
  request?: ApiCodeSample;
  response?: ApiCodeSample;
}

export interface ApiErrorRow {
  code: string;
  meaning: string;
}

export interface ApiDocSection {
  id: string;
  title: string;
  icon: IconName;
  intro: string;
  bullets?: string[];
  code?: ApiCodeSample;
  endpoints?: ApiEndpoint[];
  errorRows?: ApiErrorRow[];
}

export interface ApiDocsContent {
  title: string;
  subtitle: string;
  baseUrlLabel: string;
  baseUrl: string;
  authLabel: string;
  authValue: string;
  rateLimitLabel: string;
  rateLimitValue: string;
  copyCode: string;
  codeCopied: string;
  paramNameHeader: string;
  paramTypeHeader: string;
  paramRequiredHeader: string;
  paramDescriptionHeader: string;
  requiredBadge: string;
  optionalBadge: string;
  binaryResponseNote: string;
  sections: ApiDocSection[];
}
