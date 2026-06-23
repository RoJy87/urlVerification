import { JobStatus, UrlStatus } from './types';
import { store } from './store';
import { logger } from './logger';

class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;

    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

class JobProcessor {
  private processingJobs = new Map<string, AbortController>();

  constructor(private readonly concurrencyLimit = 5) {}

  startJob(jobId: string): void {
    const abortController = new AbortController();
    this.processingJobs.set(jobId, abortController);

    const job = store.get(jobId);
    if (!job) {
      this.processingJobs.delete(jobId);
      return;
    }

    const now = new Date().toISOString();

    store.update(jobId, (j) => ({
      ...j,
      status: 'in_progress' as JobStatus,
      updatedAt: now,
    }));

    this.processJob(jobId, abortController.signal)
      .catch((error: unknown) => {
        logger.error({ jobId, error }, 'Job processing failed unexpectedly');
        const currentJob = store.get(jobId);
        if (currentJob && currentJob.status !== 'cancelled') {
          const now = new Date().toISOString();
          store.update(jobId, (j) => ({
            ...j,
            status: 'failed' as JobStatus,
            updatedAt: now,
          }));
        }
      })
      .finally(() => {
        this.processingJobs.delete(jobId);
      });
  }

  private async processJob(jobId: string, signal: AbortSignal): Promise<void> {
    const job = store.get(jobId);
    if (!job) return;

    const pendingUrls = job.urls.filter((u) => u.status === 'pending');
    const semaphore = new Semaphore(this.concurrencyLimit);

    const tasks = pendingUrls.map((urlResult) =>
      this.processUrl(jobId, urlResult.id, urlResult.url, semaphore, signal)
    );

    await Promise.all(tasks);

    const finalJob = store.get(jobId);
    if (!finalJob || finalJob.status === 'cancelled') return;

    const allUrlsDone = finalJob.urls.every(
      (u) =>
        u.status === 'success' ||
        u.status === 'error' ||
        u.status === 'cancelled'
    );

    if (allUrlsDone) {
      const hasFailures = finalJob.urls.some((u) => u.status === 'error');
      const now = new Date().toISOString();
      store.update(jobId, (j) => ({
        ...j,
        status: (hasFailures ? 'failed' : 'completed') as JobStatus,
        updatedAt: now,
      }));
    }
  }

  private async processUrl(
    jobId: string,
    urlId: string,
    url: string,
    semaphore: Semaphore,
    signal: AbortSignal
  ): Promise<void> {
    if (signal.aborted) return;

    await semaphore.acquire();

    if (signal.aborted) {
      semaphore.release();
      return;
    }

    try {
      const currentJob = store.get(jobId);
      if (!currentJob || currentJob.status === 'cancelled') {
        return;
      }

      const startedAt = new Date().toISOString();

      store.update(jobId, (j) => ({
        ...j,
        urls: j.urls.map((u) =>
          u.id === urlId
            ? { ...u, status: 'in_progress' as UrlStatus, startedAt }
            : u
        ),
      }));

      const checkResult = await this.checkUrl(url, signal);

      const delayMs = Math.random() * 10000;
      await this.delay(delayMs, signal);

      if (signal.aborted) return;

      const finishedAt = new Date().toISOString();
      const startedMs = new Date(startedAt).getTime();
      const finishedMs = new Date(finishedAt).getTime();
      const durationMs = finishedMs - startedMs;

      store.update(jobId, (j) => ({
        ...j,
        urls: j.urls.map((u) =>
          u.id === urlId
            ? {
                ...u,
                status: checkResult.ok ? ('success' as UrlStatus) : ('error' as UrlStatus),
                httpStatus: checkResult.status,
                error: checkResult.error,
                finishedAt,
                durationMs,
              }
            : u
        ),
      }));
    } catch (error: unknown) {
      const finishedAt = new Date().toISOString();
      logger.error({ jobId, urlId, url, error }, 'URL processing failed');

      store.update(jobId, (j) => ({
        ...j,
        urls: j.urls.map((u) =>
          u.id === urlId
            ? {
                ...u,
                status: 'error' as UrlStatus,
                error: error instanceof Error ? error.message : 'Unknown error',
                finishedAt,
              }
            : u
        ),
      }));
    } finally {
      semaphore.release();
    }
  }

  private async checkUrl(
    url: string,
    signal: AbortSignal
  ): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal,
        redirect: 'follow',
      });
      return { ok: response.ok, status: response.status };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { ok: false, error: 'Cancelled' };
        }
        return { ok: false, error: error.message };
      }
      return { ok: false, error: 'Unknown error during request' };
    }
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const onAbort = (): void => {
        clearTimeout(timer);
        cleanup();
        resolve();
      };

      const cleanup = (): void => {
        signal.removeEventListener('abort', onAbort);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      signal.addEventListener('abort', onAbort);
    });
  }

  cancelJob(jobId: string): void {
    const controller = this.processingJobs.get(jobId);
    if (controller) {
      controller.abort();
    }

    const job = store.get(jobId);
    if (!job) return;

    const now = new Date().toISOString();

    store.update(jobId, (j) => ({
      ...j,
      status: 'cancelled' as JobStatus,
      updatedAt: now,
      urls: j.urls.map((u) =>
        u.status === 'pending' || u.status === 'in_progress'
          ? { ...u, status: 'cancelled' as UrlStatus, finishedAt: now }
          : u
      ),
    }));
  }
}

export const jobProcessor = new JobProcessor();
