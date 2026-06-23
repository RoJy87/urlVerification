import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { jobsRouter } from './routes/jobs';
import { logger } from './logger';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobsRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

export default app;
