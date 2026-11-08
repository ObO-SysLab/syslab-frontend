'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import styles from './RuleBoard.module.css';

/** Lower explanation shared by the MF/S3/DP/DS rule visuals: automatic summary plus authored annotation views. */
export function RuleExplanation({ instance, execution, cursor, summary, name, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number; summary: string; name: string;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label={`${name} 하단 설명`} data-rule-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`${name} 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={e => onChange(view.id, e.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
