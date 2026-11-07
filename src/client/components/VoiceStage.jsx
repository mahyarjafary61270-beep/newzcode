import React, { useEffect, useRef, useState } from 'react';
import { MonitorUp, Radio, PhoneOff, MicOff, Square, Play, Signal, Maximize2, Minimize2, BellRing } from 'lucide-react';
import { useStore, getStore } from '../store.js';
import { getSocket } from '../socket.js';
import { voiceClient } from '../voice.js';
import { Avatar, Equalizer, VolumeSlider } from './bits.jsx';

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
        <button
          className="dock-btn ping"
          title="به همه بگو بیاد تو ویس"
          onClick={() => {
            getSocket()?.emit('voice:ping', { channelId: channel.id }, (res) => {
              if (res && !res.ok) getStore().toast(res.error || 'پینگ ارسال نشد', 'error');
              else getStore().toast('پینگ فرستاده شد 📣');
            });
          }}
        >
          <BellRing size={18} />
          <span>صدام کن!</span>
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
  const tileRef = useRef(null);
  const vol = useStore((s) => s.voice.volumes)[p.identity] ?? 1;

  // بستن پاپ‌اور با کلیک بیرون از کاشی
  useEffect(() => {
    if (!volOpen) return undefined;
    const close = (e) => {
      if (e.target.closest?.('.tile') !== tileRef.current) setVolOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [volOpen]);

  return (
    <div
      ref={tileRef}
      className={`tile ${p.speaking ? 'speaking' : ''} ${p.isMe ? 'me' : ''}`}
      onClick={() => !p.isMe && setVolOpen((v) => !v)}
      title={p.isMe ? 'این تویی!' : 'کلیک: تنظیم بلندی صدا'}
    >
      {volOpen && !p.isMe && (
        <div className="vol-pop glass" onClick={(e) => e.stopPropagation()}>
          <div className="vol-pop-head">
            <Avatar color={p.color} name={p.name} size={30} />
            <div className="vol-pop-id">
              <b>{p.name}</b>
              <span>بلندی صدای این نفر</span>
            </div>
          </div>
          <VolumeSlider
            value={vol}
            onChange={(v) => voiceClient.setVolume(p.identity, v)}
            onMuteToggle={() => voiceClient.toggleVolumeMute(p.identity)}
            color={p.color}
            label={`صدای ${p.name}`}
          />
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
  const [isFull, setIsFull] = useState(false);
  const wrapRef = useRef(null);
  const active = screens[Math.min(idx, screens.length - 1)];

  useEffect(() => {
    const onChange = () => setIsFull(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  if (!active) return null;
  const owner = users.find((u) => u.id === active.identity);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        Promise.resolve(req.call(el)).catch(() => {});
      } catch {
        /* بی‌خیال */
      }
    }
  };

  return (
    <div ref={wrapRef} className="screens-area">
      <ScreenVideo track={active.track} onDoubleClick={toggleFullscreen} />
      <button
        className="screens-fs icon-btn"
        onClick={toggleFullscreen}
        title={isFull ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه (یا دوبار کلیک روی ویدیو)'}
      >
        {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
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

function ScreenVideo({ track, onDoubleClick }) {
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
  return <video ref={ref} className="screen-video" autoPlay playsInline onDoubleClick={onDoubleClick} />;
}

// ── کارت رادیو داخل ویس ──
function RadioCard({ channelId, station, startedBy }) {
  const radio = useStore((s) => s.radio);
  const users = useStore((s) => s.users);
  const who = users.find((u) => u.id === startedBy);

  return (
    <div className={`radio-card glass ${radio.playing ? 'playing' : ''}`} style={{ '--st': station.color }}>
      <div className="radio-visual">
        {radio.playing ? <Equalizer color={station.color} bars={6} height={26} /> : <span className="radio-emoji">{station.emoji}</span>}
      </div>
      <div className="radio-info">
        <div className="radio-name">📻 رادیو {station.name}</div>
        <div className="radio-sub dim">روشن‌کننده: {who?.displayName || '—'}</div>
        <VolumeSlider
          value={radio.volume}
          onChange={(v) => voiceClient.setRadioVolume(v)}
          onMuteToggle={() => voiceClient.toggleRadioMute()}
          color={station.color}
          label="بلندی رادیو"
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
