import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../store';
import { jobProcessor } from '../jobProcessor';
import { logger } from '../logger';
import { Job, JobStatus, UrlStatus } from '../types';

const createJobSchemaV2 = z.object({
  urls: z
    .array(z.string().trim().min(1, 'URL cannot be empty'))
    .min(1, 'At least one URL is required')
    .max(100, 'Maximum 100 URLs per job'),
});

const urlSchema = z.string().url();

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

interface InvalidUrlEntry {
  original: string;
  reason: string;
}

interface ValidationResult {
  validUrls: string[];
  invalidUrls: InvalidUrlEntry[];
}

function validateUrls(urls: string[]): ValidationResult {
  const validUrls: string[] = [];
  const invalidUrls: InvalidUrlEntry[] = [];

  for (const raw of urls) {
    const normalized = normalizeUrl(raw);
    const result = urlSchema.safeParse(normalized);

    if (result.success) {
      validUrls.push(result.data);
    } else {
      invalidUrls.push({
        original: raw,
        reason: 'Invalid URL format',
      });
    }
  }

  return { validUrls, invalidUrls };
}

function buildJob(validUrls: string[]): Job {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    status: 'pending' as JobStatus,
    createdAt: now,
    updatedAt: now,
    urls: validUrls.map((url) => ({
      id: uuidv4(),
      url,
      status: 'pending' as UrlStatus,
    })),
  };
}

export const jobsRouter = Router();

jobsRouter.post('/', (req: Request, res: Response): void => {
  const parsed = createJobSchemaV2.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { validUrls, invalidUrls } = validateUrls(parsed.data.urls);

  if (validUrls.length === 0) {
    res.status(400).json({
      error: 'No valid URLs provided',
      details: invalidUrls,
    });
    return;
  }

  const job = buildJob(validUrls);

  store.set(job);
  logger.info({ jobId: job.id, urlCount: validUrls.length }, 'Job created');
  jobProcessor.startJob(job.id);

  res.status(201).json({
    jobId: job.id,
    ...(invalidUrls.length > 0 && {
      warnings: { invalidUrls },
    }),
  });
});

jobsRouter.get('/', (_req: Request, res: Response): void => {
  const jobs = store.getAll();

  const summaries = jobs.map((job) => {
    const successCount = job.urls.filter((url) => url.status === 'success').length;
    const errorCount = job.urls.filter((url) => url.status === 'error').length;

    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      total: job.urls.length,
      successCount,
      errorCount,
    };
  });

  res.json(summaries);
});

jobsRouter.get('/:id', (req: Request, res: Response): void => {
  const job = store.get(req.params.id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});

jobsRouter.delete('/:id', (req: Request, res: Response): void => {
  const jobId = req.params.id;
  const job = store.get(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (['completed', 'cancelled', 'failed'].includes(job.status)) {
    res.status(409).json({ error: 'Job already in final state' });
    return;
  }

  jobProcessor.cancelJob(jobId);
  logger.info({ jobId }, 'Job cancelled');

  res.status(204).send();
});
