import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../store.js';

const faNum = (n) => Number(n).toLocaleString('fa-IR');

// ── اسلایدر ولوم مشترک (صدای هر نفر + رادیو) ──
export function VolumeSlider({ value, onChange, onMuteToggle, color = '#8b5cf6', label }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  const Icon = pct === 0 ? VolumeX : pct < 50 ? Volume1 : Volume2;
  return (
    <div className="volslider">
      {onMuteToggle && (
        <button type="button" className="vs-icon" onClick={onMuteToggle} title={pct === 0 ? 'بازگرداندن صدا' : 'بی‌صدا'}>
          <Icon size={15} />
        </button>
      )}
      <input
        type="range"
        min="0"
        max="100"
        value={pct}
        aria-label={label || 'بلندی صدا'}
        style={{ '--vs-fill': `${pct}%`, '--vs-color': color }}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <span className="vs-pct">{faNum(pct)}٪</span>
    </div>
  );
}

// ── لوگو (حباب گپ با گرادیان) ──
export function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="mg-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#mg-logo)"
        d="M32 6C17 6 5 16.5 5 29.5c0 7.4 4 14 10.3 18.3-.5 3.2-2 6.5-4.6 9.4-.8.9-.1 2.3 1.1 2.2 6.3-.5 11.4-2.7 15-5.3 1.7.3 3.4.4 5.2.4 15 0 27-10.5 27-23.5S47 6 32 6z"
      />
      <circle cx="20" cy="30" r="3.4" fill="#0a0c12" opacity="0.55" />
      <circle cx="32" cy="30" r="3.4" fill="#0a0c12" opacity="0.55" />
      <circle cx="44" cy="30" r="3.4" fill="#0a0c12" opacity="0.55" />
    </svg>
  );
}

// ── آواتار با رنگ اختصاصی کاربر ──
export function Avatar({ user, color, name, size = 32, online }) {
  const c = color || user?.color || '#8b5cf6';
  const n = (name || user?.displayName || '?').trim();
  return (
    <div
      className={`avatar ${online ? 'is-online' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.42),
        background: `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 45%, #0a0c12))`
      }}
      title={n}
    >
      {n.charAt(0)}
      {online !== undefined && <span className="avatar-dot" data-on={online ? '1' : '0'} />}
    </div>
  );
}

// ── اکولایزر متحرک برای رادیو ──
export function Equalizer({ color = '#2dd4bf', bars = 5, height = 22 }) {
  return (
    <div className="eq" style={{ color, height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 5) * 0.13}s` }} />
      ))}
    </div>
  );
}

// ── اعلان‌های شیشه‌ای ──
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast glass toast-${t.kind || 'info'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
