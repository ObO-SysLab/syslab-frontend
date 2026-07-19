'use client';

import type { Node } from '@xyflow/react';
import { TextField } from './fields/Text';
import { NumField } from './fields/Num';
import { ColorField } from './fields/Color';
import { SegField } from './fields/Seg';
import { ToggleField } from './fields/Toggle';
import { ListEditor, type SlotCell, type GanttBlock, type ChartSeries } from './fields/ListEditor';

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
}

export function NodeEditor({ node, onUpdate }: NodeEditorProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === 'state-node') {
    return (
      <Section>
        <TextField label="라벨" value={(d.label as string) ?? ''} onChange={v => onUpdate({ label: v })} />
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
        <TextField label="라벨" value={(d.label as string) ?? ''} onChange={v => onUpdate({ label: v })} />
        <NumField label="인스턴스 수" value={instances} min={1} max={8}
          onChange={v => onUpdate({ instances: v, allocated: Math.min((d.allocated as number) ?? 0, v) })} />
        <NumField label="할당 수" value={(d.allocated as number) ?? 0} min={0} max={instances}
          onChange={v => onUpdate({ allocated: v })} />
      </Section>
    );
  }

  if (node.type === 'slot-grid') {
    const cells = (d.cells as SlotCell[]) ?? [];
    const header = (d.header as boolean) ?? false;
    return (
      <div className="space-y-4">
        <Section>
          <TextField label="제목" value={(d.title as string) ?? ''} onChange={v => onUpdate({ title: v })} />
          <SegField label="방향" value={(d.orientation as string) ?? 'row'}
            options={[{ value: 'row', label: '행' }, { value: 'col', label: '열' }, { value: 'grid', label: '격자' }]}
            onChange={v => onUpdate({ orientation: v })} />
          <NumField label="열 수" value={(d.cols as number) ?? 4} min={1} max={8}
            onChange={v => onUpdate({ cols: v })} />
          <SegField label="셀 모양" value={(d.cellShape as string) ?? 'rect'}
            options={[{ value: 'rect', label: '사각' }, { value: 'circle', label: '원형' }]}
            onChange={v => onUpdate({ cellShape: v })} />
          <ToggleField label="헤더" value={header} onChange={v => onUpdate({ header: v })} />
          {header && (
            <TextField label="헤더 라벨" placeholder="P0, P1, P2"
              value={((d.headerLabels as string[]) ?? []).join(', ')}
              onChange={v => onUpdate({ headerLabels: v.split(',').map(s => s.trim()).filter(Boolean) })} />
          )}
          <ToggleField label="꼬리 화살표" value={(d.trailingArrow as boolean) ?? false}
            onChange={v => onUpdate({ trailingArrow: v })} />
        </Section>
        <Divider />
        <Section title="셀 목록">
          <ListEditor mode="cells" value={cells} onChange={newCells => onUpdate({ cells: newCells })} />
        </Section>
      </div>
    );
  }

  if (node.type === 'gantt-lane') {
    const mode = (d.mode as string) ?? 'block';
    const blocks = (d.blocks as GanttBlock[]) ?? [];
    return (
      <div className="space-y-4">
        <Section>
          <TextField label="라벨" value={(d.label as string) ?? ''} onChange={v => onUpdate({ label: v })} />
          <SegField label="모드" value={mode}
            options={[{ value: 'block', label: '블록' }, { value: 'step', label: '스텝' }]}
            onChange={v => onUpdate({ mode: v })} />
          {mode === 'block' && (
            <NumField label="축 최대값" value={(d.axisMax as number) ?? 8} min={1} max={30}
              onChange={v => onUpdate({ axisMax: v })} />
          )}
        </Section>
        <Divider />
        <Section title="블록 목록">
          <ListEditor mode="blocks" value={blocks} onChange={newBlocks => onUpdate({ blocks: newBlocks })} />
        </Section>
      </div>
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