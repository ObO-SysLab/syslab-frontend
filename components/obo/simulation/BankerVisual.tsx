'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { bankerSnapshot } from './bankerModel';
import styles from './BankerVisual.module.css';

type Snapshot = ReturnType<typeof bankerSnapshot>;
type VisualProps = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const fieldNames = ['Need', 'Work', 'Finish', 'Available', 'Allocation', 'Max'];
const phaseLabels: Record<Snapshot['requestPhase'], string> = {
  none: '안전성 검사', pending: '요청 전', requested: '요청 확인', testing: '가정 배정 · 검사 중',
  'denied-unavailable': '요청 거절 · 가용량 부족', 'denied-unsafe': '요청 거절 · 안전성 미확인', granted: '요청 허용',
};
const eventNames: Record<string, string> = { request: '요청', check: '안전성 검사', finish: '가정 완료', grant: '요청 허용', deny: '요청 거절' };

function Status({ row, compare }: { row: Snapshot['rows'][number]; compare: boolean }) {
  const text = row.finished ? '가정 완료' : row.current ? '현재 확인' : compare ? row.eligible ? '충족' : '부족' : '미완료';
  return <span className={styles.status} data-banker-status={row.finished ? 'finished' : row.current ? 'current' : compare && !row.eligible ? 'shortfall' : 'pending'}>{text}</span>;
}

function Vector({ snapshot, values, label, kind }: { snapshot: Snapshot; values: number[]; label: string; kind: string }) {
  return <section className={styles.vectorSection} data-banker-vector={kind} aria-label={label}>
    <h4>{label}</h4>
    <div className={styles.vector}>{snapshot.resources.map((id, i) => <div key={id} data-banker-resource={id}>
      <span>{snapshot.resourceLabels[i]}</span><strong data-banker-value>{values[i]}</strong>
    </div>)}</div>
  </section>;
}

function Matrix({ snapshot, field }: { snapshot: Snapshot; field: 'Allocation' | 'Max' }) {
  const title = field === 'Allocation' ? snapshot.tentative ? '가정 배정량 · Allocation' : '배정량 · Allocation' : '최대 요구량 · Max';
  return <section className={styles.matrixSection} data-banker-matrix={field}>
    <h4>{title}</h4>
    <div className={`${styles.tableScroll} nodrag nowheel`} tabIndex={0} aria-label={`${title} 표`}>
      <table className={styles.table} style={{ minWidth: 150 + snapshot.resources.length * 78 }}>
        <thead><tr><th scope="col">프로세스</th>{snapshot.resources.map((id, i) => <th scope="col" key={id}>{snapshot.resourceLabels[i]}</th>)}</tr></thead>
        <tbody>{snapshot.rows.map(row => <tr key={row.actor} data-banker-actor={row.actor}>
          <th scope="row">{row.label}</th>{(field === 'Allocation' ? row.allocated : row.max).map((value, i) => <td key={snapshot.resources[i]}>{value}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const fields = new Set(view.fields.length ? view.fields : fieldNames);
  const need = fields.has('Need'), work = fields.has('Work'), finish = fields.has('Finish');
  const compare = need && work;
  const requestActive = s.requestPhase !== 'none';
  return <div className={styles.record} data-banker-role="record" data-banker-visual data-banker-phase={s.requestPhase}>
    <div className={styles.context}>
      <span className={styles.contextLabel}>{phaseLabels[s.requestPhase]}</span>
      {finish && s.finalSafety !== null && <strong data-banker-result={s.finalSafety ? 'safe' : 'unsafe'}>{s.finalSafety ? '안전 순서 확인' : '전체 완료 순서 미확인'}</strong>}
      {requestActive && s.request && <span className={styles.requestActor}>{s.request.label}</span>}
    </div>
    {requestActive && s.request && <div className={styles.requestValues} data-banker-request aria-label={`${s.request.label} 추가 요청 수량`}>
      <span>추가 요청</span>{s.request.values.map((value, i) => <span key={s.resources[i]} className={styles.requestChip} data-banker-request-resource={s.resources[i]}><span>{s.resourceLabels[i]}</span><strong>{value}</strong></span>)}
    </div>}
    {(need || work || finish) && <section data-banker-comparison>
      <div className={styles.sectionHeading}><h4>{compare ? '남은 필요량과 현재 Work' : need ? '남은 필요량 · Need' : work ? '검사 중 가용량 · Work' : '가정 완료 상태 · Finish'}</h4>{compare && <span>Need ≤ Work</span>}</div>
      <div className={`${styles.tableScroll} nodrag nowheel`} tabIndex={0} aria-label="은행원 안전성 비교표">
        <table className={styles.table} style={{ minWidth: 150 + (need || work ? s.resources.length * 88 : 0) + (finish ? 100 : 0) }}>
          <thead><tr><th scope="col">프로세스</th>{(need || work) && s.resources.map((id, i) => <th scope="col" key={id}>{s.resourceLabels[i]}</th>)}{finish && <th scope="col">검사 상태</th>}</tr></thead>
          <tbody>
            {work && <tr className={styles.workRow} data-banker-work>
              <th scope="row">현재 Work</th>{s.work.map((value, i) => <td key={s.resources[i]}><strong data-banker-value>{value}</strong>{s.returned[i] > 0 && <span className={styles.returned} data-banker-return={s.resources[i]}>+{s.returned[i]} 반환</span>}</td>)}{finish && <td />}
            </tr>}
            {(need || finish) && s.rows.map(row => <tr key={row.actor} data-banker-actor={row.actor} data-banker-current={row.current} data-banker-finished={finish && row.finished}>
              <th scope="row">{row.label}{row.current && <span className={styles.currentLabel}>현재</span>}</th>
              {(need || work) && row.need.map((value, i) => <td key={s.resources[i]} data-banker-shortfall={compare && !row.finished && row.deficits[i] > 0}>
                {need ? <><strong data-banker-need={s.resources[i]}>{value}</strong>{compare && !row.finished && row.deficits[i] > 0 && <span className={styles.deficit}>{row.deficits[i]} 부족</span>}</> : <span aria-label="필요량 숨김">—</span>}
              </td>)}
              {finish && <td><Status row={row} compare={compare} /></td>}
            </tr>)}
          </tbody>
        </table>
      </div>
      {finish && <div className={styles.sequence} data-banker-sequence aria-label="확인한 가정 완료 순서">
        <span>가정 완료 순서</span>
        {s.completedSequence.length ? <ol>{s.completedSequence.map((actor, i) => <li key={`${actor}-${i}`} data-banker-completed={actor}><span className={styles.sequenceNumber}>{i + 1}</span>{s.rows.find(row => row.actor === actor)?.label ?? actor}</li>)}</ol> : <span className={styles.muted}>아직 없음</span>}
      </div>}
    </section>}
    {fields.has('Available') && <Vector snapshot={s} values={s.available} label={s.tentative ? '가정 배정 후 가용량 · Available' : '가용량 · Available'} kind="available" />}
    {fields.has('Allocation') && <Matrix snapshot={s} field="Allocation" />}
    {fields.has('Max') && <Matrix snapshot={s} field="Max" />}
    {!fieldNames.some(field => fields.has(field)) && <p className={styles.muted}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function BankerVisual({ instance, execution, cursor, view }: VisualProps) {
  let snapshot: Snapshot;
  try { snapshot = bankerSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} role="status" data-banker-invalid>설정을 확인하세요. 입력을 완성하면 비교표가 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'actor') {
    const rows = snapshot.rows.filter(row => (!view.target || view.target === row.actor) && (!view.fields.length || view.fields.includes(row.label)));
    return <div className={styles.summaries} data-banker-role="actor">{rows.map(row => <div className={styles.actor} key={row.actor} data-banker-actor={row.actor} data-banker-current={row.current} data-banker-finished={row.finished}>
      <strong>{row.label}</strong><Status row={row} compare={false} />
    </div>)}{!rows.length && <p className={styles.muted}>표시할 프로세스가 없습니다.</p>}</div>;
  }
  if (view.role === 'resource') {
    const resources = snapshot.resources.map((id, i) => ({ id, i })).filter(({ id }) => (!view.target || id === view.target) && (!view.fields.length || view.fields.includes(id)));
    return <div className={styles.summaries} data-banker-role="resource">{resources.map(({ id, i }) => <div className={styles.resource} key={id} data-banker-resource={id}>
      <span>{snapshot.resourceLabels[i]}</span><strong data-banker-available>{snapshot.available[i]}</strong><small>{snapshot.tentative ? '가정 배정 후 가용' : '가용'}</small>
    </div>)}{!resources.length && <p className={styles.muted}>표시할 자원이 없습니다.</p>}</div>;
  }
  return null;
}

export function BankerExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = bankerSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 안전성 검사 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor];
  const notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor)
    && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section aria-label="BK 하단 설명" className={styles.explanation} data-banker-explanation>
    <p className={styles.summary} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.notes}>{notes.map((view, i) => <label key={view.id} className={styles.note}>
      <span className={styles.noteHeading}><span>{notes.length === 1 ? '설명' : `설명 ${i + 1}`}</span><small>{view.hidden ? '숨김' : view.when.kind || view.when.actor ? `${eventNames[view.when.kind ?? ''] ?? view.when.kind ?? '모든 사건'} · ${view.when.actor ? (Object.hasOwn(instance.labels, view.when.actor) ? instance.labels[view.when.actor] : view.when.actor) : '모든 프로세스'}` : '항상 표시'}</small></span>
      <textarea aria-label={`BK 설명 ${i + 1}`} rows={3} maxLength={4000} value={view.text} onChange={event => onChange(view.id, event.target.value)} placeholder="이 장면의 비교 기준과 결과를 적으세요." />
    </label>)}{onAdd && <button type="button" onClick={onAdd}>+ 설명 추가</button>}</div> : visible.map(view => <p key={view.id} className={styles.authoredNote}>{view.text}</p>)}
  </section>;
}
