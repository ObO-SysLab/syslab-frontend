'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { fitSnapshot, policyNames, type FitOperation, type FitPolicy, type FitSnapshot } from './memoryFitModel';
import { around } from './rulePrefix';
import { RuleExplanation } from './RuleExplanation';
import styles from './RuleBoard.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const palette = ['#4f6fd8', '#2f8a6d', '#c2571a', '#8a4fc0', '#1f7fa8', '#b7791f', '#c2416b', '#5b7a2a'];
const phaseNames: Record<FitSnapshot['phase'], string> = { initial: '시작 전', allocate: '할당', free: '해제', reject: '거절' };
const short: Record<FitPolicy, string> = { first: 'First', best: 'Best', worst: 'Worst' };
const opText = (o: FitOperation) => o.op === 'alloc' ? `${o.label} ${o.size}` : `${o.label} 해제`;

function AddressBar({ s, color }: { s: FitSnapshot; color: (id: string) => string }) {
  const pct = (n: number) => `${(n / s.total) * 100}%`;
  const bounds = [0, ...s.blocks.slice(1).map(b => b.start), s.total];
  const ticks = bounds.filter((t, i) => i === 0 || i === bounds.length - 1 || (s.blocks.length <= 16 && t / s.total > .05 && (s.total - t) / s.total > .05));
  return <div className={styles.barWrap} data-fit-bar>
    <div className={styles.bar}>
      {s.blocks.map(b => {
        const w = b.size / s.total;
        return <span key={b.start} className={`${styles.seg} ${b.owner === null ? styles.hole : ''}`} data-fit-block={`${b.owner ?? 'free'}:${b.start}+${b.size}`} title={`${b.label ?? '빈 구멍'} · 시작 ${b.start} · 크기 ${b.size}`}
          style={{ left: pct(b.start), width: pct(b.size), background: b.owner === null ? undefined : color(b.owner) }}>
          {w >= .07 ? <>{b.label ?? '빈 구멍'}<small>{b.size}</small></> : w >= .035 ? <small>{b.size}</small> : null}
        </span>;
      })}
      {s.candidates.map(c => <span key={`c${c.start}`} className={styles.mark} data-kind="candidate" data-fit-candidate={`${c.start}+${c.size}`} style={{ left: pct(c.start), width: pct(c.size) }}>
        {c.picks.length > 0 && <span className={styles.picks}>{c.picks.map(p => <b key={p} className={styles.pick} data-primary={p === s.policy}>{short[p]}</b>)}</span>}
      </span>)}
      {s.highlight && <span className={styles.mark} data-kind={s.highlight.kind} data-fit-highlight={`${s.highlight.kind}:${s.highlight.start}+${s.highlight.size}`} style={{ left: pct(s.highlight.start), width: pct(s.highlight.size) }} />}
    </div>
    <div className={styles.ticks}>{ticks.map(t => <span key={t} className={styles.tick} style={{ left: pct(t) }}>{t}</span>)}</div>
  </div>;
}

function Request({ s }: { s: FitSnapshot }) {
  const o = s.operation, next = s.operations.find(x => x.status === 'pending');
  if (!o) return <div className={styles.panel}><h4>현재 요청</h4>{next ? <><span className={styles.big}>{opText(next)}</span><span className={styles.muted}>첫 요청을 기다리는 중</span></> : <span className={styles.muted}>요청이 없습니다.</span>}</div>;
  const placed = s.highlight?.kind === 'placed' ? s.highlight : null, freed = s.highlight?.kind === 'freed' ? s.highlight : null;
  return <div className={styles.panel} data-active="true" data-fit-request={o.id}><h4>현재 요청</h4>
    <span className={styles.big}>{opText(o)}</span>
    {placed && <span>시작 주소 {placed.start}에 크기 {placed.size} 할당</span>}
    {freed && <span>주소 {freed.start}–{freed.start + freed.size} 반환{s.merged ? ' · 이웃 구멍과 합침' : ''}</span>}
    {s.phase === 'reject' && <span>들어갈 구멍 없음</span>}
    {o.op === 'alloc' && s.candidates.length > 0 && <table className={styles.table} data-fit-candidates><thead><tr><th>들어갈 수 있는 구멍</th><th>선택 정책</th></tr></thead>
      <tbody>{s.candidates.map(c => <tr key={c.start}><td>시작 {c.start} · 크기 {c.size}</td><td>{c.picks.map(p => short[p]).join(', ') || '—'}</td></tr>)}</tbody></table>}
  </div>;
}

export function MemoryFitVisual({ instance, execution, cursor }: Props) {
  let s: FitSnapshot;
  try { s = fitSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-rule-invalid role="status">설정을 확인하세요. 메모리 구간과 요청을 완성하면 할당 과정이 표시됩니다.</p>; }
  const owners = [...new Set([...s.blocks.flatMap(b => b.owner ? [b.owner] : []), ...s.operations.map(o => o.id)])].sort();
  const color = (id: string) => palette[Math.max(0, owners.indexOf(id)) % palette.length];
  const current = s.operation?.index ?? -1, win = around(s.operations, Math.max(0, current));
  return <div className={styles.visual} data-fit-visual data-fit-phase={s.phase}>
    <div className={styles.context}><strong className={styles.policy}>{policyNames[s.policy]}</strong>
      <b className={styles.phase} data-tone={s.phase === 'reject' ? 'bad' : undefined}>{phaseNames[s.phase]}{s.operation ? ` · ${s.operation.label}` : ''}</b>
      <span className={styles.stats}><span>빈 공간 합<b data-fit-free={s.freeTotal}>{s.freeTotal}</b></span><span>가장 큰 구멍<b data-fit-largest={s.largest}>{s.largest}</b></span><span>구멍 수<b>{s.holes}</b></span></span></div>
    <div className={styles.main}>
      <section className={styles.section}><h4>주소 공간 <span>0 – {s.total}</span></h4><AddressBar s={s} color={color} />
        <h4 style={{ marginTop: 12 }}>요청 순서</h4>
        <ol className={styles.strip} data-fit-operations>{win.start > 0 && <li className={styles.more}>…</li>}{win.items.map(o => <li key={o.index} data-status={o.status} data-fit-op={o.index}>{opText(o)}{o.status === 'rejected' ? ' ✕' : ''}</li>)}{win.start + win.items.length < s.operations.length && <li className={styles.more}>…</li>}</ol>
      </section>
      <div className={styles.side}><Request s={s} />
        {s.phase === 'reject' && <p className={styles.verdict} data-tone="bad" data-fit-fragmented={s.fragmented}>{s.fragmented
          ? `빈 공간 합 ${s.freeTotal}은 요청 ${s.operation?.size}보다 크지만 가장 큰 구멍이 ${s.largest}이라 담을 수 없습니다. 외부 단편화입니다.`
          : `빈 공간 합 ${s.freeTotal}이 요청 ${s.operation?.size}보다 작습니다.`}</p>}
      </div>
    </div>
    <p className={styles.footnote}>연속 가변 크기 모델입니다. 정렬·관리 정보 비용과 자동 압축(compaction)은 다루지 않습니다.</p>
  </div>;
}

export function MemoryFitExplanation(props: { instance: SimulationInstance; execution: ModelRun | null; cursor: number; onChange?: (id: string, text: string) => void; onAdd?: () => void }) {
  let summary: string;
  try { summary = fitSnapshot(props.instance, props.execution, props.cursor).summary; }
  catch { summary = '입력 설정을 확인하면 메모리 할당 과정을 볼 수 있습니다.'; }
  return <RuleExplanation {...props} summary={summary} name="메모리 할당" />;
}
