import React, { useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useStore, getStore } from '../store.js';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { voiceClient } from '../voice.js';
import { Avatar } from './bits.jsx';

const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });

function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'امروز';
  if (d.toDateString() === yesterday.toDateString()) return 'دیروز';
  return dayFmt.format(d);
}

// لینک‌ها رو به <a> تبدیل کن (بدون هیچ HTML خامی)
function linkify(text) {
  const parts = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={m.index} href={m[0]} target="_blank" rel="noopener noreferrer">
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Chat({ channel }) {
  const messages = useStore((s) => s.messages[channel.id]);
  const hasMore = useStore((s) => s.hasMore[channel.id]);
  const typingMap = useStore((s) => s.typing[channel.id]);
  const me = useStore((s) => s.me);
  const users = useStore((s) => s.users);
  const online = useStore((s) => s.online);
  const stations = useStore((s) => s.stations);
  const voiceStatus = useStore((s) => s.voice.status);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const stickBottom = useRef(true);
  const typingAt = useRef(0);

  // عضویت اتاق سوکت + لود پیام‌ها
  useEffect(() => {
    if (!channel) return undefined;
    getSocket()?.emit('channel:join', { channelId: channel.id });
    if (!useStore.getState().messages[channel.id]) {
      api(`/channels/${channel.id}/messages`)
        .then((d) => getStore().setMessages(channel.id, d.messages, d.hasMore))
        .catch(() => {});
    }
    return () => getSocket()?.emit('channel:leave', { channelId: channel.id });
  }, [channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // اتو اسکرول وقتی پایینیم
  useEffect(() => {
    const el = listRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  // پاکسازی تایپینگ‌های منقضی
  useEffect(() => {
    const t = setInterval(() => getStore().pruneTyping(), 3000);
    return () => clearInterval(t);
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const list = useStore.getState().messages[channel.id] || [];
    if (!list.length) return;
    const el = listRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const d = await api(`/channels/${channel.id}/messages?before=${encodeURIComponent(list[0].createdAt)}`);
      getStore().prependMessages(channel.id, d.messages, d.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight + el.scrollTop;
      });
    } catch {
      /* بی‌خیال */
    }
  };

  // ── کامند /mp ──
  const handleCommand = (value) => {
    if (!value.startsWith('/')) return false;
    if (!/^\/mp(\s|$)/i.test(value)) {
      getStore().toast('دستور ناشناخته — فعلاً /mp برای رادیو فعاله 📻');
      return true;
    }
    const arg = value.replace(/^\/mp\s*/i, '').trim();
    const v = useStore.getState().voice;

    if (!arg) {
      getStore().setPickerOpen(true);
      return true;
    }
    if (/^(off|stop|خاموش|قطع)$/i.test(arg)) {
      if (v.status === 'connected') voiceClient.stopRadio(v.channelId);
      else getStore().toast('اول به ویس وصل شو 🎧', 'error');
      return true;
    }
    const station = stations[Number(arg) - 1] || stations.find((x) => x.id === arg);
    if (station) {
      if (v.status === 'connected') voiceClient.playStation(v.channelId, station.id);
      else getStore().toast('اول به ویس وصل شو 🎧', 'error');
    } else {
      getStore().setPickerOpen(true);
    }
    return true;
  };

  const send = () => {
    const value = text.trim();
    if (!value) return;
    if (handleCommand(value)) {
      setText('');
      return;
    }
    getSocket()?.emit('message:send', { channelId: channel.id, content: value }, (res) => {
      if (res && !res.ok) getStore().toast(res.error || 'پیام ارسال نشد', 'error');
    });
    getSocket()?.emit('typing', { channelId: channel.id, isTyping: false });
    setText('');
  };

  const onInput = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - typingAt.current > 2000) {
      typingAt.current = now;
      getSocket()?.emit('typing', { channelId: channel.id, isTyping: true });
    }
  };

  const typingNames = Object.keys(typingMap || {})
    .filter((uid) => uid !== me?.id)
    .map((uid) => users.find((u) => u.id === uid)?.displayName)
    .filter(Boolean);

  // ردیف‌های پیام با گروه‌بندی و جداکننده روز
  const rows = [];
  let prev = null;
  for (const m of messages || []) {
    const d = new Date(m.createdAt);
    if (!prev || new Date(prev.createdAt).toDateString() !== d.toDateString()) {
      rows.push({ type: 'divider', key: `d-${d.toDateString()}`, label: dayLabel(d) });
    }
    const grouped = prev && prev.user.id === m.user.id && d - new Date(prev.createdAt) < 5 * 60 * 1000;
    rows.push({ type: 'message', key: m.id, m, grouped });
    prev = m;
  }

  return (
    <div className="chat">
      <header className="chat-head">
        <span className="chat-head-icon">#</span>
        <h2>{channel?.name}</h2>
        <span className="dim chat-head-sub">
          {(online.length || 0)} نفر آنلاین
        </span>
      </header>

      <div className="msg-list" ref={listRef} onScroll={onScroll}>
        {hasMore && (
          <button className="load-older" onClick={loadOlder}>
            پیام‌های قدیمی‌تر…
          </button>
        )}
        {!messages?.length && (
          <div className="msg-empty">
            <div className="msg-empty-emoji">💬</div>
            <p>اولین پیام رو بفرست و گپ رو گرم کن!</p>
          </div>
        )}
        {rows.map((row) =>
          row.type === 'divider' ? (
            <div key={row.key} className="day-divider">
              <span>{row.label}</span>
            </div>
          ) : (
            <MessageRow key={row.key} m={row.m} grouped={row.grouped} mine={row.m.user.id === me?.id} />
          )
        )}
      </div>

      <div className="chat-input-wrap">
        {(text.startsWith('/mp') || text === '/') && (
          <div className="cmd-hint glass">
            <span className="cmd-title">📻 رادیو:</span>
            {stations.map((st, i) => (
              <button key={st.id} onClick={() => setText(`/mp ${i + 1}`)} style={{ '--st': st.color }}>
                {st.emoji} {st.name}
              </button>
            ))}
            <button onClick={() => setText('/mp off')}>📴 خاموش</button>
          </div>
        )}
        {typingNames.length > 0 && (
          <div className="typing dim">
            {typingNames.join(' و ')} داره تایپ می‌کنه<span className="typing-dots">…</span>
          </div>
        )}
        <div className="chat-input">
          <textarea
            rows={1}
            value={text}
            onChange={onInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="پیامت رو بنویس… (/mp برای رادیو)"
          />
          <button className="send-btn" onClick={send} disabled={!text.trim()} title="ارسال">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ m, grouped, mine }) {
  const [hover, setHover] = useState(false);
  const d = new Date(m.createdAt);

  return (
    <div
      className={`msg ${grouped ? 'grouped' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="msg-avatar">
        {!grouped && <Avatar user={m.user} size={38} />}
      </div>
      <div className="msg-body">
        {!grouped && (
          <div className="msg-meta">
            <span className="msg-author" style={{ color: m.user.color }}>
              {m.user.displayName}
            </span>
            <span className="msg-time dim">{timeFmt.format(d)}</span>
          </div>
        )}
        <div className="msg-content">
          {m.content.split('\n').map((line, i) => (
            <div key={i}>{line ? linkify(line) : '\u00A0'}</div>
          ))}
        </div>
      </div>
      {mine && hover && (
        <button
          className="icon-btn msg-del"
          title="حذف پیام"
          onClick={() => getSocket()?.emit('message:delete', { messageId: m.id })}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
