import { Job } from './types';

export class JobStore {
  private jobs = new Map<string, Job>();

  set(job: Job): void {
    this.jobs.set(job.id, job);
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAll(): Job[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  update(id: string, updater: (job: Job) => Job): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, updater(job));
    }
  }
}

export const store = new JobStore();
