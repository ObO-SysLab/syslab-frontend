'use client';

export function SegField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <div className="flex rounded border border-slate-200 overflow-hidden">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1 text-xs font-semibold transition-colors border-r border-slate-200 last:border-r-0 ${
              value === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}