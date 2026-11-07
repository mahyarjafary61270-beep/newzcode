import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { prisma, userPublic, pubUser, serializeMessage } from './db.js';
import { config, STATIONS } from './config.js';
import { authRequired } from './auth.js';
import { onlineIds, voiceSnapshot, radioSnapshot } from './realtime.js';

export const apiRouter = Router();

apiRouter.use(authRequired);

// ── همه‌ی اطلاعات اولیه‌ی اپ با یک درخواست ──
apiRouter.get('/bootstrap', async (req, res) => {
  try {
    const [me, users, channels] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.sub } }),
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.channel.findMany({ orderBy: [{ type: 'asc' }, { position: 'asc' }] })
    ]);
    if (!me) return res.status(401).json({ error: 'کاربر پیدا نشد' });

    return res.json({
      me: pubUser(me),
      users: users.map(pubUser),
      channels: channels.map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position })),
      stations: STATIONS,
      livekitUrl: config.livekit.url,
      online: onlineIds(),
      voice: voiceSnapshot(),
      radio: radioSnapshot()
    });
  } catch (err) {
    console.error('[bootstrap]', err);
    return res.status(500).json({ error: 'یه خطایی پیش آمد' });
  }
});

// ── پیام‌های یک کانال (با صفحه‌بندی) ──
apiRouter.get('/channels/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const messages = await prisma.message.findMany({
      where: { channelId: id, ...(before && !isNaN(before) ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: userPublic },
        replyTo: { include: { user: { select: userPublic } } },
        reactions: { select: { emoji: true, userId: true } }
      }
    });
    return res.json({
      messages: messages.reverse().map(serializeMessage),
      hasMore: messages.length === limit
    });
  } catch (err) {
    console.error('[messages]', err);
    return res.status(500).json({ error: 'یه خطایی پیش آمد' });
  }
});

// ── ساخت کانال جدید ──
apiRouter.post('/channels', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 32);
    const type = req.body?.type === 'VOICE' ? 'VOICE' : 'TEXT';
    if (!name) return res.status(400).json({ error: 'اسم کانال لازمه' });

    const count = await prisma.channel.count({ where: { type } });
    const channel = await prisma.channel.create({ data: { name, type, position: count } });
    return res.json({ channel: { id: channel.id, name: channel.name, type: channel.type, position: channel.position } });
  } catch (err) {
    console.error('[createChannel]', err);
    return res.status(500).json({ error: 'یه خطایی پیش آمد' });
  }
});

// ── توکن LiveKit برای ورود به ویس ──
apiRouter.post('/voice/token', async (req, res) => {
  try {
    const channelId = String(req.body?.channelId || '');
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.type !== 'VOICE') {
      return res.status(400).json({ error: 'کانال ویس نامعتبره' });
    }
    if (!config.livekit.apiKey || !config.livekit.url) {
      return res.status(500).json({ error: 'LiveKit تنظیم نشده' });
    }

    const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
    const roomName = `voice-${channel.id}`;
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: me.id,
      name: me.displayName,
      metadata: JSON.stringify({ username: me.username, color: me.color }),
      ttl: 6 * 60 * 60
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    return res.json({ token: await at.toJwt(), url: config.livekit.url, room: roomName });
  } catch (err) {
    console.error('[voiceToken]', err);
    return res.status(500).json({ error: 'ساخت توکن ویس ناموفق بود' });
  }
});
