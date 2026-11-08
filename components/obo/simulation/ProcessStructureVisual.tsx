'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { processSnapshot } from './processStructureModel';
import styles from './ProcessStructureVisual.module.css';

type Snapshot = ReturnType<typeof processSnapshot>;
type Process = Snapshot['processes'][number];
type Thread = Snapshot['threads'][number];
type Cell = Thread['registers'][number];
type Scalar = Cell['value'];
type VisualProps = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const valueType = (value: Scalar) => value === null ? 'null' : typeof value;
const valueText = (value: Scalar) => typeof value === 'string' ? JSON.stringify(value) : String(value);

function ScalarValue({ value, id }: { value: Scalar; id: string }) {
  const text = valueText(value), long = text.length > 28 || typeof value === 'string' && value.includes('\n');
  return long ? <details className={`${styles.longValue} nodrag`} data-pt-value-details={id}>
    <summary data-pt-value-type={valueType(value)}>{text.slice(0, 20)}… <span>원문</span></summary>
    <pre data-pt-raw={id} data-pt-value-type={valueType(value)}>{String(value)}</pre>
  </details> : <strong className={styles.value} data-pt-value={id} data-pt-value-type={valueType(value)}>{text}</strong>;
}

function ValueCell({ cell, current }: { cell: Cell; current: Snapshot['current'] }) {
  const active = current?.cellKey === cell.nodeKey, changed = active && current.changed;
  return <div className={styles.cell} data-pt-cell={cell.nodeKey} data-pt-current={active} data-pt-changed={changed} data-pt-access={active ? current.kind : undefined}>
    <div className={styles.cellHeading}><span>{cell.key}</span>{active && <b className={styles.accessBadge}>{current.kind === 'read' ? '읽기' : '쓰기'}</b>}</div>
    <ScalarValue value={cell.value} id={cell.nodeKey} />
    {changed && <span className={styles.changedBadge} data-pt-before={valueText(current.before)} data-pt-before-type={valueType(current.before)} title={`이전 값: ${valueText(current.before)}`}><b>변경</b><span>이전 {valueText(current.before)}</span></span>}
  </div>;
}

function Cells({ cells, current, empty }: { cells: Cell[]; current: Snapshot['current']; empty: string }) {
  return cells.length ? <div className={styles.cells}>{cells.map(cell => <ValueCell key={cell.nodeKey} cell={cell} current={current} />)}</div> : <p className={styles.empty}>{empty}</p>;
}

function ThreadBox({ thread, current }: { thread: Thread; current: Snapshot['current'] }) {
  const active = current?.actor === thread.id;
  return <section className={styles.thread} data-pt-thread={thread.nodeKey} data-pt-current={active}>
    <h5 data-pt-thread-heading={thread.nodeKey}><strong title={thread.id}>{thread.label}</strong>{active && <span className={styles.currentBadge}>현재</span>}</h5>
    <div className={styles.registers}><h6>개별 레지스터</h6><Cells cells={thread.registers} current={current} empty="등록된 값 없음" /></div>
    <details className={`${styles.stack} nodrag`} data-pt-stack={thread.nodeKey}>
      <summary><strong>스택</strong><span>정적 · {thread.stack.length}개</span></summary>
      {thread.stack.length ? <ol>{thread.stack.map((value, index) => <li key={index} data-pt-stack-index={index}><span className={styles.stackIndex}>{index}</span><ScalarValue value={value} id={`stack:${thread.id}:${index}`} /></li>)}</ol> : <p className={styles.empty}>비어 있음</p>}
    </details>
  </section>;
}

type MeasuredPath = { key: string; path: string; from: string; to: string; active: boolean };
function ProcessLinks({ container, process, current, enabled }: { container: RefObject<HTMLDivElement | null>; process: Process; current: Snapshot['current']; enabled: boolean }) {
  const marker = useId().replaceAll(':', '');
  const [paths, setPaths] = useState<MeasuredPath[]>([]);
  const signature = JSON.stringify({ process: process.id, threads: process.threads.map(thread => thread.nodeKey), cells: process.shared.map(cell => cell.nodeKey), index: current?.index, actor: current?.actor, cell: current?.cellKey, kind: current?.kind, scope: current?.scope });
  useEffect(() => {
    const root = container.current;
    if (!root || !enabled) { setPaths(previous => previous.length ? [] : previous); return; }
    const shared = root.querySelector<HTMLElement>('[data-pt-shared]');
    const threadCards = new Map([...root.querySelectorAll<HTMLElement>('[data-pt-thread]')].map(element => [element.dataset.ptThread, element]));
    const cells = new Map([...root.querySelectorAll<HTMLElement>('[data-pt-cell]')].map(element => [element.dataset.ptCell, element]));
    if (!shared) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const point = (element: HTMLElement, side: 'top' | 'bottom') => {
        const rect = element.getBoundingClientRect();
        return { x: (rect.left + rect.width / 2 - bounds.left) / scale, y: ((side === 'top' ? rect.top : rect.bottom) - bounds.top) / scale };
      };
      const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => `M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`;
      const next: MeasuredPath[] = [];
      for (const thread of process.threads) {
        const card = threadCards.get(thread.nodeKey);
        if (!card) continue;
        const from = point(shared, 'bottom'), to = point(card, 'top');
        next.push({ key: `membership:${thread.id}`, path: curve(from, to), from: process.nodeKey, to: thread.nodeKey, active: false });
      }
      if (current?.process === process.id && current.scope === 'shared') {
        const cell = cells.get(current.cellKey), card = threadCards.get(`thread:${current.actor}`);
        if (cell && card) {
          // Keep arrowheads in the gap outside opaque containers; the selected cell
          // identifies the exact shared value even when the shared grid has many rows.
          const cellPoint = { x: point(cell, 'bottom').x, y: point(shared, 'bottom').y + 3 };
          const threadPoint = point(card, 'top'), read = current.kind === 'read';
          threadPoint.y -= 5;
          next.push({ key: `access:${current.index}`, path: read ? curve(cellPoint, threadPoint) : curve(threadPoint, cellPoint), from: read ? current.cellKey : `thread:${current.actor}`, to: read ? `thread:${current.actor}` : current.cellKey, active: true });
        }
      }
      setPaths(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [root, shared, ...threadCards.values(), ...cells.values()].forEach(element => observer.observe(element));
    return () => observer.disconnect();
    // Snapshots are reconstructed each render; only semantic/layout changes need a new observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, enabled, signature]);
  return <svg className={styles.links} aria-hidden="true">
    <defs><marker id={`${marker}-arrow`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto-start-reverse"><path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke" /></marker></defs>
    {paths.filter(path => path.active).map(path => <path key={`trail-${path.key}`} d={path.path} className={styles.pathTrail} />)}
    {paths.map(path => <path key={path.key} d={path.path} data-pt-edge={path.key} data-pt-from={path.from} data-pt-to={path.to} data-pt-active={path.active} markerEnd={path.active ? `url(#${marker}-arrow)` : undefined} />)}
  </svg>;
}

function ProcessBox({ process, snapshot, shared, threads }: { process: Process; snapshot: Snapshot; shared: boolean; threads: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  return <section className={styles.process} data-pt-process={process.nodeKey} data-pt-active-process={snapshot.current?.process === process.id}>
    <h4><span>프로세스</span><strong title={process.id}>{process.label}</strong></h4>
    <div className={styles.processBody} ref={container}>
      {shared && threads && <ProcessLinks container={container} process={process} current={snapshot.current} enabled={shared && threads} />}
      {shared && <section className={styles.shared} data-pt-shared={process.nodeKey}><h5>공유값</h5><Cells cells={process.shared} current={snapshot.current} empty="등록된 공유값 없음" /></section>}
      {threads && <div className={styles.threads} data-pt-threads style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(process.threads.length, 3))}, minmax(170px, 1fr))` }}>
        {process.threads.map(thread => <ThreadBox key={thread.nodeKey} thread={thread} current={snapshot.current} />)}
        {!process.threads.length && <p className={styles.empty}>소속 스레드 없음</p>}
      </div>}
    </div>
  </section>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const shared = !view.fields.length || view.fields.includes('주소공간'), threads = !view.fields.length || view.fields.includes('스레드');
  const processes = s.processes.filter(process => shared || threads && process.threads.length > 0);
  return <div className={styles.visual} data-pt-visual data-pt-role="record">
    <div className={styles.context} data-pt-kind={s.current?.kind ?? 'initial'} data-pt-operation={s.current?.index}>
      <strong className={styles.phase}>{s.current ? s.current.kind === 'read' ? '읽기' : '쓰기' : '프로세스 구조'}</strong>
      {s.current && <span>작업 <b>{s.current.index + 1}</b></span>}
      {threads && s.current && <span className={styles.contextActor}>{s.current.actorLabel}</span>}
      {s.current && (s.current.scope === 'shared' ? shared : threads) && <span>{s.current.scope === 'shared' ? '공유값' : '개별 레지스터'} <b>{s.current.key}</b></span>}
    </div>
    {shared || threads ? <div className={`${styles.processScroll} nodrag nowheel`} tabIndex={0} aria-label="프로세스별 공유값과 소속 스레드">
      <div className={styles.processes} style={{ gridTemplateColumns: processes.map(process => `minmax(${threads ? Math.max(310, Math.min(process.threads.length, 3) * 188 + 28) : 280}px, ${threads ? Math.max(1, Math.min(process.threads.length, 3)) : 1}fr)`).join(' ') }}>
        {processes.map(process => <ProcessBox key={process.nodeKey} process={process} snapshot={s} shared={shared} threads={threads} />)}
      </div>
    </div> : <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

function SharedVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const processes = s.processes.filter(process => !view.fields.length || view.fields.includes(process.id));
  return <div className={styles.sharedViews} data-pt-visual data-pt-role={view.role}>
    {processes.map(process => <section key={process.nodeKey} className={styles.sharedView} data-pt-process={process.nodeKey}>
      <h4><span>프로세스</span><strong title={process.id}>{process.label}</strong></h4>
      <Cells cells={process.shared} current={s.current} empty="등록된 공유값 없음" />
    </section>)}
    {!processes.length && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function ProcessStructureVisual({ instance, execution, cursor, view }: VisualProps) {
  let snapshot: Snapshot;
  try { snapshot = processSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-pt-invalid role="status">설정을 확인하세요. 프로세스·스레드 입력을 완성하면 구조가 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'memory' || view.role === 'region') return <SharedVisual snapshot={snapshot} view={view} />;
  if (view.role === 'actor') {
    const threads = snapshot.threads.filter(thread => (!view.target || thread.id === view.target) && (!view.fields.length || view.fields.includes(thread.label)));
    return <div className={styles.actors} data-pt-visual data-pt-role="actor">{threads.map(thread => <div key={thread.nodeKey} className={styles.actor} data-pt-thread={thread.nodeKey} data-pt-current={snapshot.current?.actor === thread.id}>
      <strong title={thread.id}>{thread.label}</strong><span>프로세스 {snapshot.processes.find(process => process.id === thread.process)?.label ?? thread.process}</span>
      {snapshot.current?.actor === thread.id && <b className={styles.currentBadge}>{snapshot.current.kind === 'read' ? '읽기' : '쓰기'}</b>}
    </div>)}{!threads.length && <p className={styles.empty}>선택한 스레드가 없습니다.</p>}</div>;
  }
  return null;
}

export function ProcessStructureExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = processSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 스레드의 공유·개별 값 접근을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="PT 하단 설명" data-pt-explanation>
    <p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`PT 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
