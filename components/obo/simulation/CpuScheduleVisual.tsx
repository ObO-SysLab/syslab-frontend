'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { cpuComparison, cpuSnapshot, type CpuComparisonRow, type CpuSnapshot, type CpuState } from './cpuScheduleModel';
import styles from './CpuScheduleVisual.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const palette = ['#4f6fd8', '#2f8a6d', '#c2571a', '#8a4fc0', '#1f7fa8', '#b7791f', '#c2416b', '#5b7a2a'];
const stateNames: Record<CpuState, string> = { new: '도착 전', ready: '준비', running: '실행', blocked: 'I/O 대기', done: '완료' };
const phaseNames: Record<CpuSnapshot['phase'], string> = { initial: '시작 전', arrive: '도착', dispatch: 'CPU 배정', run: '실행', block: 'I/O 대기 시작', unblock: 'I/O 완료', finish: '완료', idle: '유휴', expire: '할당량 소진', preempt: '선점' };
const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');

function Gantt({ s, color }: { s: CpuSnapshot; color: (id: string) => string }) {
  const pct = (t: number) => `${(t / s.horizon) * 100}%`;
  const idle = s.segments.filter(x => x.actor === null);
  const step = s.horizon <= 20 ? 1 : s.horizon <= 60 ? 5 : 10;
  return <section className={styles.gantt} data-cpu-gantt><h4>실행 기록 <span>시각 {s.time}</span></h4>
    <div className={styles.lanes}>
      {s.jobs.map(j => <div key={j.id} className={styles.lane} data-cpu-lane={j.id} data-cpu-current={j.current}>
        <span className={styles.laneLabel} title={j.id}>{j.label}</span>
        <div className={styles.track}>
          <span className={styles.arrival} style={{ left: pct(j.arrival) }} title={`도착 ${j.arrival}`} />
          {s.segments.filter(x => x.actor === j.id).map(x => <span key={x.start} className={styles.block} data-cpu-block={`${j.id}:${x.start}-${x.end}`} style={{ left: pct(x.start), width: pct(x.end - x.start), background: color(j.id) }}>{x.end - x.start > 1 ? x.end - x.start : ''}</span>)}
          <span className={styles.now} style={{ left: pct(s.time) }} />
        </div>
      </div>)}
      {idle.length > 0 && <div className={styles.lane} data-cpu-lane="idle"><span className={styles.laneLabel}>유휴</span><div className={styles.track}>
        {idle.map(x => <span key={x.start} className={`${styles.block} ${styles.idle}`} style={{ left: pct(x.start), width: pct(x.end - x.start) }} />)}
        <span className={styles.now} style={{ left: pct(s.time) }} />
      </div></div>}
      <div className={styles.axis}><span />{Array.from({ length: Math.floor(s.horizon / step) + 1 }, (_, i) => i * step).map(t => <span key={t} className={styles.tick} style={{ left: pct(t) }}>{t}</span>)}</div>
    </div>
  </section>;
}

function Queue({ s, color }: { s: CpuSnapshot; color: (id: string) => string }) {
  const job = (id: string) => s.jobs.find(j => j.id === id)!;
  const badge = (id: string) => s.model === 'PS' ? `우선순위 ${job(id).priority ?? '—'}` : s.policy === 'SJF' || s.policy === 'SRTF' ? `남은 ${job(id).remaining}` : null;
  return <section className={styles.side}>
    <div className={styles.cpu} data-cpu-running={s.current ?? 'none'}><h4>CPU</h4>
      {s.current ? <><strong style={{ color: color(s.current) }}>{job(s.current).label}</strong>
        {s.quantumUsed !== null && <span className={styles.quantum} data-cpu-quantum={`${s.quantumUsed}/${s.quantum}`}>할당량 {s.quantumUsed} / {s.quantum}</span>}
        {badge(s.current) && <span className={styles.badge}>{badge(s.current)}</span>}</> : <span className={styles.empty}>비어 있음</span>}
    </div>
    <div className={styles.queue} data-cpu-ready={s.ready.join(',')}><h4>준비 큐 <span>{s.model === 'RR' ? '앞 → 뒤' : s.model === 'PS' ? '숫자가 작을수록 먼저' : '대기 순서'}</span></h4>
      {s.ready.length ? <ol>{s.ready.map(id => <li key={id} data-cpu-queued={id}><b style={{ color: color(id) }}>{job(id).label}</b>{badge(id) && <span className={styles.badge}>{badge(id)!.replace('우선순위 ', '우선 ')}</span>}</li>)}</ol> : <p className={styles.empty}>비어 있음</p>}
    </div>
  </section>;
}

function Jobs({ s }: { s: CpuSnapshot }) {
  return <table className={styles.jobs} data-cpu-jobs><thead><tr><th>작업</th><th>도착</th>{s.model === 'PS' && <th>우선순위</th>}<th>남은 실행</th><th>대기(지금까지)</th><th>상태</th></tr></thead>
    <tbody>{s.jobs.map(j => <tr key={j.id} data-cpu-job={j.id} data-cpu-state={j.state} data-cpu-event-actor={j.eventActor}>
      <td title={j.id}>{j.label}</td><td>{j.arrival}</td>{s.model === 'PS' && <td>{j.priority ?? '—'}</td>}<td>{j.remaining}</td><td data-cpu-waiting={j.waiting}>{j.waiting}</td><td>{stateNames[j.state]}</td>
    </tr>)}</tbody>
  </table>;
}

function Compare({ rows, color }: { rows: CpuComparisonRow[]; color: (id: string) => string }) {
  return <section className={styles.compare} data-cpu-compare><h4>같은 시각의 정책 비교 <span>문제 정책이 아닌 행은 같은 작업으로 따로 실행한 비교용 결과</span></h4>
    {rows.map(({ policy, primary, snapshot: s }) => <div key={policy} className={styles.compareRow} data-cpu-policy-row={policy} data-cpu-primary={primary}>
      <strong className={styles.policy}>{policy}</strong>
      <div className={styles.miniTrack}>{s.segments.map(x => <span key={x.start} className={`${styles.block} ${x.actor === null ? styles.idle : ''}`} style={{ left: `${(x.start / s.horizon) * 100}%`, width: `${((x.end - x.start) / s.horizon) * 100}%`, background: x.actor ? color(x.actor) : undefined }}>{x.actor && x.end - x.start > 1 ? s.jobs.find(j => j.id === x.actor)!.label : ''}</span>)}</div>
      <span className={styles.avg} data-cpu-avg={fmt(s.averageWaiting)}>평균 대기 <b>{fmt(s.averageWaiting)}</b></span>
    </div>)}
  </section>;
}

export function CpuScheduleVisual({ instance, execution, cursor }: Props) {
  let s: CpuSnapshot, rows: CpuComparisonRow[] | null = null;
  try { s = cpuSnapshot(instance, execution, cursor); if (s.model === 'G2') rows = cpuComparison(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-cpu-invalid role="status">설정을 확인하세요. 작업과 정책을 완성하면 실행 순서가 표시됩니다.</p>; }
  const ids = s.jobs.map(j => j.id), color = (id: string) => palette[Math.max(0, ids.indexOf(id)) % palette.length];
  return <div className={styles.visual} data-cpu-visual data-cpu-model={s.model} data-cpu-phase={s.phase}>
    <div className={styles.context}><strong className={styles.policy}>{s.policy}{s.model === 'RR' ? ` · 할당량 ${s.quantum}` : ''}</strong><b className={styles.phase}>{phaseNames[s.phase]}{s.eventActor ? ` · ${s.jobs.find(j => j.id === s.eventActor)?.label ?? s.eventActor}` : ''}</b>
      <span className={styles.avgTop} data-cpu-average={fmt(s.averageWaiting)}>평균 대기 <b>{fmt(s.averageWaiting)}</b>{s.finished ? '' : ' (지금까지)'}</span></div>
    <div className={styles.main}><Gantt s={s} color={color} /><Queue s={s} color={color} /></div>
    {rows ? <Compare rows={rows} color={color} /> : <Jobs s={s} />}
  </div>;
}

export function CpuScheduleExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = cpuSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 CPU 스케줄링 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="CPU 스케줄링 하단 설명" data-cpu-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`CPU 스케줄링 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
