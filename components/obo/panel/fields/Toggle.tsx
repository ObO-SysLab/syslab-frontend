'use client';

export function ToggleField({ label, value, onChange }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          value ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}