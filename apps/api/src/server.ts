import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes';
import { startTranscodeWorker } from './workers/transcoder';

const app = express();

app.use(helmet());
function buildAllowedOrigins() {
  const origins = new Set(['http://localhost:3000', 'http://localhost:3001']);
  if (process.env.FRONTEND_URL) {
    try {
      const url = new URL(process.env.FRONTEND_URL);
      const base = `${url.protocol}//${url.hostname}`;
      origins.add(base);
      origins.add(`${url.protocol}//www.${url.hostname}`);
    } catch {
      origins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
    }
  }
  return origins;
}
const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
});

export default app;
