export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export type UrlStatus = 'pending' | 'in_progress' | 'success' | 'error' | 'cancelled';

export interface UrlResult {
  id: string;
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface Job {
  id: string;
  status: JobStatus;
  urls: UrlResult[];
  createdAt: string;
  updatedAt: string;
}

export interface JobSummary {
  id: string;
  status: JobStatus;
  createdAt: string;
  total: number;
  successCount: number;
  errorCount: number;
}

export interface CreateJobRequest {
  urls: string[];
}

export interface CreateJobResponse {
  jobId: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
