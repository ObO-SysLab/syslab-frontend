'use client';

import { Check, GripVertical } from 'lucide-react';
import { PALETTE_ITEMS, EDGE_TYPES, type EdgeType, type PaletteComponentType } from '../templates';

// Static previews avoid introducing a second interactive canvas inside a drag source.
function ElementPreview({ type }: { type: PaletteComponentType }) {
  if (type === 'resource-square') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true"><rect x="25" y="12" width="50" height="54" rx="4" fill="#f0fdfa" stroke="#0f766e" strokeWidth="2"/><text x="50" y="32" textAnchor="middle" fontSize="12" fill="#0f766e">R1</text><circle cx="42" cy="49" r="5" fill="#0f766e"/><circle cx="59" cy="49" r="5" fill="white" stroke="#0f766e"/></svg>;
  if (type === 'counter-badge') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true"><rect x="7" y="23" width="86" height="32" rx="16" fill="#fffbeb" stroke="#b45309"/><text x="50" y="44" textAnchor="middle" fontSize="12" fill="#92400e">개수 = 3</text></svg>;
  if (type === 'queue-strip') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true">{['A','B',''].map((v,i)=><g key={i}><rect x={8+i*29} y="24" width="26" height="30" rx="3" fill={v?'#e0e7ff':'white'} stroke="#6366f1" strokeDasharray={v?undefined:'3 2'}/><text x={21+i*29} y="44" textAnchor="middle" fontSize="13" fill="#4338ca">{v}</text></g>)}<text x="50" y="69" textAnchor="middle" fontSize="9" fill="#64748b">먼저 꺼냄 ←</text></svg>;
  if (type === 'table-grid') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true">{Array.from({length:6},(_,i)=><rect key={i} x={12+i%2*38} y={10+Math.floor(i/2)*19} width="38" height="19" fill={i<2?'#e0e7ff':i<4?'#fef3c7':'white'} stroke="#94a3b8"/>)}<text x="50" y="42" textAnchor="middle" fontSize="11" fill="#334155">2 → 5</text></svg>;
  if (type === 'memory-range') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true"><rect x="8" y="23" width="36" height="30" fill="#e0e7ff" stroke="#6366f1"/><rect x="44" y="23" width="22" height="30" fill="white" stroke="#94a3b8" strokeDasharray="3 2"/><rect x="66" y="23" width="26" height="30" fill="#ccfbf1" stroke="#0f766e"/><text x="8" y="68" fontSize="9" fill="#64748b">0</text><text x="81" y="68" fontSize="9" fill="#64748b">16</text></svg>;
  if (type === 'process-box') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true"><rect x="9" y="6" width="82" height="66" rx="5" fill="white" stroke="#6366f1"/><rect x="16" y="14" width="68" height="20" rx="3" fill="#e0e7ff"/><text x="50" y="28" textAnchor="middle" fontSize="10" fill="#4338ca">공유 공간</text>{['T1','T2'].map((v,i)=><g key={v}><rect x={16+i*36} y="40" width="31" height="24" rx="3" fill="#f8fafc" stroke="#94a3b8"/><text x={31+i*36} y="56" textAnchor="middle" fontSize="10" fill="#334155">{v}</text></g>)}</svg>;
  if (type === 'line-chart') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true"><path d="M12 10V64H92" fill="none" stroke="#94a3b8"/><polyline points="15,36 39,53 64,19 88,44" fill="none" stroke="#0f766e" strokeWidth="2"/><circle cx="88" cy="44" r="4" fill="#d97706"/></svg>;
  if (type === 'slot-grid') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true">
    {[7, 0, 1].map((value, i) => <g key={i}><rect x={8 + i * 29} y="25" width="26" height="30" rx="4" fill={i === 1 ? '#eef2ff' : 'white'} stroke={i === 1 ? '#6366f1' : '#94a3b8'} /><text x={21 + i * 29} y="45" textAnchor="middle" fill="#334155" fontSize="13" fontWeight="700">{value}</text></g>)}
    <text x="50" y="17" textAnchor="middle" fill="#6366f1" fontSize="9">칸의 값과 변화</text>
  </svg>;
  if (type === 'gantt-lane') return <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true">
    <text x="8" y="22" fill="#475569" fontSize="10" fontWeight="700">P1</text>
    <rect x="8" y="30" width="84" height="22" rx="4" fill="white" stroke="#cbd5e1" />
    <rect x="28" y="32" width="38" height="18" rx="3" fill="#ccfbf1" stroke="#0d9488" />
    <text x="8" y="66" fill="#64748b" fontSize="9">0</text><text x="84" y="66" fill="#64748b" fontSize="9">9</text>
  </svg>;
  if (type === 'state-node') return (
    <svg viewBox="0 0 100 78" className="h-[78px] w-full" aria-hidden="true">
      <circle cx="50" cy="39" r="29" fill="white" stroke="#94a3b8" strokeWidth="2" />
      <text x="50" y="43" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="700">준비</text>
      {[[50, 10], [79, 39], [50, 68], [21, 39]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="#6366f1" stroke="white" />
      ))}
    </svg>
  );
  return (
    <div className="flex h-[78px] items-center justify-center px-1" aria-hidden="true">
      <span className="rounded bg-white px-1 py-1 text-[11px] font-semibold leading-relaxed text-slate-700">설명을<br />입력하세요</span>
    </div>
  );
}

function ConnectionPreview({ type }: { type: EdgeType }) {
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-[92px] shrink-0" aria-hidden="true">
      <circle cx="10" cy="16" r="7" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="90" cy="16" r="7" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 16 H78" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={type === 'allocation' ? '4 4' : undefined} />
      <path d="M74 11 L82 16 L74 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {type === 'bidirectional' && <path d="M26 11 L18 16 L26 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />}
    </svg>
  );
}

interface PaletteProps {
  activeEdgeType: EdgeType;
  onEdgeTypeChange: (type: EdgeType) => void;
}

export function Palette({ activeEdgeType, onEdgeTypeChange }: PaletteProps) {
  const onDragStart = (e: React.DragEvent, type: PaletteComponentType, label: string) => {
    e.dataTransfer.setData('application/obo-component', type);
    e.dataTransfer.setData('application/obo-label', label);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-3 space-y-5" data-obo-palette>
      <section aria-label="추가할 요소" className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {PALETTE_ITEMS.map(item => {
            const label = item.type === 'state-node' ? '상태' : item.type === 'text-label' ? '설명 글' : item.type === 'gantt-lane' ? '간트 줄' : item.type === 'slot-grid' ? '칸 묶음' : item.label;
            return (
              <div key={item.type} draggable data-palette-type={item.type}
                aria-label={`${label} — 끌어서 추가`} title={`${label}: 그림 위로 끌어서 추가`}
                onDragStart={event => onDragStart(event, item.type, item.label)}
                className="group rounded-xl border border-slate-200 bg-white p-2 text-center select-none cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
                <div className="pointer-events-none rounded-lg bg-slate-50 group-hover:bg-white">
                  <ElementPreview type={item.type} />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-1 flex items-center justify-center gap-0.5 text-[10px] text-slate-500"><GripVertical size={12} aria-hidden="true" />끌어서 추가</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="연결선 종류" className="space-y-2 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800">연결선</h3>
          <span className="text-[11px] text-slate-500">눌러서 선택</span>
        </div>
        <div className="space-y-2">
          {EDGE_TYPES.map(({ type }) => {
            const label = type === 'directed' ? '단방향 연결' : type === 'bidirectional' ? '양방향 연결' : '점선 연결';
            const selected = activeEdgeType === type;
            return (
              <button key={type} type="button" aria-label={label} aria-pressed={selected}
                onClick={() => onEdgeTypeChange(type)}
                className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                <ConnectionPreview type={type} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{label}</span>
                  {type === 'allocation' && <span className="block mt-0.5 text-[10px] text-slate-500">요청 관계</span>}
                </span>
                <span className="w-3 shrink-0">{selected && <Check size={13} aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">점에서 점으로 끌어 연결</p>
      </section>
    </div>
  );
}
