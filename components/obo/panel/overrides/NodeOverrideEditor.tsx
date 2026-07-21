'use client';

import type { Node } from '@xyflow/react';
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
  // 이 프레임의 override가 적용되기 "전" 캐리포워드 값 — 폼이 편집 기준으로 삼는 baseline
  const base = (applyFrame([node], frames, frameIndex - 1)[0].data ?? {}) as Record<string, unknown>;
  const formProps: OverrideFormProps = { node, base, override, onFieldChange, onFieldClear };

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
      return <p className="text-[10px] text-slate-400">오버라이드할 수 없는 노드 타입입니다.</p>;
  }
}
