import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../api.js';
import { useStore, getStore } from '../store.js';
import { Logo } from './bits.jsx';

export default function Login({ onBack }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', displayName: '', inviteCode: '' });
  const [busy, setBusy] = useState(false);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const d = await api(`/auth/${mode}`, { method: 'POST', body: form });
      getStore().setAuth(d.token, d.user);
      getStore().toast(`خوش اومدی ${d.user.displayName}! 🎉`);
    } catch (err) {
      getStore().toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      {onBack && (
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowRight size={14} />
          صفحه‌ی اصلی
        </button>
      )}
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />

      <form className="auth-card glass" onSubmit={submit}>
        <div className="auth-brand">
          <Logo size={52} />
          <h1>مهیار گپ</h1>
          <p className="dim">گپ، ویس و رادیو — مخصوص رفیق‌ها</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            ورود
          </button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>
            ثبت‌نام
          </button>
        </div>

        <label className="field">
          <span>نام کاربری</span>
          <input dir="ltr" value={form.username} onChange={upd('username')} placeholder="mahyar" autoComplete="username" required />
        </label>

        {mode === 'register' && (
          <label className="field">
            <span>اسم نمایشی</span>
            <input value={form.displayName} onChange={upd('displayName')} placeholder="مثلاً: مهیار" />
          </label>
        )}

        <label className="field">
          <span>رمز عبور</span>
          <input dir="ltr" type="password" value={form.password} onChange={upd('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
        </label>

        {mode === 'register' && (
          <label className="field">
            <span>کد دعوت (اگه داشتن)</span>
            <input dir="ltr" value={form.inviteCode} onChange={upd('inviteCode')} placeholder="اختیاری" />
          </label>
        )}

        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'یه لحظه…' : mode === 'login' ? 'ورود به گپ' : 'ساخت حساب'}
        </button>

        <p className="auth-foot dim">ساخته شده برای گپ‌های شبانه 🌙</p>
      </form>
    </div>
  );
}
