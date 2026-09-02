import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { adminRouter } from './routes/admin.js';
import { cmsRouter } from './routes/cms.js';
import { filesRouter } from './routes/files.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: [config.websiteUrl, config.adminUrl],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

app.use(
  rateLimit({
    windowMs: config.rateWindowMs,
    limit: config.rateMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'creator-studio-api',
  })
);

/*
  IMPORTANT ROUTE ORDER

  Auth first
  Admin second
  Then Files / CMS / User routes

  Admin must be ABOVE userRouter,
  otherwise userRouter auth middleware
  catches /api/admin/login.
*/

app.use('/api/auth', authRouter);

app.use('/api/admin', adminRouter);

app.use('/api', filesRouter);

app.use('/api', cmsRouter);

app.use('/api', userRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.issues,
    });
  }

  if (err?.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate record',
    });
  }

  res.status(500).json({
    error: err?.message || 'Internal server error',
  });
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
