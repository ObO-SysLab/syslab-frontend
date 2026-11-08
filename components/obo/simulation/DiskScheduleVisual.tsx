'use client';

import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { diskSnapshot, policyNames, type DsSnapshot } from './diskScheduleModel';
import { around } from './rulePrefix';
import { RuleExplanation } from './RuleExplanation';
import styles from './RuleBoard.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const phaseNames: Record<DsSnapshot['phase'], string> = { initial: '시작 전', move: '헤드 이동', service: '요청 처리', wrap: '되감기' };
// The path labels live in a left column (one per row) so they never cross the head path.
const W = 560, L = 86, R = 18, AXIS = 38, TOP = 62;

function Path({ s }: { s: DsSnapshot }) {
  const x = (p: number) => L + (W - L - R) * p / s.max;
  // Row count comes from the input (every request, the far end and a wrap), so the scale never depends on future events.
  const rows = s.requests.length + 3, gap = Math.min(22, 200 / rows), height = TOP + rows * gap + 8;
  const sorted = [...s.requests].sort((a, b) => a.position - b.position), level = new Map<string, number>(), lastX = [-99, -99, -99];
  for (const r of sorted) { const px = x(r.position), k = lastX.findIndex(v => px - v >= 16); const at = k < 0 ? 0 : k; level.set(r.id, at); lastX[at] = px; }
  const y = (k: number) => TOP + k * gap;
  return <svg className={styles.svg} viewBox={`0 0 ${W} ${height}`} role="img" aria-label="실린더 축과 헤드 경로" data-ds-path style={{ maxHeight: 290 }}>
    <line x1={L} y1={AXIS} x2={W - R} y2={AXIS} stroke="#9aa9b9" strokeWidth="3" strokeLinecap="round" />
    <text x={L - 10} y={AXIS + 4} fontSize="11" fontWeight="700" fill="#6d8297" textAnchor="end">실린더</text>
    <text x={L} y={AXIS + 16} fontSize="10" fill="#8193a6">0</text><text x={W - R} y={AXIS + 16} fontSize="10" fill="#8193a6" textAnchor="end">{s.max}</text>
    {s.requests.map(r => {
      const served = r.order !== null, stop = s.path.findIndex(p => p.service === r.id);
      return <g key={r.id} data-ds-request={r.id} data-served={served}>
        {stop >= 0 && <line x1={x(r.position)} y1={AXIS} x2={x(r.position)} y2={y(stop)} stroke="#d4deea" strokeWidth="1" strokeDasharray="2 3" />}
        <circle cx={x(r.position)} cy={AXIS} r={r.current ? 7 : 5.5} fill={served ? '#1d3f6b' : '#fff'} stroke={r.current ? '#245ac4' : '#1d3f6b'} strokeWidth={r.current ? 3 : 2} />
        <text x={x(r.position)} y={AXIS - 11 - level.get(r.id)! * 11} fontSize="11" fontWeight="750" fill={served ? '#8193a6' : '#20334a'} textAnchor="middle">{r.label.length > 4 ? `${r.label.slice(0, 3)}…` : r.label}<title>{`${r.label} · ${r.position}`}</title></text>
      </g>;
    })}
    {s.path.slice(1).map((p, k) => <line key={k} x1={x(s.path[k].position)} y1={y(k)} x2={x(p.position)} y2={y(k + 1)} stroke={p.wrap ? '#8193a6' : '#245ac4'} strokeWidth="2.6" strokeDasharray={p.wrap ? '6 5' : undefined} data-ds-segment={`${s.path[k].position}-${p.position}${p.wrap ? ':wrap' : ''}`} />)}
    {s.path.map((p, k) => {
      const last = k === s.path.length - 1, name = k === 0 ? '시작' : p.service ? s.requests.find(r => r.id === p.service)?.label ?? p.service : p.wrap ? '되감기' : '끝';
      return <g key={`v${k}`} data-ds-stop={k}>
        {gap >= 11 && <text x={L - 10} y={y(k) + 4} fontSize="11" fill={last ? '#1d3f6b' : '#4f6276'} fontWeight={last ? 800 : 500} textAnchor="end">{`${name.length > 4 ? `${name.slice(0, 3)}…` : name} ${p.position}`}</text>}
        {p.service ? <circle cx={x(p.position)} cy={y(k)} r={last ? 6.5 : 4.5} fill="#245ac4" stroke="#fff" strokeWidth="1.5" /> : <rect x={x(p.position) - 4} y={y(k) - 4} width="8" height="8" fill={k === 0 ? '#fff' : '#8193a6'} stroke="#245ac4" strokeWidth="2" />}
        {last && <circle cx={x(p.position)} cy={y(k)} r="11" fill="none" stroke="#245ac4" strokeWidth="2" opacity=".45" />}
      </g>;
    })}
  </svg>;
}

export function DiskScheduleVisual({ instance, execution, cursor }: Props) {
  let s: DsSnapshot;
  try { s = diskSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-rule-invalid role="status">설정을 확인하세요. 요청 위치와 시작 위치를 완성하면 헤드 경로가 표시됩니다.</p>; }
  const label = (id: string) => s.requests.find(r => r.id === id)?.label ?? id;
  const current = s.requests.findIndex(r => r.current), win = around(s.requests, Math.max(0, current), 16);
  return <div className={styles.visual} data-ds-visual data-ds-phase={s.phase}>
    <div className={styles.context}><strong className={styles.policy}>{policyNames[s.policy]}{s.policy === 'SCAN' || s.policy === 'CSCAN' ? (s.direction === 1 ? ' · 큰 번호 쪽 →' : ' · ← 작은 번호 쪽') : ''}</strong>
      <b className={styles.phase}>{phaseNames[s.phase]}{s.phase === 'service' && s.served.length ? ` · ${label(s.served.at(-1)!)}` : ''}</b>
      <span className={styles.stats}><span>헤드<b data-ds-head={s.head}>{s.head}</b></span><span>누적 이동<b data-ds-distance={s.distance}>{s.distance}</b></span></span></div>
    <div className={styles.main}>
      <section className={styles.section}><Path s={s} /></section>
      <div className={styles.side}>
        <div className={styles.panel} data-ds-served={s.served.join(',')}><h4>처리 순서 <span>{s.served.length} / {s.requests.length}</span></h4>
          {s.served.length ? <ol className={styles.strip}>{s.served.length > 12 && <li className={styles.more}>…</li>}{s.served.slice(-12).map((id, i, tail) => <li key={id} data-status={i === tail.length - 1 && s.phase === 'service' ? 'current' : 'done'}>{label(id)}</li>)}</ol> : <span className={styles.muted}>아직 처리한 요청이 없습니다.</span>}</div>
        {s.finished && <p className={styles.verdict} data-tone="info">총 이동 거리 {s.distance}. 같은 요청도 정책에 따라 거리가 달라집니다.</p>}
        <p className={styles.footnote}>회전 지연·전송 시간은 다루지 않습니다. 거리는 지나간 실린더 수의 합입니다.</p>
      </div>
    </div>
    <section className={styles.section}><h4>요청 <span>도착 순 · 위치</span></h4>
      <ol className={styles.strip} data-ds-requests>{win.start > 0 && <li className={styles.more}>…</li>}{win.items.map(r => <li key={r.id} data-status={r.current ? 'current' : r.order !== null ? 'done' : 'pending'}>{r.label} {r.position}</li>)}{win.start + win.items.length < s.requests.length && <li className={styles.more}>…</li>}</ol></section>
  </div>;
}

export function DiskScheduleExplanation(props: { instance: SimulationInstance; execution: ModelRun | null; cursor: number; onChange?: (id: string, text: string) => void; onAdd?: () => void }) {
  let summary: string;
  try { summary = diskSnapshot(props.instance, props.execution, props.cursor).summary; }
  catch { summary = '입력 설정을 확인하면 디스크 헤드 이동을 볼 수 있습니다.'; }
  return <RuleExplanation {...props} summary={summary} name="디스크 스케줄링" />;
}
