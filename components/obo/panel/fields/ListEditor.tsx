'use client';

export interface SlotCell {
  value?: string;
  status?: 'default' | 'fault' | 'hit' | 'empty';
}

export interface GanttBlock {
  label: string;
  start: number;
  end: number;
  color?: string;
}

export interface ChartSeries {
  name: string;
  color: string;
  points?: { x: number; y: number }[];
}

type ListEditorProps =
  | { mode: 'cells';  value: SlotCell[];    onChange: (v: SlotCell[]) => void }
  | { mode: 'blocks'; value: GanttBlock[];  onChange: (v: GanttBlock[]) => void }
  | { mode: 'series'; value: ChartSeries[]; onChange: (v: ChartSeries[]) => void };

const inputCls = 'px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300';
const addBtnCls = 'w-full text-xs text-indigo-500 hover:text-indigo-700 py-1 border border-dashed border-indigo-200 rounded transition-colors';
const delBtnCls = 'shrink-0 text-slate-300 hover:text-red-400 text-xs px-1 leading-none transition-colors';

export function ListEditor(props: ListEditorProps) {
  if (props.mode === 'cells') {
    const { value: cells, onChange } = props;
    const update = (i: number, patch: Partial<SlotCell>) =>
      onChange(cells.map((c, j) => j === i ? { ...c, ...patch } : c));

    return (
      <div className="space-y-1.5">
        {cells.map((cell, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={cell.value ?? ''}
              onChange={e => update(i, { value: e.target.value })}
              placeholder="값"
              className={`w-14 ${inputCls}`}
            />
            <select
              value={cell.status ?? 'default'}
              onChange={e => update(i, { status: e.target.value as SlotCell['status'] })}
              className="flex-1 px-1 py-1 text-xs border border-slate-200 rounded bg-white"
            >
              <option value="default">기본</option>
              <option value="fault">결함</option>
              <option value="hit">히트</option>
              <option value="empty">빈칸</option>
            </select>
            <button onClick={() => onChange(cells.filter((_, j) => j !== i))} className={delBtnCls}>✕</button>
          </div>
        ))}
        <button onClick={() => onChange([...cells, { value: '', status: 'default' }])} className={addBtnCls}>
          + 셀 추가
        </button>
      </div>
    );
  }

  if (props.mode === 'blocks') {
    const { value: blocks, onChange } = props;
    const update = (i: number, patch: Partial<GanttBlock>) =>
      onChange(blocks.map((b, j) => j === i ? { ...b, ...patch } : b));

    return (
      <div className="space-y-2">
        {blocks.map((block, i) => (
          <div key={i} className="relative border border-slate-100 rounded-lg p-2 space-y-1.5">
            <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-400 text-xs transition-colors">✕</button>
            <input
              value={block.label}
              onChange={e => update(i, { label: e.target.value })}
              placeholder="라벨"
              className={`w-full pr-5 ${inputCls}`}
            />
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <p className="text-[9px] text-slate-400 mb-0.5">시작</p>
                <input type="number" min={0} value={block.start}
                  onChange={e => update(i, { start: Number(e.target.value) })}
                  className={`w-full ${inputCls}`} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] text-slate-400 mb-0.5">종료</p>
                <input type="number" min={0} value={block.end}
                  onChange={e => update(i, { end: Number(e.target.value) })}
                  className={`w-full ${inputCls}`} />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 mb-0.5">색</p>
                <div className="relative w-8 h-[26px] rounded border border-slate-200" style={{ backgroundColor: block.color ?? '#1D9E75' }}>
                  <input type="color" value={block.color ?? '#1D9E75'}
                    onChange={e => update(i, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => onChange([...blocks, { label: 'P', start: 0, end: 2, color: '#1D9E75' }])} className={addBtnCls}>
          + 블록 추가
        </button>
      </div>
    );
  }

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