'use client';

export function ColorField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <div className="flex items-center gap-1.5">
        <div className="relative w-6 h-6 rounded border border-slate-200 overflow-hidden" style={{ backgroundColor: value }}>
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-400 w-14">{value}</span>
      </div>
    </div>
  );
}