import React, { useEffect, useRef } from 'react';
import { Volume2, Radio, PhoneOff, MonitorUp } from 'lucide-react';
import { useStore, getStore } from '../store.js';
import { api } from '../api.js';
import { voiceClient } from '../voice.js';
import Sidebar from './Sidebar.jsx';
import Chat from './Chat.jsx';
import VoiceStage from './VoiceStage.jsx';
import StationPicker from './StationPicker.jsx';
import { Toasts, Logo } from './bits.jsx';

export default function Shell() {
  const loaded = useStore((s) => s.loaded);
  const channels = useStore((s) => s.channels);
  const activeChannelId = useStore((s) => s.activeChannelId);
  const bootstrapped = useRef(false);

  // بوت‌استرپ اولیه
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    api('/bootstrap')
      .then((d) => {
        getStore().setBootstrap(d);
        if (!getStore().activeChannelId) {
          const firstText = d.channels.find((c) => c.type === 'TEXT');
          if (firstText) getStore().setActiveChannel(firstText.id);
        }
      })
      .catch(() => {});
  }, []);

  if (!loaded) {
    return (
      <div className="boot">
        <Logo size={56} />
        <p>دارم وصل می‌شم…</p>
      </div>
    );
  }

  const active = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="app">
      <button className="mobile-menu glass" title="منو" onClick={() => getStore().setSidebarOpen(!getStore().sidebarOpen)}>
        ☰
      </button>
      <Sidebar />
      <main className="main">
        <VoiceMiniBar />
        {active?.type === 'VOICE' ? <VoiceStage channel={active} /> : active ? <Chat channel={active} /> : <div className="boot">کانالی نیست!</div>}
      </main>
      <StationPicker />
      <Toasts />
    </div>
  );
}

// ── نوار باریک ویس (وقتی تو چت هستی ولی به ویس وصلی) ──
function VoiceMiniBar() {
  const voice = useStore((s) => s.voice);
  const channels = useStore((s) => s.channels);
  const radioMap = useStore((s) => s.radioMap);
  const stations = useStore((s) => s.stations);
  const activeChannelId = useStore((s) => s.activeChannelId);
  const active = channels.find((c) => c.id === activeChannelId);
  if (voice.status === 'off' || active?.type !== 'TEXT') return null;

  const vc = channels.find((c) => c.id === voice.channelId);
  const r = radioMap[voice.channelId];
  const st = r ? stations.find((x) => x.id === r.stationId) : null;
  const sharing = voice.screens.some((x) => x.identity === useStore.getState().me?.id);

  return (
    <div className="voice-bar glass">
      <span className="vb-channel">
        <Volume2 size={14} />
        <b>{vc?.name}</b>
        <span className="dim">وصلی</span>
      </span>
      {st && (
        <span className="vb-radio" style={{ color: st.color }}>
          📻 {st.name}
        </span>
      )}
      <div className="vb-actions">
        <button className={`icon-btn ${sharing ? 'on' : ''}`} title="اشتراک صفحه" onClick={() => voiceClient.toggleScreen()}>
          <MonitorUp size={16} />
        </button>
        <button className="icon-btn" title="رادیو" onClick={() => getStore().setPickerOpen(true)}>
          <Radio size={16} />
        </button>
        <button className="icon-btn danger" title="قطع ویس" onClick={() => voiceClient.leave()}>
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
