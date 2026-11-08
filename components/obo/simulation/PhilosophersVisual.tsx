'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { dpSnapshot, policyNames, type DpSnapshot, type DpState } from './philosophersModel';
import { around } from './rulePrefix';
import { RuleExplanation } from './RuleExplanation';
import styles from './RuleBoard.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const palette = ['#4f6fd8', '#2f8a6d', '#c2571a', '#8a4fc0', '#1f7fa8', '#b7791f', '#c2416b', '#5b7a2a'];
const phaseNames: Record<DpSnapshot['phase'], string> = { initial: '시작 전', think: '생각', request: '포크 요청', acquire: '포크 집기', eat: '식사', release: '포크 내려놓기' };
const stateNames: Record<DpState, string> = { thinking: '생각', hungry: '배고픔', waiting: '대기', eating: '식사' };
const fills: Record<DpState, string> = { thinking: '#f1f5f9', hungry: '#fff5dc', waiting: '#ffe8e1', eating: '#e2f5ea' };
const C = 180, R = 126;

function Table({ s }: { s: DpSnapshot }) {
  // At a deadlock nobody can proceed, so every philosopher and waiting line is drawn as part of the stuck ring.
  const deadlocked = s.stop === 'deadlocked', n = s.philosophers.length;
  const angle = (i: number) => -Math.PI / 2 + 2 * Math.PI * i / n;
  const pos = (i: number) => [C + R * Math.cos(angle(i)), C + R * Math.sin(angle(i))];
  const pr = Math.max(9, Math.min(30, Math.PI * R / n * .72)), color = (id: string) => palette[Math.max(0, s.philosophers.findIndex(p => p.id === id)) % palette.length];
  // A free fork rests on the table between its two philosophers; a held fork moves halfway toward its owner.
  const forkAt = (f: number) => {
    const owner = s.forks[f].owner, a = angle(f) + Math.PI / n, x = C + 76 * Math.cos(a), y = C + 76 * Math.sin(a);
    if (owner === null) return { x, y, a };
    const [ox, oy] = pos(s.philosophers.findIndex(p => p.id === owner));
    return { x: x + (ox - x) * .5, y: y + (oy - y) * .5, a };
  };
  return <svg className={styles.svg} viewBox="0 0 360 360" role="img" aria-label="식사하는 철학자 원탁" data-dp-table style={{ maxHeight: 290 }}>
    <circle cx={C} cy={C} r={R - 40} fill="#f8fafc" stroke="#dbe3ec" strokeWidth="2" />
    {s.philosophers.map((p, i) => {
      if (p.wants === null || (p.state !== 'waiting' && s.forks[p.wants].owner === null)) return null;
      const [x, y] = pos(i), f = forkAt(p.wants), stroke = deadlocked ? '#c0261a' : '#c27a12';
      return <line key={`w${p.id}`} x1={x} y1={y} x2={f.x} y2={f.y} stroke={stroke} strokeWidth={deadlocked ? 2.6 : 2} strokeDasharray="6 4" data-dp-want={`${p.id}:${p.wants}`} />;
    })}
    {s.forks.map(f => {
      const { x, y, a } = forkAt(f.index), dx = Math.cos(a) * 12, dy = Math.sin(a) * 12;
      return <g key={f.index} data-dp-fork={f.index} data-owner={f.owner ?? 'none'}>
        <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={f.owner ? color(f.owner) : '#9aa9b9'} strokeWidth="6" strokeLinecap="round" />
        {n <= 12 && <text x={x + Math.cos(a + Math.PI / 2) * 13} y={y + Math.sin(a + Math.PI / 2) * 13 + 4} fontSize="11" fill="#5b6f84" textAnchor="middle">{f.index + 1}</text>}
      </g>;
    })}
    {s.philosophers.map((p, i) => {
      const [x, y] = pos(i);
      return <g key={p.id} data-dp-philosopher={p.id} data-state={p.state}>
        <circle cx={x} cy={y} r={pr} fill={fills[p.state]} stroke={deadlocked ? '#c0261a' : p.eventActor ? '#245ac4' : color(p.id)} strokeWidth={deadlocked || p.eventActor ? 4 : 2.5} />
        {pr >= 18 && <text x={x} y={y + (pr >= 26 ? -1 : 5)} fontSize="14" fontWeight="800" fill="#20334a" textAnchor="middle">{p.label.length > 5 ? `${p.label.slice(0, 4)}…` : p.label}<title>{p.label}</title></text>}
        {pr >= 26 && <text x={x} y={y + 14} fontSize="10.5" fill="#4f6276" textAnchor="middle">{stateNames[p.state]}</text>}
      </g>;
    })}
  </svg>;
}

export function PhilosophersVisual({ instance, execution, cursor }: Props) {
  let s: DpSnapshot;
  try { s = dpSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-rule-invalid role="status">설정을 확인하세요. 철학자와 순서를 완성하면 원탁이 표시됩니다.</p>; }
  const me = s.philosophers.find(p => p.id === s.actor), win = around(s.turns, Math.max(0, s.turn), 20);
  const waiting = s.phase === 'request' && me?.state === 'waiting';
  return <div className={styles.visual} data-dp-visual data-dp-phase={s.phase} data-dp-stop={s.stop ?? 'none'}>
    <div className={styles.context}><strong className={styles.policy}>{policyNames[s.policy]}</strong>
      <b className={styles.phase} data-tone={s.stop === 'deadlocked' ? 'bad' : s.phase === 'eat' ? 'good' : undefined}>{waiting ? '대기' : phaseNames[s.phase]}{me ? ` · ${me.label}` : ''}</b>
      <span className={styles.stats}><span>식사 합<b>{s.philosophers.reduce((n, p) => n + p.meals, 0)}</b></span></span></div>
    <div className={styles.main}>
      <section className={styles.section}><Table s={s} /></section>
      <div className={styles.side}>
        <table className={styles.table} data-dp-rows><thead><tr><th>철학자</th><th>상태</th><th>든 포크</th><th>식사</th></tr></thead>
          <tbody>{s.philosophers.map(p => <tr key={p.id} data-state={s.stop === 'deadlocked' ? 'deadlocked' : p.state} data-actor={p.eventActor}><td title={p.id}>{p.label}</td><td>{stateNames[p.state]}</td>
            <td>{p.forks.length ? p.forks.map(f => f + 1).join(', ') : '—'}{p.wants !== null && p.forks.length < 2 ? <span className={styles.muted}> → {p.wants + 1}</span> : null}</td>
            <td>{p.goal !== null ? `${p.meals} / ${p.goal}` : p.meals}</td></tr>)}</tbody></table>
        {s.stop === 'deadlocked' && <p className={styles.verdict} data-tone="bad">교착: 모두 포크 하나씩 들고 이웃의 포크를 기다려 아무도 먹지 못합니다.</p>}
        {s.stop === 'scheduleEnd' && <p className={styles.verdict} data-tone="info">이 순서는 교착 없이 끝났습니다. 다른 순서에서도 그렇다는 증명은 아닙니다.</p>}
        {s.stop === 'goalReached' && <p className={styles.verdict} data-tone="good">식사 목표에 도달했습니다.</p>}
        <p className={styles.footnote}>포크 k는 k번째와 그다음 철학자 사이에 있습니다. 점선은 기다리는 포크입니다.</p>
      </div>
    </div>
    <section className={styles.section}><h4>실행 순서 <span>{s.mode === 'findSchedule' ? '목표에 도달하면 멈춤' : '정해진 순서'}</span></h4>
      <ol className={styles.strip} data-dp-turns>{win.start > 0 && <li className={styles.more}>…</li>}{win.items.map(t => <li key={t.index} data-status={t.status} data-dp-turn={t.index}>{t.label}</li>)}{win.start + win.items.length < s.turns.length && <li className={styles.more}>…</li>}</ol></section>
  </div>;
}

export function PhilosophersExplanation(props: { instance: SimulationInstance; execution: ModelRun | null; cursor: number; onChange?: (id: string, text: string) => void; onAdd?: () => void }) {
  let summary: string;
  try { summary = dpSnapshot(props.instance, props.execution, props.cursor).summary; }
  catch { summary = '입력 설정을 확인하면 식사하는 철학자 과정을 볼 수 있습니다.'; }
  return <RuleExplanation {...props} summary={summary} name="식사하는 철학자" />;
}
