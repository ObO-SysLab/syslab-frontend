'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { pageComparison, pageSnapshot, type PageComparisonRow, type PageFrame, type PageSnapshot } from './pageReplacementModel';
import styles from './PageReplacementVisual.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
/** Saved documents may still hold the raw record keys; map them to the same display groups. */
const legacy: Record<string, string> = { index: '참조열', page: '참조열', frames: '프레임', victim: '프레임', hit: 'Hit/Miss', 부재: 'Hit/Miss' };
// About one row at the default 900px width, so long strings never scroll.
const WINDOW = 16;

function groups(view: SimulationView) {
  if (!view.fields.length) return { refs: true, frames: true, faults: true };
  const chosen = new Set(view.fields.map(f => legacy[f] ?? f));
  return { refs: chosen.has('참조열'), frames: chosen.has('프레임'), faults: chosen.has('Hit/Miss') };
}

function basis(s: PageSnapshot, f: PageFrame) {
  if (f.page === null) return null;
  if (s.policy === 'FIFO') return f.loadedAt === 0 ? '처음부터 있음' : `${f.loadedAt}번째에 들어옴`;
  if (s.policy === 'LRU') return f.usedAt === 0 ? '처음부터 있음' : `${f.usedAt}번째에 사용`;
  return f.nextUse === null ? '다시 안 씀' : `다음 사용 ${f.nextUse}번째`;
}

function RefStrip({ s, showMarks }: { s: PageSnapshot; showMarks: boolean }) {
  const at = s.current?.index ?? -1;
  // Long strings show a window around the current position instead of scrolling.
  const start = s.refs.length <= WINDOW ? 0 : Math.min(Math.max(0, at - Math.floor(WINDOW / 2)), s.refs.length - WINDOW);
  const shown = s.refs.slice(start, start + WINDOW);
  return <section className={styles.refs} data-page-refs><h4>참조열 <span>{s.refs.length}개{at >= 0 ? ` · ${at + 1}번째` : ''}</span></h4>
    {s.refs.length === 0 ? <p className={styles.empty}>참조할 페이지가 없습니다.</p> : <ol className={styles.refList}>
      {start > 0 && <li className={styles.more} aria-hidden="true">…</li>}
      {shown.map(r => <li key={r.index} className={styles.ref} data-page-ref={r.index} data-page-ref-state={r.state} data-page-ref-hit={showMarks && r.hit !== null ? r.hit : undefined}>
        <span className={styles.refPage}>{r.page}</span>
        {showMarks && r.hit !== null && <span className={styles.refMark}>{r.hit ? 'Hit' : 'Miss'}</span>}
      </li>)}
      {start + WINDOW < s.refs.length && <li className={styles.more} aria-hidden="true">…</li>}
    </ol>}
  </section>;
}

function Frames({ s }: { s: PageSnapshot }) {
  return <section className={styles.framesBox} data-page-frames><h4>프레임 <span>{s.frames.length}칸</span></h4>
    <div className={styles.frames}>{s.frames.map(f => <div key={f.slot} className={styles.frame} data-page-slot={f.slot} data-page-current={f.current} data-page-incoming={f.incoming} data-page-hit={f.current && s.phase === 'hit'} data-page-empty={f.page === null}>
      <span className={styles.slotNo}>{f.slot + 1}</span>
      <strong className={styles.framePage}>{f.page === null ? '빈 칸' : f.page}</strong>
      {basis(s, f) && <span className={styles.basis} data-page-basis>{basis(s, f)}</span>}
      {f.left !== null && <span className={styles.left} data-page-left={f.left}>{f.left} 나감</span>}
    </div>)}</div>
  </section>;
}

function RecordVisual({ s, view }: { s: PageSnapshot; view: SimulationView }) {
  const g = groups(view);
  const result = s.phase === 'initial' ? '시작 전' : s.phase === 'hit' ? 'Hit' : s.phase === 'load' ? 'Miss · 빈 칸에 적재' : 'Miss · 교체';
  return <div className={styles.visual} data-page-visual data-page-phase={s.phase} data-page-policy={s.policy}>
    <div className={styles.context}>
      <strong className={styles.policy}>{s.policy}</strong>
      {(g.refs || g.frames) && s.current && <b className={styles.result} data-page-result={s.phase}>{g.refs ? `페이지 ${s.current.page} 참조 · ` : ''}{result}</b>}
      {g.faults && <span className={styles.faults} data-page-faults={s.faults}>Miss <b>{s.faults}</b>회</span>}
    </div>
    {g.refs && <RefStrip s={s} showMarks={g.faults} />}
    {g.frames && <Frames s={s} />}
    {!g.refs && !g.frames && !g.faults && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

const resultText = (s: PageSnapshot) => s.phase === 'initial' ? '시작 전' : s.phase === 'hit' ? 'Hit' : s.phase === 'load' ? 'Miss · 빈 칸에 적재' : `Miss · ${s.current!.victim} 나감`;

function CompareVisual({ rows, view }: { rows: PageComparisonRow[]; view: SimulationView }) {
  const g = groups(view), primary = rows.find(r => r.primary)!.snapshot;
  return <div className={styles.visual} data-page-visual data-page-compare data-page-phase={primary.phase}>
    {g.refs && <RefStrip s={primary} showMarks={false} />}
    {(g.frames || g.faults) && <div className={styles.compare}>{rows.map(({ policy, primary: own, snapshot: s }) => <section key={policy} className={styles.compareRow} data-page-policy-row={policy} data-page-primary={own}>
      <div className={styles.compareHead}><strong className={styles.policy}>{policy}{policy === 'OPT' && <sup title="미래 참조를 아는 교육용 기준">★</sup>}</strong>{own && <span className={styles.ownTag}>문제 정책</span>}</div>
      {g.frames && <div className={styles.miniFrames}>{s.frames.map(f => <span key={f.slot} className={styles.miniFrame} data-page-slot={f.slot} data-page-incoming={f.incoming} data-page-hit={f.current && s.phase === 'hit'} data-page-empty={f.page === null}>{f.page === null ? '·' : f.page}</span>)}</div>}
      {g.frames && <span className={styles.compareResult} data-page-result={s.phase}>{resultText(s)}</span>}
      {g.faults && <span className={styles.compareFaults} data-page-faults={s.faults}>Miss <b>{s.faults}</b></span>}
    </section>)}</div>}
    <p className={styles.compareNote}>★ OPT는 앞으로의 참조를 아는 교육용 기준입니다. 문제 정책이 아닌 행은 같은 입력으로 따로 실행한 비교용 결과입니다.</p>
  </div>;
}

export function PageReplacementVisual({ instance, execution, cursor, view }: Props) {
  try {
    if (instance.scenarioId === 'OPT') return <CompareVisual rows={pageComparison(instance, execution, cursor)} view={view} />;
    return <RecordVisual s={pageSnapshot(instance, execution, cursor)} view={view} />;
  } catch { return <p className={styles.invalid} data-page-invalid role="status">설정을 확인하세요. 참조열과 프레임 수를 완성하면 교체 과정이 표시됩니다.</p>; }
}

export function PageReplacementExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = pageSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 페이지 교체 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="페이지 교체 하단 설명" data-page-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`페이지 교체 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
