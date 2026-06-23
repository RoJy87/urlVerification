import pino from 'pino';

function createLogger(): pino.Logger {
  const level = process.env.LOG_LEVEL ?? 'info';

  if (process.env.NODE_ENV === 'production') {
    return pino({ level });
  }

  try {
    return pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
      level,
    });
  } catch {
    return pino({ level });
  }
}

export const logger = createLogger();
