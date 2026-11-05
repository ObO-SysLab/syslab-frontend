'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
interface Section { name: string; shared?: boolean; value?: string | number; }
interface Thread { id: string; label: string; pc: string; register: string; stack: string; }
interface ProcessData { label?: string; sections?: Section[]; color?: string; threads?: Thread[]; activeThreadId?: string | null; }
export function ProcessBoxNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ProcessData;
  const sections = d.sections ?? [{ name: 'Code' }, { name: 'Data' }, { name: 'Heap' }, { name: 'Stack' }];
  const color = d.color ?? '#4f46e5';
  const { previewFrame } = useFrameCtx();
  const active = previewFrame?.highlightNodes.includes(id);
  return <div data-process={id} style={{ width: 360, border: `2px solid ${active ? color : '#94a3b8'}`, borderRadius: 12, background: 'white', overflow: 'visible',
    outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
    <Handle id="t-s" type="source" position={Position.Top} /><Handle id="r-s" type="source" position={Position.Right} />
    <Handle id="b-t" type="target" position={Position.Bottom} /><Handle id="l-t" type="target" position={Position.Left} />
    <div style={{ fontSize: 16, fontWeight: 800, color, padding: 12, background: '#eef2ff', borderRadius: '10px 10px 0 0' }}>{d.label || '프로세스'}</div>
    <div style={{ margin: 12, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc' }}>
      {sections.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#334155', marginBottom: 5 }}>
        <strong>{s.name}</strong>{s.value !== undefined && <span data-section-value={s.name}> · {s.value}</span>}{s.shared && <span style={{ fontSize: 11, color: '#64748b' }}> (이 프로세스 안에서 공유)</span>}
      </div>)}
    </div>
    {d.threads && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, padding: '0 12px 12px' }}>
      {d.threads.map(t => <div key={t.id} data-thread={t.id} data-active={t.id === d.activeThreadId} style={{ border: `2px solid ${t.id === d.activeThreadId ? '#d97706' : '#cbd5e1'}`, background: t.id === d.activeThreadId ? '#fffbeb' : 'white', borderRadius: 8, padding: 9, fontSize: 12, color: '#334155', lineHeight: 1.7, overflowWrap: 'anywhere' }}>
        <strong style={{ fontSize: 14 }}>{t.label}</strong><div>PC · {t.pc}</div><div>레지스터 · {t.register}</div><div>스택 · {t.stack}</div>
      </div>)}
      {!d.threads.length && <span style={{ fontSize: 12 }}>스레드 없음</span>}
    </div>}
  </div>;
}
