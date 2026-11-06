import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { api } from './api.js';
import { getSocket } from './socket.js';
import { getStore } from './store.js';

// ── کنترلر ویس + پلیر رادیو (سینگلتون سراسری) ──
class VoiceClient {
  constructor() {
    this.room = null;
    this.channelId = null;
    this.leaving = false;
    this.audio = new Audio();
    this.audio.preload = 'none';
  }

  inChannel(channelId) {
    return this.room !== null && this.channelId === channelId;
  }

  // ══════════ اتصال ویس ══════════
  async join(channel, { muted = false } = {}) {
    if (this.room) await this.leave(true);
    const s = getStore();
    s.setVoiceState({ status: 'connecting', channelId: channel.id, micMuted: muted });

    try {
      const { token, url } = await api('/voice/token', { method: 'POST', body: { channelId: channel.id } });

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.channelId = channel.id;
      this.wire(room);

      try {
        await room.prepareConnection(url);
      } catch {
        /* مهم نیست */
      }
      await room.connect(url, token);
      try {
        await room.startAudio();
      } catch {
        /* مرورگر بعداً با کلیک بعدی راحت می‌شود */
      }

      if (!muted) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          s.setVoiceState({ micMuted: true });
          s.toast('به میکروفون دسترسی نداریم — بی‌صدا وصل شدی 🎙️');
        }
      }

      s.setVoiceState({ status: 'connected' });
      getSocket()?.emit('voice:join', {
        channelId: channel.id,
        micMuted: getStore().voice.micMuted,
        deafened: getStore().voice.deafened
      });
      this.refreshParticipants();
      this.applyVolumes();
      this.syncRadio();
    } catch (err) {
      console.error('[voice] join failed:', err);
      this.cleanupRoom();
      getStore().setVoiceState({ status: 'off', channelId: null, participants: [], screens: [] });
      getStore().toast('اتصال به ویس ناموفق بود 😔', 'error');
    }
  }

  async leave(silent = false) {
    this.leaving = true;
    const room = this.room;
    this.room = null;
    this.channelId = null;
    if (room && room.state !== ConnectionState.Disconnected) {
      try {
        await room.disconnect();
      } catch {
        /* بی‌خیال */
      }
    }
    try {
      room?.removeAllListeners();
    } catch {
      /* بی‌خیال */
    }
    this.leaving = false;
    if (!silent) getSocket()?.emit('voice:leave');
    getStore().setVoiceState({ status: 'off', channelId: null, participants: [], screens: [] });
    this.syncRadio();
  }

  cleanupRoom() {
    try {
      this.room?.removeAllListeners();
    } catch {
      /* بی‌خیال */
    }
    this.room = null;
    this.channelId = null;
  }

  wire(room) {
    room.on(RoomEvent.ParticipantsChanged, () => this.refreshParticipants());
    room.on(RoomEvent.TrackSubscribed, () => {
      this.refreshParticipants();
      this.applyVolumes();
    });
    room.on(RoomEvent.TrackUnsubscribed, () => this.refreshParticipants());
    room.on(RoomEvent.TrackPublished, () => this.refreshParticipants());
    room.on(RoomEvent.TrackUnpublished, () => this.refreshParticipants());
    room.on(RoomEvent.TrackMuted, () => this.refreshParticipants());
    room.on(RoomEvent.TrackUnmuted, () => this.refreshParticipants());
    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      this.refreshParticipants();
      if (pub.source === Track.Source.ScreenShare) getStore().toast('اسکرین‌شرت شروع شد 📺');
    });
    room.on(RoomEvent.LocalTrackUnpublished, () => this.refreshParticipants());
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = new Set(speakers.map((p) => p.identity));
      this.refreshParticipants(ids);
    });
    room.on(RoomEvent.ConnectionQualityChanged, () => this.refreshParticipants());
    room.on(RoomEvent.Reconnecting, () => getStore().setVoiceState({ status: 'connecting' }));
    room.on(RoomEvent.Reconnected, () => {
      getStore().setVoiceState({ status: 'connected' });
      this.refreshParticipants();
      this.applyVolumes();
    });
    room.on(RoomEvent.Disconnected, () => {
      if (this.leaving) return;
      this.cleanupRoom();
      getSocket()?.emit('voice:leave');
      getStore().setVoiceState({ status: 'off', channelId: null, participants: [], screens: [] });
      this.syncRadio();
      getStore().toast('ارتباط ویس قطع شد', 'error');
    });
  }

  refreshParticipants(speakingIds) {
    const room = this.room;
    if (!room) return;
    const s = getStore();
    const userMap = Object.fromEntries(s.users.map((u) => [u.id, u]));

    const tile = (p) => {
      let meta = {};
      try {
        meta = JSON.parse(p.metadata || '{}');
      } catch {
        /* بدون متادیتا */
      }
      const u = userMap[p.identity];
      return {
        identity: p.identity,
        name: u?.displayName || p.name || meta.displayName || p.identity,
        username: u?.username || meta.username || '',
        color: u?.color || meta.color || '#8b5cf6',
        speaking: speakingIds ? speakingIds.has(p.identity) : !!p.isSpeaking,
        micMuted: p.isMicrophoneEnabled === false,
        quality: p.connectionQuality || 'unknown',
        isMe: p === room.localParticipant
      };
    };

    const list = [tile(room.localParticipant)];
    for (const p of room.remoteParticipants.values()) list.push(tile(p));
    s.setParticipants(list);
    this.refreshScreens();
  }

  refreshScreens() {
    const room = this.room;
    if (!room) return;
    const screens = [];
    const collect = (p) => {
      for (const pub of p.getTrackPublications()) {
        if (pub.source === Track.Source.ScreenShare && pub.videoTrack) {
          screens.push({ identity: p.identity, track: pub.videoTrack });
        }
      }
    };
    collect(room.localParticipant);
    for (const p of room.remoteParticipants.values()) collect(p);
    getStore().setScreens(screens);
  }

  // ══════════ میکروفون / هدست / اسکرین ══════════
  async toggleMic() {
    const room = this.room;
    if (!room) return;
    const next = !getStore().voice.micMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      getStore().setVoiceState({ micMuted: next });
      getSocket()?.emit('voice:update', { micMuted: next });
    } catch {
      getStore().toast('نشد وضعیت میکروفون رو عوض کرد', 'error');
    }
  }

  async toggleDeafen() {
    const next = !getStore().voice.deafened;
    getStore().setVoiceState({ deafened: next });
    getSocket()?.emit('voice:update', { deafened: next });
    this.applyVolumes();
    this.syncRadio();
  }

  async toggleScreen() {
    const room = this.room;
    if (!room) return;
    const meId = getStore().me?.id;
    const sharing = getStore().voice.screens.some((x) => x.identity === meId);
    try {
      await room.localParticipant.setScreenShareEnabled(!sharing);
    } catch {
      getStore().toast('دسترسی اشتراک صفحه داده نشد 📺', 'error');
    }
  }

  // ولوم هر کاربر (مثل دیسکورد) — بی‌صدا کردن کلی هم رعایت می‌شود
  setVolume(identity, v) {
    getStore().setVolume(identity, v);
    this.applyVolumes();
  }

  applyVolumes() {
    const room = this.room;
    if (!room) return;
    const { voice } = getStore();
    for (const p of room.remoteParticipants.values()) {
      const base = voice.volumes[p.identity] ?? 1;
      const eff = voice.deafened ? 0 : base;
      try {
        if (typeof p.setVolume === 'function') {
          p.setVolume(eff);
        } else {
          for (const pub of p.audioTracks) pub.track?.setVolume?.(eff);
        }
      } catch {
        /* بی‌خیال */
      }
    }
  }

  // ══════════ رادیو (/mp) ══════════
  // استریم مستقیم از رادیو به مرورگر هر شنونده — صفر فشار روی سرور
  syncRadio() {
    const s = getStore();
    const inVoice = s.voice.status === 'connected' && s.voice.channelId;
    const r = inVoice ? s.radioMap[s.voice.channelId] : null;
    const station = r ? s.stations.find((st) => st.id === r.stationId) || null : null;
    const shouldPlay = !!station && !s.voice.deafened;

    s.setRadioState({ channelId: inVoice ? s.voice.channelId : null, station, startedBy: r?.startedBy || null });

    if (shouldPlay) {
      if (this.audio.dataset.stationId !== station.id) {
        this.audio.src = station.url;
        this.audio.dataset.stationId = station.id;
      }
      this.audio.volume = s.radio.volume;
      this.audio
        .play()
        .then(() => s.setRadioState({ playing: true, needsGesture: false }))
        .catch(() => s.setRadioState({ playing: false, needsGesture: true }));
    } else {
      this.audio.pause();
      if (!station) {
        try {
          this.audio.removeAttribute('src');
          this.audio.load();
        } catch {
          /* بی‌خیال */
        }
        this.audio.dataset.stationId = '';
      }
      s.setRadioState({ playing: false });
    }
  }

  resumeRadio() {
    this.audio
      .play()
      .then(() => getStore().setRadioState({ playing: true, needsGesture: false }))
      .catch(() => getStore().setRadioState({ needsGesture: true }));
  }

  setRadioVolume(v) {
    getStore().setRadioState({ volume: v });
    this.audio.volume = v;
  }

  playStation(channelId, stationId) {
    if (!this.inChannel(channelId)) {
      getStore().toast('اول به کانال ویس وصل شو 🎧', 'error');
      return;
    }
    getSocket()?.emit('radio:play', { channelId, stationId }, (res) => {
      if (res && !res.ok) getStore().toast(res.error || 'نشد رادیو رو روشن کرد', 'error');
    });
  }

  stopRadio(channelId) {
    getSocket()?.emit('radio:stop', { channelId });
  }
}

export const voiceClient = new VoiceClient();
