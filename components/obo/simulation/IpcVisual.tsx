'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { ipcSnapshot } from './ipcModel';
import styles from './IpcVisual.module.css';

type Snapshot = ReturnType<typeof ipcSnapshot>;
type Scalar = Snapshot['channel'][number];
type Actor = Snapshot['actors'][number];
type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const operationNames = { send: '송신', receive: '수신', read: '읽기', write: '쓰기' };
const modeNames = { pipe: '파이프', message: '메시지', shared: '공유 메모리' };
const valueType = (value: Scalar) => value === null ? 'null' : typeof value;
const valueText = (value: Scalar) => typeof value === 'string' ? JSON.stringify(value) : String(value);

function Value({ value, id }: { value: Scalar; id: string }) {
  const text = valueText(value), long = text.length > 26 || typeof value === 'string' && value.includes('\n');
  return long ? <details className={`${styles.longValue} nodrag`} data-ipc-value-details={id}>
    <summary data-ipc-type={valueType(value)}>{text.slice(0, 19)}… <span>원문</span></summary>
    <pre data-ipc-raw={id} data-ipc-type={valueType(value)}>{String(value)}</pre>
  </details> : <strong className={styles.value} data-ipc-value={id} data-ipc-type={valueType(value)}>{text}</strong>;
}

function useReveal(container: RefObject<HTMLDivElement | null>, attribute: string, key: string | null, step: number | undefined) {
  useEffect(() => {
    const root = container.current, target = root && [...root.querySelectorAll<HTMLElement>(`[${attribute}]`)].find(element => element.getAttribute(attribute) === key);
    if (!root || !target) return;
    const bounds = root.getBoundingClientRect(), scale = bounds.height / root.offsetHeight, item = target.getBoundingClientRect();
    if (!scale || !Number.isFinite(scale)) return;
    if (item.top < bounds.top) root.scrollTop -= (bounds.top - item.top) / scale + 4;
    else if (item.bottom > bounds.bottom) root.scrollTop += (item.bottom - bounds.bottom) / scale + 4;
  }, [container, attribute, key, step]);
}

function ActorCard({ actor }: { actor: Actor }) {
  return <section className={styles.actor} data-ipc-actor={actor.nodeKey} data-ipc-active={actor.active} data-ipc-blocked={actor.blocked}>
    <strong title={actor.id}>{actor.label}</strong>
    {actor.blocked ? <span className={styles.wait} data-ipc-wait-op={actor.waitOperation}>{actor.waitOperation === 'send' ? '송신 대기' : '수신 대기'}</span>
      : actor.active ? <span className={styles.currentBadge}>현재</span> : <span className={styles.ready}>준비</span>}
  </section>;
}

function Actors({ snapshot: s }: { snapshot: Snapshot }) {
  const list = useRef<HTMLDivElement>(null);
  useReveal(list, 'data-ipc-actor', s.current ? `actor:${s.current.actor}` : null, s.event?.step);
  return <section className={styles.actorSection}><h4>실행 주체</h4>
    <div ref={list} className={`${styles.actorList} nodrag nowheel`} data-ipc-actor-list tabIndex={0} aria-label="모든 통신 주체">
      {s.actors.map(actor => <ActorCard key={actor.nodeKey} actor={actor} />)}
    </div>
  </section>;
}

function Channel({ snapshot: s, active }: { snapshot: Snapshot; active: boolean }) {
  const list = useRef<HTMLDivElement>(null), transfer = active ? s.transfer : null;
  useReveal(list, 'data-ipc-slot', transfer?.slotIndex !== null && transfer?.slotIndex !== undefined ? `channel:${transfer.slotIndex}` : null, s.event?.step);
  const received = active && s.current?.op === 'receive' && s.current.valuePresent && !s.current.blocked;
  const attempted = active && s.current?.op === 'send' && s.current.blocked && s.current.attemptedValuePresent;
  return <section className={styles.space} data-ipc-space="channel" data-ipc-space-active={active}>
    <h4>{s.mode === 'message' ? '메시지 큐' : '채널'}<span data-ipc-occupancy={s.channel.length}>점유 <b>{s.channel.length}</b> / {s.capacity}</span></h4>
    <div className={styles.channelEnds}><span>앞 · 수신</span><span>뒤 · 송신</span></div>
    <div ref={list} className={`${styles.spaceScroll} nodrag nowheel`} data-ipc-space-scroll tabIndex={0} aria-label="모든 FIFO 채널 칸">
      <div className={styles.slots}>{s.slots.map(slot => <div key={slot.nodeKey} className={styles.slot} data-ipc-slot={slot.nodeKey} data-ipc-index={slot.index} data-ipc-occupied={slot.occupied} data-ipc-current={active && transfer?.kind === 'send' && transfer.slotIndex === slot.index}>
        <span className={styles.slotIndex}>{slot.index === 0 ? '앞' : slot.index}</span>
        {slot.occupied ? <Value value={slot.value} id={slot.nodeKey} /> : <span className={styles.vacant}>빈칸</span>}
      </div>)}</div>
    </div>
    {received && <div className={styles.received} data-ipc-received><span>받은 값</span><Value value={s.current!.value} id="received" /></div>}
    {attempted && <div className={styles.attempted} data-ipc-attempted><span>보내려는 값</span><Value value={s.current!.attemptedValue} id="attempted" /></div>}
  </section>;
}

function Shared({ snapshot: s, active, fields = [], region = false }: { snapshot: Snapshot; active: boolean; fields?: string[]; region?: boolean }) {
  const cells = s.shared.filter(cell => !fields.length || fields.includes(cell.key)), list = useRef<HTMLDivElement>(null);
  const current = active ? s.current : null;
  useReveal(list, 'data-ipc-cell', current?.key ? `shared:${current.key}` : null, s.event?.step);
  const fallback = region && !s.shared.length && (!fields.length || fields.includes('영역'));
  return <section className={styles.space} data-ipc-space="shared" data-ipc-space-active={active}>
    <h4>공유값</h4>
    <div ref={list} className={`${styles.spaceScroll} nodrag nowheel`} data-ipc-space-scroll tabIndex={0} aria-label="모든 공유값">
      {cells.length ? <div className={styles.cells}>{cells.map(cell => {
        const selected = current?.key === cell.key, changed = selected && current.changed;
        return <div key={cell.nodeKey} className={styles.cell} data-ipc-cell={cell.nodeKey} data-ipc-current={selected} data-ipc-changed={changed} data-ipc-access={selected ? current.op : undefined}>
          <div className={styles.cellHeading}><span>{cell.key}</span>{selected && <b>{operationNames[current.op]}</b>}</div>
          <Value value={cell.value} id={cell.nodeKey} />
          {changed && (current.beforeExists ? <details className={`${styles.previous} nodrag`} data-ipc-before><summary>이전 값</summary><Value value={current.before} id={`before:${cell.nodeKey}`} /></details> : <span className={styles.newKey} data-ipc-added>새 항목</span>)}
        </div>;
      })}</div> : <p className={styles.empty}>{fallback ? '영역 · 이 실행 내부의 독립 공간' : fields.length && s.shared.length ? '선택한 공유값이 없습니다.' : '등록된 공유값 없음'}</p>}
    </div>
  </section>;
}

function Reads({ snapshot: s, actors, shared }: { snapshot: Snapshot; actors: boolean; shared: boolean }) {
  return <details className={`${styles.reads} nodrag`} data-ipc-reads>
    <summary>읽은 값 <b>{s.reads.length}개</b></summary>
    {s.reads.length ? <ol className="nowheel">{s.reads.map((entry, index) => <li key={`${entry.index}:${index}`} data-ipc-read-index={index}>
      <span className={styles.readNumber}>{index + 1}</span>
      {actors && <span className={styles.readActor}>{entry.actorLabel}</span>}
      {shared && entry.key && <span className={styles.readKey}>{entry.key}</span>}
      <Value value={entry.value} id={`read:${index}`} />
    </li>)}</ol> : <p className={styles.empty}>아직 읽은 값 없음</p>}
  </details>;
}

type Measured = { key: string; path: string; from: string; to: string; kind: string };
function Transfer({ container, snapshot: s }: { container: RefObject<HTMLDivElement | null>; snapshot: Snapshot }) {
  const marker = useId().replaceAll(':', ''), [path, setPath] = useState<Measured | null>(null);
  const key = s.transfer ? `${s.event?.step}:${s.transfer.kind}` : null;
  const signature = JSON.stringify({ transfer: s.transfer, event: s.event?.step, actors: s.actors.map(actor => actor.nodeKey), cells: s.shared.map(cell => cell.nodeKey), slots: s.slots.length });
  useEffect(() => {
    const root = container.current, transfer = s.transfer;
    if (!root || !transfer || !s.current) { setPath(null); return; }
    const actor = [...root.querySelectorAll<HTMLElement>('[data-ipc-actor]')].find(element => element.dataset.ipcActor === `actor:${s.current!.actor}`);
    const space = root.querySelector<HTMLElement>('[data-ipc-space-active=true]');
    const actorList = root.querySelector<HTMLElement>('[data-ipc-actor-list]'), spaceScroll = space?.querySelector<HTMLElement>('[data-ipc-space-scroll]');
    let port: HTMLElement | undefined | null;
    if (transfer.kind === 'receive') port = space?.querySelector<HTMLElement>('[data-ipc-received]');
    else if (transfer.kind === 'send') port = [...(space?.querySelectorAll<HTMLElement>('[data-ipc-slot]') ?? [])].find(element => element.dataset.ipcIndex === String(transfer.slotIndex));
    else {
      const nodeKey = transfer.kind === 'read' ? transfer.from : transfer.to;
      port = [...(space?.querySelectorAll<HTMLElement>('[data-ipc-cell]') ?? [])].find(element => element.dataset.ipcCell === nodeKey);
    }
    if (!actor || !space || !port || !actorList || !spaceScroll) { setPath(null); return; }
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const a = actor.getBoundingClientRect(), b = space.getBoundingClientRect(), p = port.getBoundingClientRect(), list = actorList.getBoundingClientRect(), cells = spaceScroll.getBoundingClientRect();
      if (a.bottom <= list.top || a.top >= list.bottom || transfer.kind !== 'receive' && (p.bottom <= cells.top || p.top >= cells.bottom)) { setPath(null); return; }
      const actorPoint = { x: (a.right - bounds.left) / scale + 8, y: (Math.max(a.top, list.top) + Math.min(a.bottom, list.bottom) - 2 * bounds.top) / scale / 2 };
      const spacePoint = { x: (b.left - bounds.left) / scale - 8, y: (p.top + p.height / 2 - bounds.top) / scale };
      const outward = transfer.kind === 'send' || transfer.kind === 'write', from = outward ? actorPoint : spacePoint, to = outward ? spacePoint : actorPoint, middle = (from.x + to.x) / 2;
      const next = { key: `${s.event?.step}:${transfer.kind}`, path: `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`, from: transfer.from, to: transfer.to, kind: transfer.kind };
      setPath(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [root, actor, space, port, actorList, spaceScroll].forEach(element => observer.observe(element));
    actorList.addEventListener('scroll', measure, { passive: true }); spaceScroll.addEventListener('scroll', measure, { passive: true }); root.addEventListener('toggle', measure, true);
    return () => { observer.disconnect(); actorList.removeEventListener('scroll', measure); spaceScroll.removeEventListener('scroll', measure); root.removeEventListener('toggle', measure, true); };
    // Snapshot objects are rebuilt every render; observe semantic/layout changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, signature]);
  if (!path || path.key !== key) return null;
  return <svg className={styles.transfer} aria-hidden="true"><defs><marker id={`${marker}-arrow`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke" /></marker></defs>
    <path className={styles.trail} d={path.path} /><path d={path.path} data-ipc-edge={path.key} data-ipc-from={path.from} data-ipc-to={path.to} data-ipc-kind={path.kind} markerEnd={`url(#${marker}-arrow)`} />
  </svg>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const shown = (field: string) => !view.fields.length || view.fields.includes(field);
  const actors = shown('실행 주체'), channel = shown('채널'), shared = shown('공유값'), reads = shown('읽은 값');
  const activeSpace = s.mode === 'shared' ? shared : channel, inactiveSpace = s.mode === 'shared' ? channel : shared;
  const container = useRef<HTMLDivElement>(null), linked = actors && activeSpace;
  return <div className={styles.visual} data-ipc-visual data-ipc-role="record" data-ipc-mode={s.mode} data-ipc-phase={s.phase} data-ipc-operation={s.current?.op} data-ipc-index={s.current?.index}>
    <div className={styles.context}><strong className={styles.mode}>{modeNames[s.mode]}</strong><b className={styles.phase}>{s.current ? `${operationNames[s.current.op]}${s.current.blocked ? ' 대기' : ''}` : '초기 상태'}</b>
      {s.phase === 'resume' && <span className={styles.resumed}>재개</span>}{actors && s.current && <span className={styles.contextActor}>{s.current.actorLabel}</span>}
    </div>
    {(actors || activeSpace) && <div className={`${styles.boardScroll} nodrag nowheel`} tabIndex={0} aria-label="실행 주체와 통신 공간">
      <div ref={container} className={styles.board} data-ipc-both={linked} data-ipc-transfer-from={linked ? s.transfer?.from : undefined} data-ipc-transfer-to={linked ? s.transfer?.to : undefined}>
        {linked && <Transfer container={container} snapshot={s} />}{actors && <Actors snapshot={s} />}
        {activeSpace && (s.mode === 'shared' ? <Shared snapshot={s} active /> : <Channel snapshot={s} active />)}
      </div>
    </div>}
    {inactiveSpace && <details className={`${styles.inactive} nodrag`} data-ipc-inactive={s.mode === 'shared' ? 'channel' : 'shared'}>
      <summary>{s.mode === 'shared' ? '보관된 채널 값' : '보관된 공유값'} <span>{s.mode === 'shared' ? s.channel.length : s.shared.length}개 · 현재 모드에서 사용 안 함</span></summary>
      {s.mode === 'shared' ? <Channel snapshot={s} active={false} /> : <Shared snapshot={s} active={false} />}
    </details>}
    {reads && <Reads snapshot={s} actors={actors} shared={shared} />}
    {!actors && !channel && !shared && !reads && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function IpcVisual({ instance, execution, cursor, view }: Props) {
  let snapshot: Snapshot;
  try { snapshot = ipcSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-ipc-invalid role="status">설정을 확인하세요. 통신 모드와 동작을 완성하면 경로가 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'queue') return <div data-ipc-visual data-ipc-role="queue"><Channel snapshot={snapshot} active={snapshot.mode !== 'shared'} /></div>;
  if (view.role === 'memory' || view.role === 'region') return <div data-ipc-visual data-ipc-role={view.role}><Shared snapshot={snapshot} active={snapshot.mode === 'shared'} fields={view.fields} region={view.role === 'region'} /></div>;
  if (view.role === 'actor') {
    const actors = snapshot.actors.filter(actor => (!view.target || actor.id === view.target) && (!view.fields.length || view.fields.includes(actor.label)));
    return <div className={styles.independentActors} data-ipc-visual data-ipc-role="actor">{actors.map(actor => <ActorCard key={actor.nodeKey} actor={actor} />)}{!actors.length && <p className={styles.empty}>선택한 실행 주체가 없습니다.</p>}</div>;
  }
  return null;
}

export function IpcExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = ipcSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 전달·공유 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="IPC 하단 설명" data-ipc-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`IPC 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
