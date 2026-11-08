'use client';

import { useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { ElementFields } from '../authoring/ElementFields';
import { AUTHORING_FIELDS, sceneConflicts } from '../authoring/model';
import { makeUniqueLabel } from '../lib/label';
import { TextField } from './fields/Text';
import { NumField } from './fields/Num';
import { ColorField } from './fields/Color';
import { SegField } from './fields/Seg';
import { ToggleField } from './fields/Toggle';
import { ListEditor, type GanttBlock, type ChartSeries } from './fields/ListEditor';
import { SlotCountField, SlotGridFields } from '../slots/SlotGridFields';
import { slotCountOf, slotValues, resizeSlotData } from '../slots/model';

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
  frames?: Frame[];
  node: Node;
  onUpdate: (patch: Record<string, unknown>) => void;
  // 이 노드를 제외한 다른 노드들의 라벨 집합 — 라벨 유일성 검사에 사용.
  takenLabels: Set<string>;
}

export function NodeEditor({ node, onUpdate, takenLabels, frames = [] }: NodeEditorProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type && node.type !== 'state-node' && node.type in AUTHORING_FIELDS) {
    return <Section>
      <UniqueLabelField label="요소 이름" value={String(d.label ?? '')} taken={takenLabels} onCommit={label => onUpdate({ label })} />
      <ElementFields key={node.id} type={node.type} data={d} onApply={onUpdate} validatePatch={patch => sceneConflicts(node, frames, patch)} />
    </Section>;
  }

  if (node.type === 'state-node') {
    return (
      <Section>
        <UniqueLabelField label="라벨" value={(d.label as string) ?? ''} taken={takenLabels} onCommit={v => onUpdate({ label: v })} />
        <SegField label="모양" value={(d.shape as string) ?? 'circle'}
          options={[{ value: 'circle', label: '원' }, { value: 'box', label: '박스' }]}
          onChange={v => onUpdate({ shape: v })} />
        <ColorField label="색상" value={(d.fill as string) ?? '#6366f1'} onChange={v => onUpdate({ fill: v })} />
        <ToggleField label="강조" value={(d.highlight as boolean) ?? false} onChange={v => onUpdate({ highlight: v })} />
        <ToggleField label="삭제됨으로 표시" value={(d.removed as boolean) ?? false} onChange={v => onUpdate({ removed: v })} />
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
    return (
      <Section>
        <UniqueLabelField label="칸 묶음 이름" value={String(d.label || '')} taken={takenLabels} onCommit={label => onUpdate({ label })} />
        <SlotCountField count={slotCountOf(d)} onChange={count => onUpdate({ ...resizeSlotData(d, count), slotCount: count, slots: slotValues(d, count) })} />
        <p className="text-xs font-semibold text-slate-600">기본 그림의 값</p>
        <SlotGridFields values={slotValues(d)} onChange={slots => onUpdate({ slots })} />
        <TextField label="다음 위치 표식 이름" value={String(d.pointerLabel || '다음')} onChange={pointerLabel => onUpdate({ pointerLabel })} />
        <p className="text-xs leading-relaxed text-slate-500">장면별 값과 강조는 프레임 탭에서 바꿉니다. 그림의 칸을 눌러도 값을 수정할 수 있습니다.</p>
      </Section>
    );
  }

  if (node.type === 'gantt-lane') {
    const blocks = (d.blocks as GanttBlock[]) ?? [];
    return (
      <div className="space-y-4">
        <Section>
          <TextField label="프로세스 이름" value={(d.trackId as string) ?? ''} onChange={v => onUpdate({ trackId: v })} />
          <TextField label="간트 묶음 이름" value={String(d.ganttGroup || '기본 간트')} onChange={v => onUpdate({ ganttGroup: v })} />
          <p className="text-xs leading-relaxed text-slate-500">같은 이름의 묶음은 시간축을 공유하며 함께 이동합니다. 막대를 눌러 기본 구간을 수정하세요.</p>
        </Section>
        <Divider />
        <Section title="블록 목록">
          <ListEditor mode="blocks" value={blocks} onChange={newBlocks => onUpdate({ blocks: newBlocks })} />
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
        <label className="block space-y-1 text-xs text-slate-600"><span>숫자 표시 방식</span><select aria-label="숫자 표시 방식" value={String(d.displayStyle ?? 'badge')} onChange={e => onUpdate({ displayStyle: e.target.value })} className="w-full rounded border p-1.5"><option value="badge">숫자 배지</option><option value="semaphore">세마포어 허용 횟수</option></select></label>
        {d.displayStyle === 'semaphore' && <>
          <label className="block space-y-1 text-xs text-slate-600"><span>세마포어 의미</span><input aria-label="세마포어 의미" maxLength={80} value={String(d.caption ?? '')} onChange={e => onUpdate({ caption: e.target.value })} className="w-full rounded border p-1.5" placeholder="예: 넣기 허용" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label="허용 토큰 표시" checked={d.showTokens !== false} onChange={e => onUpdate({ showTokens: e.target.checked })} />허용 토큰 표시</label>
        </>}
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label="재생에 숫자 표시" checked={d.showInPlayback !== false} onChange={e => onUpdate({ showInPlayback: e.target.checked })} />재생에 숫자 표시</label>
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
            { value: 'item', label: '항목' },
            { value: 'status', label: '상태' },
          ]}
          onChange={v => onUpdate({ variant: v })} />
        {d.variant === 'item' && <label className="block space-y-1 text-xs text-slate-600"><span>항목 설명</span><input aria-label="항목 설명" maxLength={80} value={String(d.caption ?? '')} onChange={e => onUpdate({ caption: e.target.value })} className="w-full rounded border p-1.5" /></label>}
        <ColorField label="색상" value={(d.color as string) ?? '#334155'} onChange={v => onUpdate({ color: v })} />
      </Section>
    );
  }

  return (
    <p className="text-xs text-slate-400 text-center py-4">알 수 없는 노드 타입: {node.type}</p>
  );
}
