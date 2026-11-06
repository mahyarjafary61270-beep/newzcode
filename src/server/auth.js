import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma, pubUser } from './db.js';
import { config } from './config.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تلاش‌های زیادی انجام دادی، یه کم صبر کن' }
});

const COLORS = ['#8b5cf6', '#f472b6', '#2dd4bf', '#fb923c', '#38bdf8', '#a3e635', '#f43f5e', '#eab308'];
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const sign = (user) => jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '30d' });

// ── میدل‌ور احراز هویت ──
export function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'وارد نشدی' });
    req.user = jwt.verify(token, config.jwtSecret); // { sub: userId }
    next();
  } catch {
    return res.status(401).json({ error: 'نشستت منقضی شده' });
  }
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const body = req.body || {};
    const username = String(body.username || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').trim().slice(0, 32) || String(body.username || '').trim();
    const password = String(body.password || '');
    const inviteCode = String(body.inviteCode || '').trim();

    if (config.inviteCode && inviteCode !== config.inviteCode) {
      return res.status(403).json({ error: 'کد دعوت اشتباهه' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'نام کاربری: ۳ تا ۲۰ حرف انگلیسی، عدد یا _' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور حداقل ۶ کاراکتره' });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ error: 'این نام کاربری قبلاً گرفته شده' });

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      }
    });

    return res.json({ token: sign(user), user: pubUser(user) });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'یه خطایی پیش آمد' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'نام کاربری یا رمز اشتباهه' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
    return res.json({ token: sign(user), user: pubUser(user) });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'یه خطایی پیش آمد' });
  }
});
