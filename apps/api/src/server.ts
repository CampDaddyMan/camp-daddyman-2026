import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes';
import { startTranscodeWorker } from './workers/transcoder';

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
app.use(cors({
  origin: true,
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
