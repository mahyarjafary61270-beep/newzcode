import React from 'react';
import { useStore, getStore } from '../store.js';
import { voiceClient } from '../voice.js';

export default function StationPicker() {
  const open = useStore((s) => s.pickerOpen);
  const stations = useStore((s) => s.stations);
  const voice = useStore((s) => s.voice);
  const radioMap = useStore((s) => s.radioMap);
  if (!open) return null;

  const current = voice.channelId ? radioMap[voice.channelId] : null;

  return (
    <div className="overlay" onMouseDown={() => getStore().setPickerOpen(false)}>
      <div className="modal picker glass" onMouseDown={(e) => e.stopPropagation()}>
        <h3>📻 انتخاب رادیو</h3>
        <p className="dim">
          رادیو مستقیم تو ویس پخش می‌شه — با کامند <code dir="ltr">/mp 1</code> تا <code dir="ltr">/mp 4</code> هم می‌تونی انتخاب کنی
        </p>
        <div className="stations">
          {stations.map((st, i) => (
            <button
              key={st.id}
              className="station"
              style={{ '--st': st.color }}
              onClick={() => {
                voiceClient.playStation(voice.channelId, st.id);
                getStore().setPickerOpen(false);
              }}
            >
              <span className="station-emoji">{st.emoji}</span>
              <span className="station-name">{st.name}</span>
              <span className="station-hint dim">۲۴ ساعته</span>
              <span className="station-num">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="modal-actions">
          {current && (
            <button
              className="btn danger-btn"
              onClick={() => {
                voiceClient.stopRadio(voice.channelId);
                getStore().setPickerOpen(false);
              }}
            >
              📴 خاموش کردن رادیو فعلی
            </button>
          )}
          <button className="btn" onClick={() => getStore().setPickerOpen(false)}>
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
