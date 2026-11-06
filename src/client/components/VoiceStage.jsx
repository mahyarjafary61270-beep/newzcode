import React, { useEffect, useRef, useState } from 'react';
import { MonitorUp, Radio, PhoneOff, MicOff, Square, Play, Signal } from 'lucide-react';
import { useStore, getStore } from '../store.js';
import { voiceClient } from '../voice.js';
import { Avatar, Equalizer } from './bits.jsx';

export default function VoiceStage({ channel }) {
  const voice = useStore((s) => s.voice);
  const radioMap = useStore((s) => s.radioMap);
  const stations = useStore((s) => s.stations);
  const voiceList = useStore((s) => s.voiceList);
  const users = useStore((s) => s.users);

  const connected = voice.status === 'connected' && voice.channelId === channel.id;
  const radio = radioMap[channel.id] || null;
  const station = radio ? stations.find((x) => x.id === radio.stationId) : null;
  const members = voiceList.filter((v) => v.channelId === channel.id);

  // ── صفحه‌ی اتصال (قبل از ورود به ویس) ──
  if (!connected) {
    return (
      <div className="voice-join">
        <div className="voice-join-card glass">
          <div className="voice-join-icon">🎧</div>
          <h2>{channel?.name}</h2>
          <div className="voice-preview">
            {members.map((m) => {
              const u = users.find((x) => x.id === m.userId);
              return <Avatar key={m.userId} user={u} size={42} online />;
            })}
            {members.length === 0 && <p className="dim">هنوز کسی تو این ویس نیست — اولین نفر باش!</p>}
          </div>
          {station && (
            <div className="voice-radio-hint" style={{ '--st': station.color }}>
              📻 رادیو {station.name} الان داره پخش می‌شه
            </div>
          )}
          {voice.status === 'connected' && voice.channelId !== channel.id && (
            <p className="dim switch-hint">الان تو یه ویس دیگه‌ای — با اتصال، کانالت عوض می‌شه</p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={voice.joinMuted}
              onChange={(e) => getStore().setVoiceState({ joinMuted: e.target.checked })}
            />
            ورود بی‌صدا
          </label>
          <button
            className="btn btn-primary btn-lg"
            disabled={voice.status === 'connecting'}
            onClick={() => voiceClient.join(channel, { muted: voice.joinMuted })}
          >
            {voice.status === 'connecting' ? 'در حال اتصال…' : 'اتصال به ویس'}
          </button>
        </div>
      </div>
    );
  }

  // ── استیج ویس ──
  const meId = useStore.getState().me?.id;
  const sharing = voice.screens.some((x) => x.identity === meId);

  return (
    <div className="voice-stage">
      {voice.screens.length > 0 && <ScreensArea />}
      <div className="tiles">
        {voice.participants.map((p) => (
          <ParticipantTile key={p.identity} p={p} />
        ))}
      </div>
      {station && <RadioCard channelId={channel.id} station={station} startedBy={radio.startedBy} />}
      <div className="voice-dock glass">
        <button className={`dock-btn ${sharing ? 'on' : ''}`} onClick={() => voiceClient.toggleScreen()}>
          <MonitorUp size={18} />
          <span>{sharing ? 'قطع اشتراک' : 'اشتراک صفحه'}</span>
        </button>
        <button className={`dock-btn ${radio ? 'on' : ''}`} onClick={() => getStore().setPickerOpen(true)}>
          <Radio size={18} />
          <span>رادیو</span>
        </button>
        <button className="dock-btn danger" onClick={() => voiceClient.leave()}>
          <PhoneOff size={18} />
          <span>خروج</span>
        </button>
      </div>
    </div>
  );
}

// ── کاشی هر نفر ──
function ParticipantTile({ p }) {
  const [volOpen, setVolOpen] = useState(false);
  const vol = useStore((s) => s.voice.volumes)[p.identity] ?? 1;

  return (
    <div
      className={`tile ${p.speaking ? 'speaking' : ''} ${p.isMe ? 'me' : ''}`}
      onClick={() => !p.isMe && setVolOpen((v) => !v)}
      title={p.isMe ? 'این تویی!' : 'کلیک: تنظیم بلندی صدا'}
    >
      {volOpen && !p.isMe && (
        <div className="vol-pop glass" onClick={(e) => e.stopPropagation()}>
          <div className="vol-head">صدای {p.name}</div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(vol * 100)}
            onChange={(e) => voiceClient.setVolume(p.identity, Number(e.target.value) / 100)}
          />
          <span className="vol-num">{Math.round(vol * 100)}٪</span>
        </div>
      )}
      <div className="avatar-wrap">
        <Avatar color={p.color} name={p.name} size={64} />
        <span className={`qdot q-${p.quality}`} title={`کیفیت ارتباط: ${p.quality}`}>
          <Signal size={9} />
        </span>
      </div>
      <div className="tile-name">
        <span className="tile-name-text">{p.name}</span>
        {p.isMe && <span className="you">(تو)</span>}
      </div>
      {p.micMuted && (
        <span className="tile-mic" title="میکروفون خاموش">
          <MicOff size={13} />
        </span>
      )}
    </div>
  );
}

// ── نمایش اشتراک‌های صفحه ──
function ScreensArea() {
  const screens = useStore((s) => s.voice.screens);
  const users = useStore((s) => s.users);
  const [idx, setIdx] = useState(0);
  const active = screens[Math.min(idx, screens.length - 1)];
  if (!active) return null;
  const owner = users.find((u) => u.id === active.identity);

  return (
    <div className="screens-area">
      <ScreenVideo track={active.track} />
      {screens.length > 1 && (
        <div className="screens-tabs">
          {screens.map((s, i) => {
            const u = users.find((x) => x.id === s.identity);
            return (
              <button key={s.identity} className={`stab ${i === Math.min(idx, screens.length - 1) ? 'on' : ''}`} onClick={() => setIdx(i)}>
                📺 {u?.displayName || 'اسکرین'}
              </button>
            );
          })}
        </div>
      )}
      <div className="screens-owner">{owner?.displayName || 'اسکرین'} داره صفحه‌ش رو نشون می‌ده 📺</div>
    </div>
  );
}

function ScreenVideo({ track }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return undefined;
    track.attach(el);
    return () => {
      try {
        track.detach(el);
      } catch {
        /* بی‌خیال */
      }
    };
  }, [track]);
  return <video ref={ref} className="screen-video" autoPlay playsInline />;
}

// ── کارت رادیو داخل ویس ──
function RadioCard({ channelId, station, startedBy }) {
  const radio = useStore((s) => s.radio);
  const users = useStore((s) => s.users);
  const who = users.find((u) => u.id === startedBy);

  return (
    <div className="radio-card glass" style={{ '--st': station.color }}>
      <div className="radio-visual">
        {radio.playing ? <Equalizer color={station.color} bars={6} height={26} /> : <span className="radio-emoji">{station.emoji}</span>}
      </div>
      <div className="radio-info">
        <div className="radio-name">📻 رادیو {station.name}</div>
        <div className="radio-sub dim">روشن‌کننده: {who?.displayName || '—'}</div>
        <input
          className="radio-vol"
          type="range"
          min="0"
          max="100"
          value={Math.round(radio.volume * 100)}
          title={`بلندی رادیو: ${Math.round(radio.volume * 100)}٪`}
          onChange={(e) => voiceClient.setRadioVolume(Number(e.target.value) / 100)}
        />
      </div>
      {radio.needsGesture && (
        <button className="btn btn-sm btn-primary" onClick={() => voiceClient.resumeRadio()} title="مرورگر اجازه‌ی پخش خودکار نداده">
          <Play size={14} /> پخش
        </button>
      )}
      <button className="icon-btn danger" title="خاموش کردن رادیو" onClick={() => voiceClient.stopRadio(channelId)}>
        <Square size={15} />
      </button>
    </div>
  );
}
