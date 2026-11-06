import fs from 'node:fs';
import path from 'node:path';

// ── لودر سبک .env (مخصوص اجرای محلی) ──
// روی Railway متغیرها از داشبورد میان و این فایل وجود نداره — پس هیچ وابستگی اضافه‌ای لازم نیست.
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
} catch {
  /* بی‌خیال */
}

const env = process.env;

if (!env.JWT_ACCESS_SECRET) {
  console.warn('[mahyar-gap] ⚠ JWT_ACCESS_SECRET تنظیم نشده — کلید توسعه استفاده می‌شود');
}

export const config = {
  port: Number(env.PORT || 3000),
  nodeEnv: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  jwtSecret: env.JWT_ACCESS_SECRET || 'mahyar-gap-dev-secret-change-me',
  inviteCode: env.INVITE_CODE || null,
  livekit: {
    apiKey: env.LIVEKIT_API_KEY || '',
    apiSecret: env.LIVEKIT_API_SECRET || '',
    url: env.LIVEKIT_URL || ''
  }
};

// ── رادیوهای ۲۴ ساعته ──
export const STATIONS = [
  { id: 'popularfa', name: 'پاپ فارسی', emoji: '🇮🇷', url: 'https://stream.radiox.pro/listen/popularfa/radio.mp3', color: '#f472b6' },
  { id: 'shooti', name: 'شوطی', emoji: '🔥', url: 'https://stream.radiox.pro/listen/shooti/radio.mp3', color: '#fb923c' },
  { id: 'popular', name: 'پاپ جهانی', emoji: '🌍', url: 'https://stream.radiox.pro/listen/popular/radio.mp3', color: '#38bdf8' },
  { id: 'sad', name: 'غمگین', emoji: '💔', url: 'https://stream.radiox.pro/listen/sad/radio.mp3', color: '#a78bfa' }
];

export const stationById = (id) => STATIONS.find((s) => s.id === id) || null;
