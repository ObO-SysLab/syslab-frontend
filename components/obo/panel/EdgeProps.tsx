'use client';

import type { Edge } from '@xyflow/react';
import { TextField } from './fields/Text';
import { SegField } from './fields/Seg';
import { ToggleField } from './fields/Toggle';

interface OboEdgeData {
  label?: string;
  direction?: 'forward' | 'both';
  style?: 'solid' | 'dashed';
  role?: 'transition' | 'request' | 'allocation';
  highlight?: boolean;
}

interface EdgeEditorProps {
  edge: Edge;
  onUpdate: (patch: Partial<OboEdgeData>) => void;
}

export function EdgeEditor({ edge, onUpdate }: EdgeEditorProps) {
  const d = (edge.data ?? {}) as OboEdgeData;

  return (
    <div className="space-y-2.5">
      <TextField label="라벨" value={d.label ?? ''} onChange={v => onUpdate({ label: v })} />
      <SegField
        label="방향"
        value={d.direction ?? 'forward'}
        options={[{ value: 'forward', label: '단방향' }, { value: 'both', label: '양방향' }]}
        onChange={v => onUpdate({ direction: v as OboEdgeData['direction'] })}
      />
      <SegField
        label="선 스타일"
        value={d.style ?? 'solid'}
        options={[{ value: 'solid', label: '실선' }, { value: 'dashed', label: '점선' }]}
        onChange={v => onUpdate({ style: v as OboEdgeData['style'] })}
      />
      <SegField
        label="역할"
        value={d.role ?? 'transition'}
        options={[
          { value: 'transition', label: '전이' },
          { value: 'request', label: '요청' },
          { value: 'allocation', label: '할당' },
        ]}
        onChange={v => onUpdate({ role: v as OboEdgeData['role'] })}
      />
      <ToggleField label="강조" value={d.highlight ?? false} onChange={v => onUpdate({ highlight: v })} />
    </div>
  );
}