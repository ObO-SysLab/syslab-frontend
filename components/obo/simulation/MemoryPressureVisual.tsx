'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { pressureSnapshot, type PressureSnapshot } from './memoryPressureModel';
import styles from './PageReplacementVisual.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const WINDOW = 16;

function Stream({ s }: { s: PressureSnapshot }) {
  const at = s.current?.index ?? -1;
  const start = s.refs.length <= WINDOW ? 0 : Math.min(Math.max(0, at - Math.floor(WINDOW / 2)), s.refs.length - WINDOW);
  return <section className={styles.refs} data-page-refs><h4>참조 흐름 <span>{s.refs.length}개{at >= 0 ? ` · ${at + 1}번째` : ''}</span></h4>
    {s.refs.length === 0 ? <p className={styles.empty}>참조가 없습니다.</p> : <ol className={styles.refList}>
      {start > 0 && <li className={styles.more} aria-hidden="true">…</li>}
      {s.refs.slice(start, start + WINDOW).map(r => <li key={r.index} className={styles.ref} data-page-ref={r.index} data-page-ref-state={r.state} data-page-ref-hit={r.hit ?? undefined}>
        <span className={styles.refProc}>{r.id}</span><span className={styles.refPage}>{r.page}</span>
        {r.hit !== null && <span className={styles.refMark}>{r.hit ? 'Hit' : 'Miss'}</span>}
      </li>)}
      {start + WINDOW < s.refs.length && <li className={styles.more} aria-hidden="true">…</li>}
    </ol>}
  </section>;
}

export function MemoryPressureVisual({ instance, execution, cursor }: Props) {
  let s: PressureSnapshot;
  try { s = pressureSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-page-invalid role="status">설정을 확인하세요. 할당량·예산과 참조 흐름을 완성하면 프로세스별 과정이 표시됩니다.</p>; }
  return <div className={styles.visual} data-page-visual data-pressure-visual>
    <div className={styles.context}><strong className={styles.policy}>LRU · 고정 할당</strong><b className={styles.result}>작업 집합 기준 최근 {s.window}번</b></div>
    <Stream s={s} />
    <div className={styles.compare}>{s.processes.map(p => <section key={p.id} className={styles.compareRow} data-pressure-process={p.id} data-page-primary={p.current} data-pressure-needs-more={p.needsMore}>
      <div className={styles.compareHead}><strong className={styles.capacity} title={p.id}>{p.label}</strong>{p.current && <span className={styles.ownTag}>현재 참조</span>}</div>
      <div className={styles.miniFrames}>{p.frames.map(f => <span key={f.slot} className={styles.miniFrame} data-page-slot={f.slot} data-page-incoming={f.incoming} data-page-hit={f.current && !f.incoming} data-page-empty={f.page === null}>{f.page === null ? '·' : f.page}</span>)}</div>
      <div className={styles.pressure}>
        <span className={styles.pressureText} data-pressure-ws={p.workingSet} data-pressure-quota={p.quota}>작업 집합 <b>{p.workingSet}</b> / 할당 <b>{p.quota}</b></span>
        <span className={styles.recent}>{p.recent.map((hit, i) => <i key={i} data-hit={hit}>{hit ? 'H' : 'M'}</i>)}</span>
        {p.needsMore && <span className={styles.warn} data-pressure-warning>할당보다 많이 필요 → Miss 반복</span>}
        {p.left !== null && <span className={styles.left} data-page-left={p.left}>{p.left} 나감</span>}
      </div>
      <span className={styles.compareFaults} data-page-faults={p.faults}>Miss <b>{p.faults}</b></span>
    </section>)}</div>
  </div>;
}

export function MemoryPressureExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = pressureSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 메모리 압박 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="메모리 압박 하단 설명" data-pressure-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`메모리 압박 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
