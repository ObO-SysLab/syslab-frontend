'use client';

import { GanttBlockList } from '../../gantt/GanttBlockList';

export interface GanttBlock {
  start: number;
  end: number;
  colorKey: string;
}

export interface ChartSeries {
  name: string;
  color: string;
  points?: { x: number; y: number }[];
}

type ListEditorProps =
  | { mode: 'blocks'; value: GanttBlock[];  onChange: (v: GanttBlock[]) => void }
  | { mode: 'series'; value: ChartSeries[]; onChange: (v: ChartSeries[]) => void };

const inputCls = 'px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300';
const addBtnCls = 'w-full text-xs text-indigo-500 hover:text-indigo-700 py-1 border border-dashed border-indigo-200 rounded transition-colors';
const delBtnCls = 'shrink-0 text-slate-300 hover:text-red-400 text-xs px-1 leading-none transition-colors';

export function ListEditor(props: ListEditorProps) {
  if (props.mode === 'blocks') return <GanttBlockList value={props.value} onChange={props.onChange} />;

  if (props.mode === 'series') {
    const { value: series, onChange } = props;
    const update = (i: number, patch: Partial<ChartSeries>) =>
      onChange(series.map((s, j) => j === i ? { ...s, ...patch } : s));

    return (
      <div className="space-y-1.5">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={s.name}
              onChange={e => update(i, { name: e.target.value })}
              placeholder="이름"
              className={`flex-1 ${inputCls}`}
            />
            <div className="relative w-8 h-7 rounded border border-slate-200 shrink-0" style={{ backgroundColor: s.color }}>
              <input type="color" value={s.color}
                onChange={e => update(i, { color: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
            <button onClick={() => onChange(series.filter((_, j) => j !== i))} className={delBtnCls}>✕</button>
          </div>
        ))}
        <p className="text-[10px] text-slate-300 text-center">포인트 편집은 다음 단계</p>
        <button onClick={() => onChange([...series, { name: '시리즈', color: '#6366f1', points: [] }])} className={addBtnCls}>
          + 시리즈 추가
        </button>
      </div>
    );
  }

  return null;
}