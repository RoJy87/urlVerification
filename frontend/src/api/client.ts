import type { Job, JobSummary, ApiError } from '../types';

const BASE_URL = '/api';

class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let errorBody: ApiError | null = null;
    try {
      errorBody = (await response.json()) as ApiError;
    } catch {
      // response body is not JSON
    }
    throw new ApiClientError(
      errorBody?.error ?? `Request failed with status ${response.status}`,
      response.status,
      errorBody?.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json();
  return data as T;
}

export function fetchJobs(): Promise<JobSummary[]> {
  return request<JobSummary[]>('/jobs');
}

export function fetchJobDetails(jobId: string): Promise<Job> {
  return request<Job>(`/jobs/${jobId}`);
}

export function createJob(urls: string[]): Promise<{ jobId: string }> {
  return request<{ jobId: string }>('/jobs', {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export function cancelJob(jobId: string): Promise<void> {
  return request<void>(`/jobs/${jobId}`, {
    method: 'DELETE',
  });
}
