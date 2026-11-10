import React, { useState } from 'react';
import { Hash, Volume2, Mic, MicOff, Headphones, VolumeX, PhoneOff, Plus, LogOut } from 'lucide-react';
import { useStore, getStore } from '../store.js';
import { api } from '../api.js';
import { disconnectSocket } from '../socket.js';
import { voiceClient } from '../voice.js';
import { Avatar, Logo } from './bits.jsx';

export default function Sidebar() {
  const channels = useStore((s) => s.channels);
  const activeChannelId = useStore((s) => s.activeChannelId);
  const voiceList = useStore((s) => s.voiceList);
  const radioMap = useStore((s) => s.radioMap);
  const stations = useStore((s) => s.stations);
  const users = useStore((s) => s.users);
  const unread = useStore((s) => s.unread);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const [modal, setModal] = useState(null);

  const textCh = channels.filter((c) => c.type === 'TEXT');
  const voiceCh = channels.filter((c) => c.type === 'VOICE');

  const pick = (id) => {
    getStore().setActiveChannel(id);
    getStore().clearUnread(id);
    getStore().setSidebarOpen(false);
  };

  const logout = () => {
    if (!window.confirm('از حسابت خارج میشی؟')) return;
    voiceClient.leave().catch(() => {});
    disconnectSocket();
    getStore().logout();
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand">
        <Logo size={34} />
        <div className="brand-text">
          <h1>مهیار گپ</h1>
          <span className="dim">gap for the boys</span>
        </div>
        <button className="icon-btn brand-out" title="خروج از حساب" onClick={logout}>
          <LogOut size={16} />
        </button>
      </div>

      <div className="channels">
        <div className="section-head">
          <span>کانال‌های متنی</span>
          <button className="icon-btn" title="کانال متنی جدید" onClick={() => setModal('TEXT')}>
            <Plus size={15} />
          </button>
        </div>
        {textCh.map((c) => (
          <button key={c.id} className={`ch-item ${activeChannelId === c.id ? 'on' : ''}`} onClick={() => pick(c.id)}>
            <Hash size={16} className="ch-icon" />
            <span className="ch-name">{c.name}</span>
            {unread[c.id] > 0 && <span className="badge">{unread[c.id] > 9 ? '۹+' : unread[c.id]}</span>}
          </button>
        ))}

        <div className="section-head">
          <span>کانال‌های ویس</span>
          <button className="icon-btn" title="کانال ویس جدید" onClick={() => setModal('VOICE')}>
            <Plus size={15} />
          </button>
        </div>
        {voiceCh.map((c) => {
          const members = voiceList.filter((v) => v.channelId === c.id);
          const r = radioMap[c.id];
          const st = r ? stations.find((x) => x.id === r.stationId) : null;
          return (
            <div key={c.id} className="voice-group">
              <button className={`ch-item ${activeChannelId === c.id ? 'on' : ''}`} onClick={() => pick(c.id)}>
                <Volume2 size={16} className="ch-icon" />
                <span className="ch-name">{c.name}</span>
                {st && (
                  <span className="radio-badge" style={{ color: st.color }} title={`رادیو ${st.name}`}>
                    📻
                  </span>
                )}
                {members.length > 0 && <span className="ch-count">{members.length}</span>}
              </button>
              {members.map((m) => {
                const u = users.find((x) => x.id === m.userId);
                return (
                  <div key={m.userId} className="voice-member">
                    <Avatar user={u} size={22} />
                    <span className="vm-name">{u?.displayName || '?'}</span>
                    {m.micMuted && <MicOff size={12} className="dim" />}
                    {m.deafened && <VolumeX size={12} className="dim" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <UserPanel />
      {modal && <ChannelModal type={modal} onClose={() => setModal(null)} />}
    </aside>
  );
}

// ── پنل کاربر پایین سایدبار ──
function UserPanel() {
  const me = useStore((s) => s.me);
  const voice = useStore((s) => s.voice);
  const channels = useStore((s) => s.channels);
  const online = useStore((s) => s.online);
  const vc = channels.find((c) => c.id === voice.channelId);
  const iAmOnline = online.includes(me?.id);

  return (
    <div className="user-panel">
      <Avatar user={me} size={34} online={voice.status !== 'off' ? true : iAmOnline} />
      <div className="up-info">
        <div className="up-name">{me?.displayName}</div>
        <div className="up-status dim">{vc ? `🎙 ${vc.name}` : voice.status === 'connecting' ? 'در حال اتصال…' : 'آنلاین'}</div>
      </div>
      <button
        className={`icon-btn ${voice.micMuted ? 'danger' : ''}`}
        title={voice.micMuted ? 'روشن کردن میکروفون' : 'بی‌صدا کردن میکروفون'}
        onClick={() => voiceClient.toggleMic()}
      >
        {voice.micMuted ? <MicOff size={17} /> : <Mic size={17} />}
      </button>
      <button
        className={`icon-btn ${voice.deafened ? 'danger' : ''}`}
        title={voice.deafened ? 'روشن کردن صدا' : 'بی‌صدا کردن همه'}
        onClick={() => voiceClient.toggleDeafen()}
      >
        {voice.deafened ? <VolumeX size={17} /> : <Headphones size={17} />}
      </button>
      {voice.status !== 'off' && (
        <button className="icon-btn danger" title="قطع ویس" onClick={() => voiceClient.leave()}>
          <PhoneOff size={17} />
        </button>
      )}
    </div>
  );
}

// ── مودال ساخت کانال ──
function ChannelModal({ type, onClose }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const d = await api('/channels', { method: 'POST', body: { name, type } });
      getStore().addChannel(d.channel);
      getStore().setActiveChannel(d.channel.id);
      onClose();
    } catch (err) {
      getStore().toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal glass" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{type === 'VOICE' ? '🔊 کانال ویس جدید' : '# کانال متنی جدید'}</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder={type === 'VOICE' ? 'مثلاً: لانژ شبانه' : 'مثلاً: میم‌ها'}
          maxLength={32}
        />
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            بی‌خیال
          </button>
          <button className="btn btn-primary" onClick={create} disabled={busy}>
            ساخت کانال
          </button>
        </div>
      </div>
    </div>
  );
}
