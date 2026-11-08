'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useRef } from 'react';
import { useFrameCtx } from '../FrameContext';
import { DEFAULT_PROCESS_SECTIONS, THREAD_FIELDS, processChanges, type ProcessData } from '../process/model';
import styles from './ProcessBoxNode.module.css';
import { ProcessRelations } from '../process/ProcessRelations';

const fieldLabels = { pc: 'PC', register: '레지스터', stack: '스택' };
export function ProcessBoxNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ProcessData;
  const bodyRef = useRef<HTMLDivElement>(null);
  const { previewFrame, previousNodeData } = useFrameCtx();
  const changes = processChanges(previousNodeData?.[id] as ProcessData | undefined, d);
  const sections = (d.sections ?? DEFAULT_PROCESS_SECTIONS).map((section, index) => ({ ...section, index }))
    .filter(section => !d.hiddenSectionNames?.includes(section.name));
  const shared = sections.filter(s => s.shared), other = sections.filter(s => !s.shared);
  const threads = (d.threads ?? []).filter(t => !d.hiddenThreadIds?.includes(t.id));
  const fields = THREAD_FIELDS.filter(field => (d.threadFields ?? THREAD_FIELDS).includes(field));
  const linked = d.showSharedLinks !== false && shared.length > 0 && threads.length > 0;
  const columns = d.threadLayout === 'column' ? 1 : Math.min(threads.length || 1, 2);
  const active = previewFrame?.highlightNodes.includes(id);
  const renderSections = (items: typeof sections, title: string, isShared = false) => items.length > 0 && <section data-process-shared={isShared} className={isShared ? styles.shared : styles.regions}>
    <h3 className={styles.groupTitle}>{title}</h3>
    <div className={styles.sectionGrid} style={{ gridTemplateColumns: d.sectionLayout === 'column' ? '1fr' : `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))` }}>
      {items.map(s => <div key={s.index} className={styles.cell} data-process-cell={`section:${s.index}`} data-changed={changes.sections.has(s.index)}>
        <span className={styles.fieldName}>{s.name}</span>
        {s.value !== undefined && <strong data-section-value={s.name}>{s.value}</strong>}
        {changes.sections.has(s.index) && <span className={styles.changeMark} aria-label="이전 장면에서 변경됨" title="이전 장면에서 변경됨" />}
      </div>)}
    </div>
  </section>;
  return <div data-process={id} data-process-active={!!active} className={styles.process} style={{ width: d.width ?? 360,
    borderColor: active ? d.color ?? '#0f766e' : undefined, outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
    <Handle id="t-s" type="source" position={Position.Top} /><Handle id="r-s" type="source" position={Position.Right} />
    <Handle id="b-t" type="target" position={Position.Bottom} /><Handle id="l-t" type="target" position={Position.Left} />
    <header className={styles.header}><strong style={{ color: d.color }}>{d.label || '프로세스'}</strong><span>주소 공간</span></header>
    <div ref={bodyRef} className={styles.body}>
      {renderSections(other, '메모리 영역')}
      {renderSections(shared, '공유 영역', true)}
      {linked && <ProcessRelations container={bodyRef} signature={JSON.stringify(d)} />}
      <div className={styles.threads} data-thread-layout={d.threadLayout ?? 'row'} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, marginTop: linked ? 26 : 16, rowGap: linked ? 28 : 12 }}>
        {threads.map(t => <section key={t.id} data-thread={t.id} data-active={t.id === d.activeThreadId} className={styles.thread}>
          {t.id === d.activeThreadId && <svg aria-hidden="true" className={styles.orbit} width="100%" height="100%"><rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="10" /></svg>}
          <h3 className={styles.threadTitle}><span>{t.label}</span>{t.id === d.activeThreadId && <span className={styles.current}>현재</span>}</h3>
          <div className={styles.threadValues}>{fields.map(field => <div key={field} className={styles.cell} data-process-cell={`${t.id}:${field}`} data-changed={changes.threads[t.id]?.has(field) ?? false}>
            <span className={styles.fieldName}>{fieldLabels[field]}</span><strong>{t[field]}</strong>
            {changes.threads[t.id]?.has(field) && <span className={styles.changeMark} aria-label="이전 장면에서 변경됨" title="이전 장면에서 변경됨" />}
          </div>)}</div>
        </section>)}
      </div>
      {sections.length === 0 && threads.length === 0 && <p className={styles.empty}>표시할 항목이 없습니다.</p>}
    </div>
  </div>;
}
