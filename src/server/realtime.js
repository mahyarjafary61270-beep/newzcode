import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma, userPublic, serializeMessage, groupReactions } from './db.js';
import { config, stationById } from './config.js';

// ── وضعیت در حافظه (برای ۵ نفر کاملاً کافیه و صفر فشار به دیتابیس میاره) ──
const online = new Map(); // userId -> Set<socketId>
const voice = new Map(); // userId -> { channelId, micMuted, deafened }
const radio = new Map(); // channelId -> { stationId, startedBy, startedAt }
const radioTimers = new Map(); // channelId -> Timeout
const flood = new Map(); // socketId -> { count, resetAt }
const pingAt = new Map(); // userId -> ts (ضد اسپم پینگ «بیاید تو ویس»)

const RADIO_IDLE_MS = 60 * 1000; // رادیو بعد از ۱ دقیقه خلوتی ویس قطع می‌شود

export const onlineIds = () => [...online.keys()];
export const voiceSnapshot = () => [...voice].map(([userId, v]) => ({ userId, ...v }));
export const radioSnapshot = () => Object.fromEntries(radio);

export function initRealtime(httpServer) {
  const io = new Server(httpServer, { maxHttpBufferSize: 1e6 });

  // احراز هویت سوکت با JWT
  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token || '', config.jwtSecret);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    io.emit('presence:update', { online: onlineIds() });
    socket.emit('voice:snapshot', { voice: voiceSnapshot(), radio: radioSnapshot() });

    // ═══════════ چت ═══════════
    // چت گروهی کوچیکه، پس همه‌ی رویدادهای پیام به همه می‌ره تا بج «نخونده»
    // و نوتیف برای کانال‌های غیرفعال هم کار کنه (سرور room نگه نمی‌داره).

    socket.on('message:send', async ({ channelId, content, replyToId } = {}, ack) => {
      try {
        if (typeof channelId !== 'string' || typeof content !== 'string') throw new Error('bad');
        const text = content.trim().slice(0, 4000);
        if (!text) throw new Error('bad');
        if (!allowFlood(socket.id)) return ack?.({ ok: false, error: 'آروم‌تر! 😅' });

        const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { type: true } });
        if (!channel || channel.type !== 'TEXT') throw new Error('bad');

        // اعتبارسنجی ریپلای — باید تو همین کانال باشه
        let validReplyTo = null;
        if (typeof replyToId === 'string' && replyToId) {
          const parent = await prisma.message.findUnique({
            where: { id: replyToId },
            select: { channelId: true }
          });
          if (parent && parent.channelId === channelId) validReplyTo = replyToId;
        }

        const message = await prisma.message.create({
          data: { channelId, userId, content: text, replyToId: validReplyTo },
          include: {
            user: { select: userPublic },
            replyTo: { include: { user: { select: userPublic } } },
            reactions: { select: { emoji: true, userId: true } }
          }
        });
        io.emit('message:new', { message: serializeMessage(message) });
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'پیام ارسال نشد' });
      }
    });

    socket.on('message:edit', async ({ messageId, content } = {}) => {
      try {
        if (typeof messageId !== 'string' || typeof content !== 'string') return;
        const text = content.trim().slice(0, 4000);
        if (!text || !allowFlood(socket.id)) return;
        const m = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, channelId: true } });
        if (!m || m.userId !== userId) return;
        const editedAt = new Date();
        await prisma.message.update({ where: { id: messageId }, data: { content: text, editedAt } });
        io.emit('message:edited', {
          channelId: m.channelId,
          messageId,
          content: text,
          editedAt: editedAt.toISOString()
        });
      } catch {
        /* بی‌خیال */
      }
    });

    socket.on('message:react', async ({ messageId, emoji, add } = {}) => {
      try {
        if (typeof messageId !== 'string' || typeof emoji !== 'string') return;
        const em = emoji.trim();
        if (!em || em.length > 16 || !allowFlood(socket.id)) return;
        const m = await prisma.message.findUnique({ where: { id: messageId }, select: { channelId: true } });
        if (!m) return;
        try {
          if (add) await prisma.messageReaction.create({ data: { messageId, userId, emoji: em } });
          else await prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji: em } });
        } catch {
          /* تکراری — بی‌خیال */
        }
        const rows = await prisma.messageReaction.findMany({ where: { messageId }, select: { emoji: true, userId: true } });
        io.emit('message:reactions', {
          channelId: m.channelId,
          messageId,
          reactions: groupReactions(rows)
        });
      } catch {
        /* بی‌خیال */
      }
    });

    // 📣 پینگ «بیاید تو ویس» — به همه جز خود فرستنده
    socket.on('voice:ping', async ({ channelId } = {}, ack) => {
      try {
        const v = voice.get(userId);
        if (!v || v.channelId !== channelId) return ack?.({ ok: false, error: 'اول خودت بیا تو ویس 🎧' });
        const now = Date.now();
        if (now - (pingAt.get(userId) || 0) < 30_000) return ack?.({ ok: false, error: 'یه کم صبر کن، تازه پینگ کردی 😅' });
        pingAt.set(userId, now);
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
        socket.broadcast.emit('voice:ping', { channelId, from: { id: userId, displayName: me?.displayName || 'یکی' } });
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'پینگ ارسال نشد' });
      }
    });

    socket.on('message:delete', async ({ messageId } = {}) => {
      try {
        if (typeof messageId !== 'string') return;
        const m = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, channelId: true } });
        if (!m || m.userId !== userId) return;
        await prisma.message.delete({ where: { id: messageId } });
        io.emit('message:deleted', { channelId: m.channelId, messageId });
      } catch {
        /* بی‌خیال */
      }
    });

    socket.on('typing', ({ channelId, isTyping } = {}) => {
      if (typeof channelId !== 'string') return;
      socket.broadcast.emit('typing:update', { channelId, userId, isTyping: !!isTyping });
    });

    // ═══════════ ویس ═══════════
    socket.on('voice:join', async ({ channelId, micMuted, deafened } = {}) => {
      if (typeof channelId !== 'string') return;
      // فقط کانال ویس واقعی قبول می‌شه — کلاینت نمی‌تونه وضعیت الکی بسازه
      const ch = await prisma.channel
        .findUnique({ where: { id: channelId }, select: { type: true } })
        .catch(() => null);
      // اگه موقع اعتبارسنجی سوکت قطع شده باشه، وضعیت ویس نساز (کاربر روحی)
      if (!ch || ch.type !== 'VOICE' || !socket.connected) return;

      const prev = voice.get(userId);
      voice.set(userId, { channelId, micMuted: !!micMuted, deafened: !!deafened });
      cancelRadioIdle(channelId);

      // اگه با عوض کردن کانال، ویس قبلی خالی شد، تایمر قطع رادیوش رو ست کن
      if (prev && prev.channelId !== channelId) {
        const stillOccupied = [...voice.values()].some((v) => v.channelId === prev.channelId);
        if (!stillOccupied) scheduleRadioIdle(prev.channelId);
      }

      io.emit('voice:update', { voice: voiceSnapshot() });
    });

    socket.on('voice:update', ({ micMuted, deafened } = {}) => {
      const v = voice.get(userId);
      if (!v) return;
      if (micMuted !== undefined) v.micMuted = !!micMuted;
      if (deafened !== undefined) v.deafened = !!deafened;
      io.emit('voice:update', { voice: voiceSnapshot() });
    });

    socket.on('voice:leave', () => leaveVoice(userId));

    // ═══════════ رادیو (/mp) ═══════════
    socket.on('radio:play', ({ channelId, stationId } = {}, ack) => {
      const v = voice.get(userId);
      if (!v || v.channelId !== channelId) return ack?.({ ok: false, error: 'اول به کانال ویس وصل شو 🎧' });
      const station = stationById(stationId);
      if (!station) return ack?.({ ok: false, error: 'ایستگاه رادیو نامعتبره' });

      radio.set(channelId, { stationId, startedBy: userId, startedAt: Date.now() });
      cancelRadioIdle(channelId);
      io.emit('radio:update', { channelId, state: radio.get(channelId) });
      ack?.({ ok: true });
    });

    socket.on('radio:stop', ({ channelId } = {}) => {
      const v = voice.get(userId);
      if (!v || v.channelId !== channelId) return;
      stopRadio(channelId);
    });

    socket.on('disconnect', () => {
      flood.delete(socket.id);
      const set = online.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) online.delete(userId);
      }
      if (!online.has(userId)) {
        leaveVoice(userId);
        io.emit('presence:update', { online: onlineIds() });
        // آخرین بازدید برای نمایش «آخرین آنلاین» ذخیره بشه
        prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => {});
      }
    });
  });

  // ── کمکی‌ها ──
  function leaveVoice(uid) {
    const v = voice.get(uid);
    if (!v) return;
    voice.delete(uid);
    io.emit('voice:update', { voice: voiceSnapshot() });
    scheduleRadioIdle(v.channelId);
  }

  function stopRadio(channelId, reason) {
    if (!radio.has(channelId)) return;
    radio.delete(channelId);
    cancelRadioIdle(channelId);
    io.emit('radio:update', { channelId, state: null, reason });
  }

  // اگه کسی تو ویس نمونده بود، بعد از ۱ دقیقه رادیو خودش قطع می‌شود
  function scheduleRadioIdle(channelId) {
    if (!radio.has(channelId) || radioTimers.has(channelId)) return;
    radioTimers.set(
      channelId,
      setTimeout(() => {
        radioTimers.delete(channelId);
        if (!radio.has(channelId)) return;
        const empty = ![...voice.values()].some((v) => v.channelId === channelId);
        if (empty) stopRadio(channelId, 'idle');
      }, RADIO_IDLE_MS)
    );
  }

  function cancelRadioIdle(channelId) {
    const t = radioTimers.get(channelId);
    if (t) {
      clearTimeout(t);
      radioTimers.delete(channelId);
    }
  }

  // ضد اسپم ساده: حداکثر ۱۵ پیام در ۱۰ ثانیه
  function allowFlood(socketId) {
    const now = Date.now();
    const f = flood.get(socketId);
    if (!f || now > f.resetAt) {
      flood.set(socketId, { count: 1, resetAt: now + 10_000 });
      return true;
    }
    f.count += 1;
    return f.count <= 15;
  }

  return io;
}
