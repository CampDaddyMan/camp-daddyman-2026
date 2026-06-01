import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes';
import { startTranscodeWorker } from './workers/transcoder';
import { startScheduler } from './workers/scheduler';
import { seedJourneyDays } from './controllers/journey.controller';

// Prevent unhandled async rejections from crashing the process (Express 4 doesn't catch these)
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

const app = express();

// Trust Railway's load balancer so express-rate-limit reads the real client IP
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Lock CORS to your own domains — set ALLOWED_ORIGINS as a comma-separated list in Railway env vars
// e.g. ALLOWED_ORIGINS=https://campdaddyman.com,https://www.campdaddyman.com,https://admin.campdaddyman.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,https://campdaddyman.com,https://www.campdaddyman.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Camp DaddyMan API' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Camp DaddyMan API running on http://localhost:${PORT}`);
  // Start HLS transcoder worker (no-ops gracefully if ffmpeg or Redis not available)
  startTranscodeWorker().catch((err) => {
    console.error('[Transcoder] Failed to start worker:', err.message);
  });
  startScheduler();
  seedJourneyDays().catch((err) => {
    console.error('[Journey] Seed failed:', err.message);
  });
});

export default app;
