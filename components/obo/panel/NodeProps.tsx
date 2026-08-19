'use client';

import { useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import { makeUniqueLabel } from '../lib/label';
import { TextField } from './fields/Text';
import { NumField } from './fields/Num';
import { ColorField } from './fields/Color';
import { SegField } from './fields/Seg';
import { ToggleField } from './fields/Toggle';
import { ListEditor, type GanttBlock, type ChartSeries } from './fields/ListEditor';
import { TIMELINE_COLOR_KEYS, rowColorForIndex } from '../nodes/ganttColors';

// 노드 라벨 전용 필드. 라벨은 트레이스 키라 유일해야 하므로, 편집 확정(blur/Enter) 시
// 다른 노드와 중복이면 자동으로 접미 숫자를 붙여 유일화한다(입력 중엔 방해하지 않음).
function UniqueLabelField({ label, value, taken, onCommit }: {
  label: string;
  value: string;
  taken: Set<string>;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const commit = () => {
    const v = local.trim();
    if (v === '' || v === value) { setLocal(value); return; } // 빈 값/무변경은 원복
    const unique = taken.has(v) ? makeUniqueLabel(v, taken) : v;
    setLocal(unique);
    if (unique !== value) onCommit(unique);
  };

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100" />;
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      {title && <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{title}</p>}
      {children}
    </div>
  );
}

interface NodeEditorProps {
  node: Node;
  onUpdate: (patch: Record<string, unknown>) => void;
  // 이 노드를 제외한 다른 노드들의 라벨 집합 — 라벨 유일성 검사에 사용.
  takenLabels: Set<string>;
}

export function NodeEditor({ node, onUpdate, takenLabels }: NodeEditorProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === 'state-node') {
    return (
      <Section>
        <UniqueLabelField label="라벨" value={(d.label as string) ?? ''} taken={takenLabels} onCommit={v => onUpdate({ label: v })} />
        <SegField label="모양" value={(d.shape as string) ?? 'circle'}
          options={[{ value: 'circle', label: '원' }, { value: 'box', label: '박스' }]}
          onChange={v => onUpdate({ shape: v })} />
        <ColorField label="색상" value={(d.fill as string) ?? '#6366f1'} onChange={v => onUpdate({ fill: v })} />
        <ToggleField label="강조" value={(d.highlight as boolean) ?? false} onChange={v => onUpdate({ highlight: v })} />
      </Section>
    );
  }

  if (node.type === 'resource-square') {
    const instances = (d.instances as number) ?? 1;
    return (
      <Section>
        <UniqueLabelField label="라벨" value={(d.label as string) ?? ''} taken={takenLabels} onCommit={v => onUpdate({ label: v })} />
        <NumField label="인스턴스 수" value={instances} min={1} max={8}
          onChange={v => onUpdate({ instances: v, allocated: Math.min((d.allocated as number) ?? 0, v) })} />
        <NumField label="할당 수" value={(d.allocated as number) ?? 0} min={0} max={instances}
          onChange={v => onUpdate({ allocated: v })} />
      </Section>
    );
  }

  if (node.type === 'slot-grid') {
    const slotCount = (d.slotCount as number) ?? 0;
    const slots = (d.slots as (number | null)[]) ?? [];
    const resize = (count: number) => {
      const next = Array.from({ length: count }, (_, i) => slots[i] ?? null);
      onUpdate({ slotCount: count, slots: next });
    };
    const updateSlot = (i: number, raw: string) => {
      const next = [...slots];
      next[i] = raw === '' ? null : Number(raw);
      onUpdate({ slots: next });
    };
    return (
      <Section>
        <NumField label="슬롯 개수" value={slotCount} min={1} max={16} onChange={resize} />
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">초기 슬롯 값</label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: slotCount }).map((_, i) => (
              <input
                key={i}
                value={slots[i] ?? ''}
                onChange={e => updateSlot(i, e.target.value)}
                placeholder="-"
                className="w-10 px-1 py-1 text-xs text-center border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  if (node.type === 'gantt-chart') {
    // 블록은 여기(기본 데이터)가 아니라 프레임에서 채워진다 — 이 화면은 어떤 행(프로세스)이
    // 있는지·색만 정한다. 실제 "언제 뭐가 도는지"는 프레임 탭에서 캔버스를 직접 칠해서 만든다.
    const rows = (d.rows as { trackId?: string; blocks?: GanttBlock[]; color?: string }[]) ?? [];
    const updateRows = (next: typeof rows) => onUpdate({ rows: next });
    return (
      <div className="space-y-4">
        <Section>
          <TextField label="제목" value={(d.title as string) ?? ''} onChange={v => onUpdate({ title: v })} />
          <NumField
            label="공유 칸 수(0=자동)"
            value={(d.axisMax as number) ?? 0}
            min={0} max={40}
            onChange={v => onUpdate({ axisMax: v || undefined })}
          />
        </Section>
        <Divider />
        <Section title="행 (프로세스별 한 줄)">
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="relative border border-slate-100 rounded-lg p-2 flex items-end gap-2">
                <button
                  onClick={() => updateRows(rows.filter((_, j) => j !== i))}
                  className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-400 text-xs transition-colors"
                >✕</button>
                <div className="flex-1">
                  <TextField
                    label="트랙 ID"
                    value={row.trackId ?? ''}
                    onChange={v => updateRows(rows.map((r, j) => j === i ? { ...r, trackId: v } : r))}
                  />
                </div>
                <div className="w-24 pr-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">행 색상</p>
                  <select
                    value={row.color ?? rowColorForIndex(i)}
                    onChange={e => updateRows(rows.map((r, j) => j === i ? { ...r, color: e.target.value } : r))}
                    className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
                  >
                    {TIMELINE_COLOR_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={() => updateRows([...rows, { trackId: `P${rows.length + 1}`, blocks: [], color: rowColorForIndex(rows.length) }])}
              className="w-full text-xs text-indigo-500 hover:text-indigo-700 py-1 border border-dashed border-indigo-200 rounded transition-colors"
            >+ 행 추가</button>
          </div>
        </Section>
      </div>
    );
  }

  if (node.type === 'counter-badge') {
    const min = (d.min as number) ?? 0;
    const max = (d.max as number) ?? 10;
    return (
      <Section>
        <UniqueLabelField label="라벨" value={(d.label as string) ?? ''} taken={takenLabels} onCommit={v => onUpdate({ label: v })} />
        <NumField label="최솟값" value={min} min={-999} max={max}
          onChange={v => onUpdate({ min: v })} />
        <NumField label="최댓값" value={max} min={min} max={999}
          onChange={v => onUpdate({ max: v })} />
        <NumField label="초기값" value={(d.value as number) ?? min} min={min} max={max}
          onChange={v => onUpdate({ value: v })} />
      </Section>
    );
  }

  if (node.type === 'line-chart') {
    const series = (d.series as ChartSeries[]) ?? [];
    return (
      <div className="space-y-4">
        <Section>
          <TextField label="차트 제목" value={(d.label as string) ?? ''} onChange={v => onUpdate({ label: v })} />
          <TextField label="X축 라벨" value={(d.xLabel as string) ?? ''} onChange={v => onUpdate({ xLabel: v })} />
          <TextField label="Y축 라벨" value={(d.yLabel as string) ?? ''} onChange={v => onUpdate({ yLabel: v })} />
        </Section>
        <Divider />
        <Section title="시리즈">
          <ListEditor mode="series" value={series} onChange={newSeries => onUpdate({ series: newSeries })} />
        </Section>
      </div>
    );
  }

  if (node.type === 'text-label') {
    return (
      <Section>
        <TextField label="텍스트" value={(d.text as string) ?? (d.label as string) ?? ''}
          onChange={v => onUpdate({ text: v })} />
        <SegField label="스타일" value={(d.variant as string) ?? 'plain'}
          options={[
            { value: 'plain', label: '텍스트' },
            { value: 'dashed-box', label: '점선' },
            { value: 'pill', label: '뱃지' },
          ]}
          onChange={v => onUpdate({ variant: v })} />
        <ColorField label="색상" value={(d.color as string) ?? '#334155'} onChange={v => onUpdate({ color: v })} />
      </Section>
    );
  }

  return (
    <p className="text-xs text-slate-400 text-center py-4">알 수 없는 노드 타입: {node.type}</p>
  );
}