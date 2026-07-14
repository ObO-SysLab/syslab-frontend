'use client';

export function NumField({ label, value, min = 0, max = 100, onChange }: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onChange(clamp(v)); }}
          className="w-12 text-right text-xs font-mono border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600 h-1"
      />
    </div>
  );
}