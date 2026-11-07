import { create } from 'zustand';
import { setToken, getToken } from './api.js';

let toastSeq = 0;

// ── استور مرکزی اپ ──
export const useStore = create((set) => ({
  // ── احراز هویت ──
  token: getToken(),
  me: null,

  // ── داده‌ها ──
  loaded: false,
  users: [],
  channels: [],
  online: [],
  messages: {}, // channelId -> message[]
  hasMore: {}, // channelId -> bool
  unread: {}, // channelId -> count
  typing: {}, // channelId -> { userId: expiryTs }
  voiceList: [], // [{ userId, channelId, micMuted, deafened }]
  radioMap: {}, // channelId -> { stationId, startedBy, startedAt }
  stations: [],
  livekitUrl: '',

  // ── ویس ──
  voice: {
    status: 'off', // off | connecting | connected
    channelId: null,
    micMuted: false,
    deafened: false,
    joinMuted: false,
    participants: [],
    screens: [], // [{ identity, track }]
    volumes: {} // identity -> 0..1
  },

  // ── رادیو ──
  radio: { channelId: null, station: null, playing: false, needsGesture: false, volume: 0.75, lastVolume: 0.75, startedBy: null },

  // ── UI ──
  activeChannelId: null,
  pickerOpen: false,
  sidebarOpen: false,
  toasts: [],

  // ══════════ اکشن‌ها ══════════
  setAuth: (token, me) => {
    setToken(token);
    set({ token, me });
  },
  logout: () => {
    setToken(null);
    set({ token: null, me: null, loaded: false });
  },

  setBootstrap: (d) =>
    set({
      me: d.me,
      users: d.users,
      channels: d.channels,
      stations: d.stations,
      livekitUrl: d.livekitUrl,
      online: d.online || [],
      voiceList: d.voice || [],
      radioMap: d.radio || {},
      loaded: true
    }),

  setActiveChannel: (id) => set({ activeChannelId: id, pickerOpen: false }),

  addChannel: (channel) => set((s) => ({ channels: [...s.channels, channel] })),

  setMessages: (channelId, messages, hasMore) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: messages }, hasMore: { ...s.hasMore, [channelId]: hasMore } })),

  prependMessages: (channelId, older, hasMore) =>
    set((s) => {
      const list = s.messages[channelId] || [];
      const known = new Set(list.map((m) => m.id));
      const fresh = older.filter((m) => !known.has(m.id));
      return {
        messages: { ...s.messages, [channelId]: [...fresh, ...list] },
        hasMore: { ...s.hasMore, [channelId]: hasMore }
      };
    }),

  addMessage: (m) =>
    set((s) => {
      const list = s.messages[m.channelId] || [];
      if (list.some((x) => x.id === m.id)) return {};
      return { messages: { ...s.messages, [m.channelId]: [...list, m] } };
    }),

  deleteMessage: (channelId, messageId) =>
    set((s) => ({
      messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).filter((m) => m.id !== messageId) }
    })),

  editMessage: (channelId, messageId, patch) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).map((m) => (m.id === messageId ? { ...m, ...patch } : m))
      }
    })),

  setMessageReactions: (channelId, messageId, reactions) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).map((m) => (m.id === messageId ? { ...m, reactions } : m))
      }
    })),

  bumpUnread: (channelId) =>
    set((s) => (s.activeChannelId === channelId ? {} : { unread: { ...s.unread, [channelId]: (s.unread[channelId] || 0) + 1 } })),

  clearUnread: (channelId) => set((s) => (s.unread[channelId] ? { unread: { ...s.unread, [channelId]: 0 } } : {})),

  setTyping: (channelId, userId, isTyping) =>
    set((s) => {
      const ch = { ...(s.typing[channelId] || {}) };
      if (isTyping) ch[userId] = Date.now() + 3500;
      else delete ch[userId];
      return { typing: { ...s.typing, [channelId]: ch } };
    }),

  pruneTyping: () =>
    set((s) => {
      const now = Date.now();
      const next = {};
      let changed = false;
      for (const [cid, users] of Object.entries(s.typing)) {
        const kept = {};
        for (const [uid, exp] of Object.entries(users)) {
          if (exp > now) kept[uid] = exp;
          else changed = true;
        }
        if (Object.keys(kept).length) next[cid] = kept;
      }
      return changed ? { typing: next } : {};
    }),

  setOnline: (online) => set({ online }),
  setVoiceList: (voiceList) => set({ voiceList }),

  setRadioMapKey: (channelId, state) =>
    set((s) => {
      const map = { ...s.radioMap };
      if (state) map[channelId] = state;
      else delete map[channelId];
      return { radioMap: map };
    }),

  setVoiceState: (patch) => set((s) => ({ voice: { ...s.voice, ...patch } })),
  setParticipants: (participants) => set((s) => ({ voice: { ...s.voice, participants } })),
  setScreens: (screens) => set((s) => ({ voice: { ...s.voice, screens } })),
  setVolume: (identity, v) => set((s) => ({ voice: { ...s.voice, volumes: { ...s.voice.volumes, [identity]: v } } })),
  setRadioState: (patch) => set((s) => ({ radio: { ...s.radio, ...patch } })),
  setPickerOpen: (pickerOpen) => set({ pickerOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  toast: (text, kind = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  }
}));

export const getStore = () => useStore.getState();
