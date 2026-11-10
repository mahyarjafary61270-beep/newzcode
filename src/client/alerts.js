import { getStore } from './store.js';

// ══════════ صداهای کوچک و بامزه (سینتز شده — بدون فایل!) ══════════
let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(c, { f0, f1, t = 0, dur = 0.12, type = 'triangle', vol = 0.1 }) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const now = c.currentTime + t;
  osc.type = type;
  osc.frequency.setValueAtTime(f0, now);
  if (f1) osc.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

const SOUNDS = {
  // پاپ ملایم پیام
  message: (c) => tone(c, { f0: 760, f1: 1240, dur: 0.09, vol: 0.09 }),
  // اومدن به ویس: دو نت بالا
  join: (c) => {
    tone(c, { f0: 523, dur: 0.1, vol: 0.1 });
    tone(c, { f0: 784, t: 0.09, dur: 0.15, vol: 0.1 });
  },
  // رفتن از ویس: دو نت پایین
  leave: (c) => {
    tone(c, { f0: 659, dur: 0.1, vol: 0.08 });
    tone(c, { f0: 440, t: 0.09, dur: 0.15, vol: 0.08 });
  },
  // شروع رادیو: آرپژ کوچولو
  radio: (c) => {
    tone(c, { f0: 659, dur: 0.08, type: 'sine', vol: 0.09 });
    tone(c, { f0: 880, t: 0.08, dur: 0.08, type: 'sine', vol: 0.09 });
    tone(c, { f0: 1175, t: 0.16, dur: 0.18, type: 'sine', vol: 0.09 });
  },
  // 📣 پینگ «بیاید تو ویس»: سه بوق محکم
  ping: (c) => {
    tone(c, { f0: 880, dur: 0.12, vol: 0.12 });
    tone(c, { f0: 880, t: 0.17, dur: 0.12, vol: 0.12 });
    tone(c, { f0: 1175, t: 0.34, dur: 0.26, vol: 0.12 });
  }
};

export function playSound(name) {
  const c = ctx();
  if (!c) return;
  try {
    SOUNDS[name]?.(c);
  } catch {
    /* بی‌خیال */
  }
}

// ══════════ نوتیفیکیشن مرورگر ══════════
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%232dd4bf'/%3E%3Cstop offset='.5' stop-color='%238b5cf6'/%3E%3Cstop offset='1' stop-color='%23f472b6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23g)' d='M32 6C17 6 5 16.5 5 29.5c0 7.4 4 14 10.3 18.3-.5 3.2-2 6.5-4.6 9.4-.8.9-.1 2.3 1.1 2.2 6.3-.5 11.4-2.7 15-5.3 1.7.3 3.4.4 5.2.4 15 0 27-10.5 27-23.5S47 6 32 6z'/%3E%3C/svg%3E";

export function requestNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* بی‌خیال */
  }
}

export function notify({ title, body, tag = 'mg', channelId }) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    const n = new Notification(title, { body, tag, icon: ICON, dir: 'rtl', lang: 'fa' });
    n.onclick = () => {
      window.focus();
      if (channelId) getStore().setActiveChannel(channelId);
      n.close();
    };
  } catch {
    /* بی‌خیال */
  }
}

// ══════════ فلش تیتر تب ══════════
const BASE_TITLE = document.title;
let flashTimer = null;

export function flashTitle(text) {
  if (document.visibilityState === 'visible') return;
  stopFlash();
  let on = false;
  flashTimer = setInterval(() => {
    document.title = on ? BASE_TITLE : `${text} — مهیار گپ`;
    on = !on;
  }, 1200);
}

export function stopFlash() {
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
    document.title = BASE_TITLE;
  }
}

let alertsInited = false;

export function initAlerts() {
  if (alertsInited) return; // با هر لاگین/لاگ‌اوت شنونده‌ی تکراری اضافه نشه
  alertsInited = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') stopFlash();
  });
}

// ══════════ تشخیص ورود/خروج به ویس (برای صدا و اعلان) ══════════
let prevVoice = {}; // userId -> channelId

export function diffVoice(voiceList) {
  const s = getStore();
  const myCh = s.voice.channelId;
  const meId = s.me?.id;

  for (const v of voiceList) {
    const prevCh = prevVoice[v.userId];
    if (v.userId === meId || !prevCh) continue;
    const u = s.users.find((x) => x.id === v.userId);
    const name = u?.displayName || 'یکی';

    if (prevCh !== v.channelId && v.channelId === myCh) {
      playSound('join');
      s.toast(`${name} اومد تو ویس 🎧`);
      notify({ title: `${name} اومد تو ویس`, body: 'برو سراغش!', tag: 'voice' });
    } else if (prevCh === myCh && v.channelId !== myCh) {
      playSound('leave');
    }
  }

  prevVoice = Object.fromEntries(voiceList.map((v) => [v.userId, v.channelId]));
}

// نام کانال برای نوتیف
export const channelName = (id) => getStore().channels.find((c) => c.id === id)?.name || 'چت';
