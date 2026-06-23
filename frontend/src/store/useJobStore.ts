import { create } from 'zustand';
import type { Job, JobSummary } from '../types';
import * as api from '../api/client';

const POLL_INTERVAL_MS = 3000;

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'failed'] as const);

interface JobStoreState {
  jobs: JobSummary[];
  activeJobId: string | null;
  activeJob: Job | null;
  loading: boolean;
  error: string | null;
  pollingId: ReturnType<typeof setInterval> | null;

  fetchJobs: () => Promise<void>;
  setActiveJob: (jobId: string | null) => void;
  createJob: (urls: string[]) => Promise<string>;
  cancelJob: (jobId: string) => Promise<void>;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export const useJobStore = create<JobStoreState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  activeJob: null,
  loading: false,
  error: null,
  pollingId: null,

  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const jobs = await api.fetchJobs();
      set({ jobs, loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
      set({ error: message, loading: false });
    }
  },

  setActiveJob: (jobId: string | null) => {
    const { pollingId } = get();
    if (pollingId !== null) {
      clearInterval(pollingId);
    }

    set({ activeJobId: jobId, activeJob: null, pollingId: null });

    if (jobId !== null) {
      api.fetchJobDetails(jobId)
        .then((job) => {
          if (get().activeJobId === jobId) {
            set({ activeJob: job });
          }
        })
        .catch((error: unknown) => {
          if (get().activeJobId === jobId) {
            const message = error instanceof Error ? error.message : 'Failed to fetch job details';
            set({ error: message });
          }
        });

      get().startPolling(jobId);
    }
  },

  createJob: async (urls: string[]) => {
    set({ error: null });
    const result = await api.createJob(urls);
    const { jobId } = result;

    await get().fetchJobs();
    get().setActiveJob(jobId);

    return jobId;
  },

  cancelJob: async (jobId: string) => {
    try {
      await api.cancelJob(jobId);
      const { activeJobId } = get();

      if (activeJobId === jobId) {
        const job = await api.fetchJobDetails(jobId);
        if (get().activeJobId === jobId) {
          set({ activeJob: job });
        }
      }

      await get().fetchJobs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to cancel job';
      set({ error: message });
    }
  },

  startPolling: (jobId: string) => {
    const { pollingId } = get();
    if (pollingId !== null) {
      clearInterval(pollingId);
    }

    const id = setInterval(async () => {
      try {
        if (get().activeJobId !== jobId) {
          clearInterval(id);
          return;
        }

        const job = await api.fetchJobDetails(jobId);

        if (get().activeJobId !== jobId) return;

        set({ activeJob: job });

        if (TERMINAL_STATUSES.has(job.status as typeof TERMINAL_STATUSES extends Set<infer T> ? T : never)) {
          clearInterval(id);
          set({ pollingId: null });
          get().fetchJobs();
        }
      } catch (error: unknown) {
        if (get().activeJobId === jobId) {
          const message = error instanceof Error ? error.message : 'Polling failed';
          set({ error: message });
          clearInterval(id);
          set({ pollingId: null });
        }
      }
    }, POLL_INTERVAL_MS);

    set({ pollingId: id });
  },

  stopPolling: () => {
    const { pollingId } = get();
    if (pollingId !== null) {
      clearInterval(pollingId);
      set({ pollingId: null });
    }
  },
}));
