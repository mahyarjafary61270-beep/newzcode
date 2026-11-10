import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { prisma } from './db.js';
import { initRealtime } from './realtime.js';
import { authRouter, authLimiter } from './auth.js';
import { apiRouter } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '256kb' }));

// ── API ──
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'mahyar-gap', uptime: process.uptime() }));
app.use('/api/auth', authLimiter, authRouter);
app.use('/api', apiRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

// ── فرانت‌اند (بیلد Vite) ──
const dist = path.resolve(__dirname, '../../dist');
app.use(express.static(dist, { maxAge: config.isProd ? '1d' : 0, index: false }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(dist, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'خطای داخلی سرور' });
});

// ── کانال‌های پیش‌فرض (فقط بار اول) ──
const DEFAULT_CHANNELS = [
  { name: 'گپ عمومی', type: 'TEXT', position: 0 },
  { name: 'موزیک', type: 'TEXT', position: 1 },
  { name: 'گیمینگ', type: 'TEXT', position: 2 },
  { name: 'لانژ عمومی', type: 'VOICE', position: 0 },
  { name: 'گیمینگ', type: 'VOICE', position: 1 },
  { name: 'موزیک و رادیو', type: 'VOICE', position: 2 }
];

async function seedChannels() {
  const count = await prisma.channel.count();
  if (count === 0) {
    await prisma.channel.createMany({ data: DEFAULT_CHANNELS });
    console.log('[mahyar-gap] ✅ کانال‌های پیش‌فرض ساخته شدند');
  }
}

async function main() {
  await prisma.$connect();
  await seedChannels();
  initRealtime(server);
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[mahyar-gap] 🚀 روی پورت ${config.port} اجرا شد (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[mahyar-gap] 💥 استارت ناموفق:', err);
  process.exit(1);
});

// خاموشی تمیز
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log('[mahyar-gap] خاموش می‌شود…');
    server.close();
    // اگه دیتابیس در دسترس نبود، خاموشی نباید با خطای دیگه‌ای گیر کنه
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
}
