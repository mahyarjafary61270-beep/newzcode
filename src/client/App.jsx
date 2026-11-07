import React, { useEffect } from 'react';
import { useStore, getStore } from './store.js';
import { api } from './api.js';
import { connectSocket, getSocket, disconnectSocket } from './socket.js';
import { voiceClient } from './voice.js';
import { playSound, notify, flashTitle, diffVoice, initAlerts, channelName } from './alerts.js';
import Login from './components/Login.jsx';
import Shell from './components/Shell.jsx';

export default function App() {
  const token = useStore((s) => s.token);

  // ── سوکت + همه‌ی رویدادهای زنده ──
  useEffect(() => {
    if (!token) return undefined;
    initAlerts();
    const socket = connectSocket(token);

    socket.on('connect', async () => {
      try {
        const d = await api('/bootstrap');
        getStore().setBootstrap(d);
        // بعد از ریکانکت، وضعیت ویس و چت رو دوباره اعلام کن
        if (voiceClient.room) {
          const v = getStore().voice;
          getSocket()?.emit('voice:join', { channelId: voiceClient.channelId, micMuted: v.micMuted, deafened: v.deafened });
        }
        const active = getStore().activeChannelId;
        if (active) getSocket()?.emit('channel:join', { channelId: active });
      } catch {
        /* bootstrap خطا رو خود api مدیریت می‌کنه */
      }
    });

    socket.on('presence:update', ({ online }) => getStore().setOnline(online));

    socket.on('message:new', ({ message }) => {
      const s = getStore();
      const wasInactive = s.activeChannelId !== message.channelId;
      s.addMessage(message);
      s.bumpUnread(message.channelId);

      // 🔔 صدا و اعلان — فقط پیام بقیه
      if (message.user.id !== s.me?.id && (wasInactive || document.visibilityState === 'hidden')) {
        playSound('message');
        if (document.visibilityState === 'hidden') {
          notify({
            title: `${message.user.displayName} — ${channelName(message.channelId)}`,
            body: message.content.slice(0, 140),
            tag: 'msg',
            channelId: message.channelId
          });
          flashTitle(`💬 ${message.user.displayName}`);
        }
      }
    });

    socket.on('message:edited', ({ channelId, messageId, content, editedAt }) =>
      getStore().editMessage(channelId, messageId, { content, editedAt })
    );

    socket.on('message:reactions', ({ channelId, messageId, reactions }) =>
      getStore().setMessageReactions(channelId, messageId, reactions)
    );

    socket.on('voice:ping', ({ channelId, from }) => {
      const s = getStore();
      playSound('ping');
      const chName = channelName(channelId);
      s.toast(`📣 ${from.displayName} می‌گه بیاید تو «${chName}»!`, 'ping');
      notify({ title: `📣 ${from.displayName} صدات می‌کنه!`, body: `برو تو ویس «${chName}»`, tag: 'ping', channelId });
    });

    socket.on('message:deleted', ({ channelId, messageId }) => getStore().deleteMessage(channelId, messageId));

    socket.on('typing:update', ({ channelId, userId, isTyping }) => getStore().setTyping(channelId, userId, isTyping));

    socket.on('voice:snapshot', ({ voice, radio }) => {
      getStore().setVoiceList(voice);
      for (const [cid, st] of Object.entries(radio)) getStore().setRadioMapKey(cid, st);
    });

    socket.on('voice:update', ({ voice }) => {
      getStore().setVoiceList(voice);
      diffVoice(voice); // 🔔 صدای ورود/خروج از ویس
    });

    socket.on('radio:update', ({ channelId, state, reason }) => {
      const s = getStore();
      const prev = s.radioMap[channelId];
      s.setRadioMapKey(channelId, state);

      // اعلان‌های کوچک و خوشایند
      if (state && !prev && voiceClient.inChannel(channelId) && state.startedBy !== s.me?.id) {
        playSound('radio');
        const st = s.stations.find((x) => x.id === state.stationId);
        const who = s.users.find((u) => u.id === state.startedBy);
        s.toast(`${who?.displayName || 'یکی'} رادیو «${st?.name || '?'}» رو روشن کرد 📻`);
      }
      if (!state && reason === 'idle' && voiceClient.channelId === channelId) {
        s.toast('رادیو قطع شد — ویس یک دقیقه خالی بود 📴');
      }
    });

    return () => disconnectSocket();
  }, [token]);

  // ── سینک پلیر رادیو با وضعیت ──
  const radioMap = useStore((s) => s.radioMap);
  const voiceStatus = useStore((s) => s.voice.status);
  const voiceChannelId = useStore((s) => s.voice.channelId);
  const deafened = useStore((s) => s.voice.deafened);
  const voiceList = useStore((s) => s.voiceList);

  useEffect(() => {
    voiceClient.syncRadio();
  }, [radioMap, voiceStatus, voiceChannelId, deafened, voiceList]);

  if (!token) return <Login />;
  return <Shell />;
}
