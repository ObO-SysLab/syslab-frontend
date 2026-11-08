'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { tlbSnapshot, type TlbSnapshot } from './tlbModel';
import styles from './TlbVisual.module.css';

type VisualProps = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
type Edge = { key: string; from: string; to: string; active: boolean; visited: boolean; direction?: 'down' | 'offset' };
const phases = { initial: '주소 변환', lookup: 'TLB 조회', pageTable: '페이지 테이블 조회', translate: '변환 완료', fault: '페이지 Miss' };
const fields = ['페이지테이블', 'TLB', '페이지', '오프셋'] as const;

function TableRows({ snapshot: s, selected }: { snapshot: TlbSnapshot; selected?: string[] }) {
  const container = useRef<HTMLDivElement>(null);
  const rows = s.pageTable.filter(row => !selected?.length || selected.includes(row.field));
  useEffect(() => {
    const root = container.current, row = root?.querySelector<HTMLElement>('[data-tlb-active="true"]');
    if (!root || !row) return;
    const box = root.getBoundingClientRect(), current = row.getBoundingClientRect();
    const scale = box.height / root.offsetHeight;
    if (!scale) return;
    const top = (current.top - box.top) / scale + root.scrollTop;
    if (current.bottom > box.bottom) root.scrollTop = top + row.offsetHeight - root.clientHeight;
    else if (current.top < box.top + 26 * scale) root.scrollTop = Math.max(0, top - 26);
  }, [s.current?.index, s.phase, selected]);
  return rows.length ? <div ref={container} className={`${styles.tableScroll} nodrag nowheel`} tabIndex={0} aria-label="페이지 테이블 전체 행">
    <table className={styles.table}><thead><tr><th>페이지</th><th>프레임</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.page} data-tlb-table-row={row.page} data-tlb-active={row.active} data-tlb-fault={row.active && s.phase === 'fault'}>
        <td>{row.page}</td><td>{row.frame === null ? <span className={styles.absent}>없음</span> : row.frame}</td>
      </tr>)}
    </tbody></table>
  </div> : <p className={styles.empty}>선택한 페이지가 없습니다.</p>;
}

function Cache({ snapshot: s }: { snapshot: TlbSnapshot }) {
  return <section className={styles.card} data-tlb-node="tlb" data-tlb-current={s.phase === 'lookup'} data-tlb-visited={!!s.current && s.phase !== 'lookup'}>
    <h4><span>TLB</span>{s.current ? <span className={styles.lookup} data-tlb-hit={s.current.hit}><b>{s.current.hit ? 'Hit' : 'Miss'}</b></span> : <small>FIFO · {s.tlb.length}/{s.capacity}</small>}</h4>
    {s.tlb.length ? <div className={`${styles.tableScroll} nodrag nowheel`} tabIndex={0} aria-label="현재 TLB의 FIFO 순서">
      <table className={styles.table}><thead><tr><th>페이지</th><th>프레임</th></tr></thead><tbody>
        {s.tlb.map((entry, index) => <tr key={entry.page} data-tlb-cache-row={entry.page} data-tlb-active={s.current?.hit === true && s.current.page === entry.page} data-tlb-inserted={s.inserted?.page === entry.page}>
          <td><span className={styles.rowLabel}>{entry.page}{s.inserted?.page === entry.page ? <small>추가</small> : index === 0 ? <small>선두</small> : null}</span></td><td>{entry.frame}</td>
        </tr>)}
      </tbody></table>
    </div> : <p className={styles.empty}>저장된 매핑 없음</p>}
    {s.evicted ? <p className={styles.change} data-tlb-evicted={s.evicted.page}>FIFO 교체 <strong>{s.evicted.page} → {s.inserted?.page}</strong><span> 페이지</span></p>
      : s.inserted ? <p className={styles.change}>현재 매핑을 TLB에 추가했습니다.</p> : <p className={styles.change}>FIFO · 위쪽이 먼저 들어온 매핑</p>}
  </section>;
}

function Links({ container, edges, signature }: { container: RefObject<HTMLDivElement | null>; edges: Edge[]; signature: string }) {
  const marker = useId().replaceAll(':', ''), [paths, setPaths] = useState<Record<string, string>>({});
  const edgeSignature = JSON.stringify(edges);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const nodes = new Map([...root.querySelectorAll<HTMLElement>('[data-tlb-node]')].map(node => [node.dataset.tlbNode, node]));
    const measure = () => {
      const box = root.getBoundingClientRect(), scale = box.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const point = (node: HTMLElement, side: 'left' | 'right' | 'top' | 'bottom') => {
        const rect = node.getBoundingClientRect();
        return { x: ((side === 'left' ? rect.left - 3 : side === 'right' ? rect.right + 3 : rect.left + rect.width / 2) - box.left) / scale,
          y: ((side === 'top' ? rect.top - 3 : side === 'bottom' ? rect.bottom + 3 : rect.top + rect.height / 2) - box.top) / scale };
      };
      const next: Record<string, string> = {};
      for (const edge of edges) {
        const from = nodes.get(edge.from), to = nodes.get(edge.to);
        if (!from || !to) continue;
        if (edge.key === 'page-tlb' && nodes.has('address')) {
          // Leave above the page half of the address card, without crossing the offset half.
          const a = point(from, 'top'), boundary = point(nodes.get('address')!, 'top'), b = point(to, 'left');
          const y = Math.min(boundary.y, b.y) - 14;
          next[edge.key] = `M ${a.x} ${boundary.y} V ${y} H ${b.x - 16} V ${b.y} H ${b.x}`;
        } else if (edge.direction === 'offset') {
          const a = point(from, 'bottom'), b = point(to, 'bottom'), y = root.offsetHeight - 5;
          next[edge.key] = `M ${a.x} ${a.y} V ${y - 8} Q ${a.x} ${y} ${a.x + 8} ${y} H ${b.x - 8} Q ${b.x} ${y} ${b.x} ${y - 8} V ${b.y}`;
        } else if (edge.direction === 'down') {
          const a = point(from, 'bottom'), b = point(to, 'top');
          next[edge.key] = `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
        } else {
          const a = point(from, 'right'), b = point(to, 'left');
          next[edge.key] = `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
        }
      }
      setPaths(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [root, ...nodes.values()].forEach(node => observer.observe(node));
    return () => observer.disconnect();
    // Semantic keys avoid replacing the observer for an identical reconstructed snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, edgeSignature, signature]);
  return <svg className={styles.links} aria-hidden="true">
    <defs><marker id={`${marker}-arrow`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto-start-reverse"><path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke" /></marker></defs>
    {edges.filter(edge => edge.active).map(edge => <path key={`trail:${edge.key}`} d={paths[edge.key] ?? ''} className={styles.trail} />)}
    {edges.map(edge => <path key={edge.key} d={paths[edge.key] ?? ''} data-tlb-edge={edge.key} data-tlb-from={edge.from} data-tlb-to={edge.to} data-tlb-active={edge.active} data-tlb-visited={edge.visited} markerEnd={`url(#${marker}-arrow)`} />)}
  </svg>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: TlbSnapshot; view: SimulationView }) {
  const container = useRef<HTMLDivElement>(null);
  const shows = (field: typeof fields[number]) => !view.fields.length || view.fields.includes(field);
  const page = shows('페이지'), offset = shows('오프셋'), cache = shows('TLB'), table = shows('페이지테이블');
  const all = fields.every(shows), any = page || offset || cache || table;
  const edges: Edge[] = [];
  if (page && cache && s.current) edges.push({ key: 'page-tlb', from: 'page', to: 'tlb', active: s.phase === 'lookup', visited: true });
  if (cache && table && s.current?.pageTableVisited) edges.push({ key: 'tlb-table', from: 'tlb', to: 'table', direction: 'down', active: s.phase === 'pageTable' || s.phase === 'fault', visited: true });
  if (all && s.phase === 'translate') {
    edges.push({ key: s.current?.hit ? 'tlb-result' : 'table-result', from: s.current?.hit ? 'tlb' : 'table', to: 'result', active: true, visited: true });
    edges.push({ key: 'offset-result', from: 'offset', to: 'result', direction: 'offset', active: true, visited: true });
  }
  return <div className={styles.visual} data-tlb-visual data-tlb-role="record">
    <div className={styles.context}><strong className={styles.phase} data-tlb-phase={s.phase}>{phases[s.phase]}</strong>{s.current && <span>접근 <b>{s.current.index + 1}</b></span>}</div>
    {any ? <div className={`${styles.scroll} nodrag nowheel`} tabIndex={0} aria-label="주소 변환 경로">
      <div ref={container} className={`${styles.diagram} ${all ? '' : styles.partial}`} data-tlb-diagram>
        <Links container={container} edges={edges} signature={`${s.current?.index}:${s.phase}:${view.fields.join('|')}`} />
        {(page || offset) && <section className={styles.card} data-tlb-node="address">
          <h4>{all ? '가상 주소' : '주소 분해'}</h4>
          {all && <div className={styles.addressValue}><strong data-tlb-address>{s.current?.address ?? '—'}</strong></div>}
          <div className={styles.parts}>
            {page && <div className={styles.part} data-tlb-node="page"><span>페이지</span><strong data-tlb-page>{s.current?.page ?? '—'}</strong></div>}
            {offset && <div className={styles.part} data-tlb-node="offset"><span>오프셋</span><strong data-tlb-offset>{s.current?.offset ?? '—'}</strong></div>}
          </div>
        </section>}
        {(cache || table) && <div className={styles.middle}>
          {cache && <Cache snapshot={s} />}
          {table && <section className={styles.card} data-tlb-node="table" data-tlb-current={s.phase === 'pageTable'} data-tlb-visited={s.current?.pageTableVisited === true && s.phase === 'translate'} data-tlb-fault={s.phase === 'fault'}>
            <h4>페이지 테이블</h4><TableRows snapshot={s} />
          </section>}
        </div>}
        {all && <section className={styles.card} data-tlb-node="result" data-tlb-current={s.phase === 'translate'} data-tlb-fault={s.phase === 'fault'}>
          <h4>{s.phase === 'fault' ? '변환 중단' : '물리 주소'}</h4>
          {s.result ? s.result.fault ? <><strong className={styles.fault} data-tlb-fault-result>페이지 Miss</strong><p className={styles.pending}>물리 주소 없음</p></>
            : <><strong className={styles.physical} data-tlb-physical>{s.result.physical}</strong><p className={styles.formula} data-tlb-formula>프레임 {s.result.frame} × {s.pageSize} + {s.current?.offset}</p></>
            : <p className={styles.pending}>{s.phase === 'initial' ? '실행 전' : '변환 대기'}</p>}
        </section>}
      </div>
    </div> : <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function TlbVisual({ instance, execution, cursor, view }: VisualProps) {
  let snapshot: TlbSnapshot;
  try { snapshot = tlbSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-tlb-invalid role="status">설정을 확인하세요. 주소·페이지 테이블·TLB 입력을 완성하면 경로가 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'memory') return <div className={styles.memory} data-tlb-visual data-tlb-role="memory"><TableRows snapshot={snapshot} selected={view.fields} /></div>;
  return null;
}

export function TlbExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = tlbSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 주소 변환 경로를 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="TLB 하단 설명" data-tlb-explanation>
    <p className={styles.summary} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, index) => <label key={view.id}><span>설명 {index + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`TLB 설명 ${index + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
