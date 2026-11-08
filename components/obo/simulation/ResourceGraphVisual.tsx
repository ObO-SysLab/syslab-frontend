'use client';

import { useId } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { ragSnapshot, type RagAction, type RagSnapshot, type RagState } from './resourceGraphModel';
import { around } from './rulePrefix';
import { RuleExplanation } from './RuleExplanation';
import styles from './RuleBoard.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const palette = ['#4f6fd8', '#2f8a6d', '#c2571a', '#8a4fc0', '#1f7fa8', '#b7791f', '#c2416b', '#5b7a2a'];
const phaseNames: Record<RagSnapshot['phase'], string> = { initial: '시작 전', request: '요청', grant: '할당', release: '반납', detect: '교착 검출' };
const stateNames: Record<RagState, string> = { idle: '—', holding: '보유', waiting: '요청 대기', deadlocked: '교착' };
const ROW = 76, PX = 70, RX = 390;

function vector(values: number[], names: string[]) {
  const parts = values.flatMap((v, i) => v > 0 ? [v > 1 ? `${names[i]}×${v}` : names[i]] : []);
  return parts.length ? parts.join(', ') : '—';
}
const actionText = (a: RagAction, names: string[]) => `${a.label} ${a.op === 'request' ? '요청' : '반납'} ${vector(a.values, names)}`;

function Graph({ s, color }: { s: RagSnapshot; color: (id: string) => string }) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const rows = Math.max(s.processes.length, s.resources.length), height = rows * ROW + 16;
  const py = (i: number) => 8 + ROW / 2 + i * ROW + (rows - s.processes.length) * ROW / 2;
  const ry = (i: number) => 8 + ROW / 2 + i * ROW + (rows - s.resources.length) * ROW / 2;
  const boxW = (n: number) => Math.min(150, Math.max(78, n * 15 + 22));
  return <svg className={styles.svg} viewBox={`0 0 560 ${height}`} role="img" aria-label="자원 할당 그래프" data-rag-graph style={{ maxHeight: 300 }}>
    <defs>
      <marker id={`${id}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#3b5f9a" /></marker>
      <marker id={`${id}r`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#c27a12" /></marker>
      <marker id={`${id}d`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#c0261a" /></marker>
    </defs>
    {s.edges.map(e => {
      const p = s.processes.findIndex(x => x.id === e.process), r = s.resources.findIndex(x => x.id === e.resource);
      const [x1, y1, x2, y2] = e.kind === 'request' ? [PX + 28, py(p), RX - 4, ry(r)] : [RX - 4, ry(r), PX + 30, py(p)];
      const bend = e.kind === 'request' ? -14 : 14, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bend;
      const stroke = e.deadlocked ? '#c0261a' : e.kind === 'request' ? '#c27a12' : '#3b5f9a';
      return <g key={`${e.kind}-${e.process}-${e.resource}`} data-rag-edge={`${e.kind}:${e.process}-${e.resource}`} data-deadlocked={e.deadlocked}>
        <path d={`M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={e.deadlocked ? 3.2 : 2.2} strokeDasharray={e.kind === 'request' ? '7 5' : undefined} markerEnd={`url(#${id}${e.deadlocked ? 'd' : e.kind === 'request' ? 'r' : 'a'})`} />
        {e.count > 1 && <text x={mx} y={my - 4} fontSize="13" fontWeight="800" fill={stroke} textAnchor="middle">×{e.count}</text>}
      </g>;
    })}
    {s.processes.map((p, i) => <g key={p.id} data-rag-process={p.id} data-state={p.state}>
      <circle cx={PX} cy={py(i)} r="27" fill={p.state === 'deadlocked' ? '#fff1ef' : '#fff'} stroke={p.state === 'deadlocked' ? '#c0261a' : p.eventActor ? '#245ac4' : color(p.id)} strokeWidth={p.state === 'deadlocked' || p.eventActor ? 4 : 2.5} />
      <text x={PX} y={py(i) + 5} fontSize="15" fontWeight="800" fill="#20334a" textAnchor="middle">{p.label.length > 6 ? `${p.label.slice(0, 5)}…` : p.label}<title>{p.label}</title></text>
    </g>)}
    {s.resources.map((r, i) => {
      const w = boxW(r.total), dots = r.owners.slice(0, 8);
      return <g key={r.id} data-rag-resource={r.id} data-available={r.available}>
        <rect x={RX} y={ry(i) - 26} width={w} height="52" rx="7" fill="#f8fafc" stroke="#7d8fa3" strokeWidth="2" />
        <text x={RX + 10} y={ry(i) - 8} fontSize="13" fontWeight="800" fill="#20334a">{r.label.length > 8 ? `${r.label.slice(0, 7)}…` : r.label}<title>{r.label}</title></text>
        {dots.map((o, k) => <circle key={k} cx={RX + 16 + k * 15} cy={ry(i) + 11} r="5.5" fill={o ? color(o) : '#fff'} stroke={o ? color(o) : '#8193a6'} strokeWidth="1.6"><title>{o ? `${o} 보유` : '가용'}</title></circle>)}
        {r.total > 8 && <text x={RX + w - 8} y={ry(i) + 15} fontSize="11" fill="#5b6f84" textAnchor="end">{r.total}</text>}
      </g>;
    })}
  </svg>;
}

export function ResourceGraphVisual({ instance, execution, cursor }: Props) {
  let s: RagSnapshot;
  try { s = ragSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-rule-invalid role="status">설정을 확인하세요. 프로세스·자원과 행동을 완성하면 할당 그래프가 표시됩니다.</p>; }
  const ids = s.processes.map(p => p.id), color = (id: string) => palette[Math.max(0, ids.indexOf(id)) % palette.length];
  const names = s.resources.map(r => r.label), current = s.action?.index ?? (s.phase === 'detect' ? s.actions.length - 1 : 0), win = around(s.actions, current);
  return <div className={styles.visual} data-rag-visual data-rag-phase={s.phase}>
    <div className={styles.context}><b className={styles.phase} data-tone={s.detected ? (s.deadlocked.length ? 'bad' : 'good') : undefined}>{phaseNames[s.phase]}{s.actor ? ` · ${s.processes.find(p => p.id === s.actor)?.label ?? s.actor}` : ''}</b>
      <span className={styles.stats}><span>실선 = 보유 · 점선 = 요청</span></span></div>
    <div className={styles.main}>
      <section className={styles.section}><Graph s={s} color={color} /></section>
      <div className={styles.side}>
        <div className={styles.panel} data-rag-available={s.resources.map(r => r.available).join(',')}><h4>가용 자원</h4>
          {s.resources.map(r => <span key={r.id}><b>{r.label}</b> {r.available} / {r.total}</span>)}</div>
        <table className={styles.table} data-rag-table><thead><tr><th>프로세스</th><th>보유</th><th>요청</th><th>상태</th></tr></thead>
          <tbody>{s.processes.map(p => <tr key={p.id} data-state={p.state} data-actor={p.eventActor}><td title={p.id}>{p.label}</td><td>{vector(p.holds, names)}</td><td>{vector(p.wants, names)}</td><td>{stateNames[p.state]}</td></tr>)}</tbody></table>
        {s.detected ? <p className={styles.verdict} data-tone={s.deadlocked.length ? 'bad' : 'good'} data-rag-deadlocked={s.deadlocked.join(',')}>{s.deadlocked.length
          ? `교착: ${s.deadlocked.map(id => s.processes.find(p => p.id === id)!.label).join(', ')} — 서로가 보유한 자원을 기다립니다.`
          : '교착 상태인 프로세스가 없습니다.'}{s.multiInstance ? ' 자원이 여러 개라 순환이 아닌 가용량 계산으로 판정했습니다.' : ''}</p>
          : <p className={styles.footnote}>교착 여부는 마지막 검출 단계에서 현재 보유·요청·가용으로 계산합니다.</p>}
      </div>
    </div>
    {s.actions.length > 0 && <section className={styles.section}><h4>행동 순서</h4>
      <ol className={styles.strip} data-rag-actions>{win.start > 0 && <li className={styles.more}>…</li>}{win.items.map(a => <li key={a.index} data-status={a.status} data-rag-action={a.index}>{actionText(a, names)}</li>)}{win.start + win.items.length < s.actions.length && <li className={styles.more}>…</li>}</ol></section>}
  </div>;
}

export function ResourceGraphExplanation(props: { instance: SimulationInstance; execution: ModelRun | null; cursor: number; onChange?: (id: string, text: string) => void; onAdd?: () => void }) {
  let summary: string;
  try { summary = ragSnapshot(props.instance, props.execution, props.cursor).summary; }
  catch { summary = '입력 설정을 확인하면 자원 할당 그래프를 볼 수 있습니다.'; }
  return <RuleExplanation {...props} summary={summary} name="자원 할당 그래프" />;
}
