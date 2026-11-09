'use client';

import type { Node } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { ElementFields } from '../../authoring/ElementFields';
import { AUTHORING_FIELDS, sceneConflicts } from '../../authoring/model';
import type { Frame } from '../../types';
import { applyFrame } from '../../lib/applyFrame';
import { TextLabelOverrideForm } from './TextLabelOverrideForm';
import { TimelineBlockOverrideForm } from './TimelineBlockOverrideForm';
import { SlotGridOverrideForm } from './SlotGridOverrideForm';
import { CounterBadgeOverrideForm } from './CounterBadgeOverrideForm';

export interface OverrideFormProps {
  node: Node;
  base: Record<string, unknown>;
  override: Record<string, unknown>;
  onFieldChange: (field: string, value: unknown) => void;
  onFieldClear: (field: string) => void;
}

interface NodeOverrideEditorProps {
  node: Node;
  frames: Frame[];
  frameIndex: number;
  override: Record<string, unknown>;
  onFieldChange: (field: string, value: unknown) => void;
  onFieldClear: (field: string) => void;
}

export function NodeOverrideEditor({ node, frames, frameIndex, override, onFieldChange, onFieldClear }: NodeOverrideEditorProps) {
  const [clearErrors, setClearErrors] = useState<string[]>([]);
  const signature = JSON.stringify(override);
  useEffect(() => setClearErrors([]), [frameIndex, node.id, signature]);
  // 이 프레임의 override가 적용되기 "전" 캐리포워드 값 — 폼이 편집 기준으로 삼는 baseline
  const base = (applyFrame([node], frames, frameIndex - 1)[0].data ?? {}) as Record<string, unknown>;
  const formProps: OverrideFormProps = { node, base, override, onFieldChange, onFieldClear };

  if (node.type && node.type in AUTHORING_FIELDS) {
    const check = (next: Record<string, unknown>) => sceneConflicts(node, frames.map((f, i) => i === frameIndex ? { ...f, nodeDataOverrides: { ...f.nodeDataOverrides, [node.id]: next } } : f), {});
    return <>
      <ElementFields key={`${node.id}-${frameIndex}`} type={node.type} data={{ ...base, ...override }} scope="scene" override={override}
        validatePatch={patch => check({ ...override, ...patch })}
        onApply={patch => { setClearErrors([]); Object.entries(patch).forEach(([field, value]) => onFieldChange(field, value)); }}
        onClear={field => { const next = { ...override }; delete next[field]; const errors = check(next); setClearErrors(errors); if (!errors.length) onFieldClear(field); }} />
      {clearErrors.length > 0 && <div role="alert" className="rounded bg-rose-50 p-2 text-xs text-rose-700">{clearErrors[0]} · 이 장면 값은 유지했습니다.</div>}
    </>;
  }

  switch (node.type) {
    case 'text-label':
      return <TextLabelOverrideForm {...formProps} />;
    case 'gantt-lane':
      return <TimelineBlockOverrideForm {...formProps} />;
    case 'slot-grid':
      return <SlotGridOverrideForm {...formProps} />;
    case 'counter-badge':
      return <CounterBadgeOverrideForm {...formProps} />;
    default:
      return <p className="text-[10px] text-slate-400">이 요소는 장면마다 값을 따로 정할 수 없습니다.</p>;
  }
}
