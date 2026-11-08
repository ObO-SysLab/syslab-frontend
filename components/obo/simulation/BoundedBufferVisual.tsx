'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { boundedBufferSnapshot } from './boundedBufferModel';
import styles from './BoundedBufferVisual.module.css';

type Snapshot = ReturnType<typeof boundedBufferSnapshot>;
type Actor = Snapshot['actors'][number];
type Scalar = Snapshot['buffer'][number];
type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
type Resource = 'empty' | 'full' | 'mutex';
const phases = { initial: '초기 상태', acquire: '획득', wait: '대기', wake: '재개', put: '삽입', take: '제거', release: '반납' };
const stops = { ready: '초기 상태', running: '진행 중', scheduleEnd: '일정 종료', blocked: '진행 불가', deadlocked: '교착' };
const scalarType = (value: Scalar) => value === null ? 'null' : typeof value;
const scalarText = (value: Scalar) => typeof value === 'string' ? JSON.stringify(value) : String(value);

function Value({ value, id }: { value: Scalar; id: string }) {
  const text = scalarText(value), long = text.length > 22 || typeof value === 'string' && value.includes('\n');
  return long ? <details className={`${styles.longValue} nodrag`} data-bb-value-details={id}>
    <summary data-bb-type={scalarType(value)}>{text.slice(0, 16)}… <span>원문</span></summary>
    <pre data-bb-raw={id} data-bb-type={scalarType(value)}>{String(value)}</pre>
  </details> : <strong className={styles.value} data-bb-value={id} data-bb-type={scalarType(value)}>{text}</strong>;
}

function nextAction(actor: Actor, resources: boolean) {
  if (actor.nextAction === 'token') return resources ? `${actor.role === 'producer' ? 'empty' : 'full'} 획득` : '획득';
  if (actor.nextAction === 'mutex') return resources ? 'mutex 획득' : '획득';
  return actor.nextAction === 'put' ? '삽입' : actor.nextAction === 'take' ? '제거' : '반납';
}

function ActorCard({ actor, resources }: { actor: Actor; resources: boolean }) {
  return <section className={styles.actor} data-bb-actor={actor.nodeKey} data-bb-active={actor.active} data-bb-blocked={actor.blocked} data-bb-pc={actor.pc}>
    <h5><strong title={actor.id}>{actor.label}</strong>{actor.active && <b className={styles.currentBadge}>현재</b>}</h5>
    {actor.blocked ? <span className={styles.waitBadge} data-bb-wait-for={resources ? actor.waitFor ?? undefined : undefined}>{resources && actor.waitFor ? `${actor.waitFor} 대기` : '대기'}</span>
      : <span className={styles.next}>다음 <b>{nextAction(actor, resources)}</b></span>}
  </section>;
}

function ActorColumn({ role, snapshot: s, resources }: { role: Actor['role']; snapshot: Snapshot; resources: boolean }) {
  const actors = s.actors.filter(actor => actor.role === role);
  const list = useRef<HTMLDivElement>(null), active = actors.find(actor => actor.active)?.nodeKey;
  useEffect(() => {
    const root = list.current, actor = root && [...root.querySelectorAll<HTMLElement>('[data-bb-actor]')].find(element => element.dataset.bbActor === active);
    if (!root || !actor) return;
    const bounds = root.getBoundingClientRect(), scale = bounds.height / root.offsetHeight, target = actor.getBoundingClientRect();
    if (!scale || !Number.isFinite(scale)) return;
    if (target.top < bounds.top) root.scrollTop -= (bounds.top - target.top) / scale + 4;
    else if (target.bottom > bounds.bottom) root.scrollTop += (target.bottom - bounds.bottom) / scale + 4;
  }, [active, s.event?.step]);
  return <section className={styles.actorColumn} data-bb-role-column={role}>
    <h4>{role === 'producer' ? '생산자' : '소비자'}</h4>
    <div ref={list} className={`${styles.actorList} nodrag nowheel`} data-bb-actor-list={role} tabIndex={0} aria-label={role === 'producer' ? '모든 생산자' : '모든 소비자'}>
      {actors.map(actor => <ActorCard key={actor.nodeKey} actor={actor} resources={resources} />)}
      {!actors.length && <p className={styles.empty}>등록된 주체 없음</p>}
    </div>
  </section>;
}

function Buffer({ snapshot: s }: { snapshot: Snapshot }) {
  const list = useRef<HTMLDivElement>(null), currentSlot = s.transfer?.slotIndex;
  useEffect(() => {
    const root = list.current, slot = root && [...root.querySelectorAll<HTMLElement>('[data-bb-slot]')].find(element => element.dataset.bbIndex === String(currentSlot));
    if (!root || !slot) return;
    const bounds = root.getBoundingClientRect(), scale = bounds.height / root.offsetHeight, target = slot.getBoundingClientRect();
    if (!scale || !Number.isFinite(scale)) return;
    if (target.top < bounds.top) root.scrollTop -= (bounds.top - target.top) / scale + 4;
    else if (target.bottom > bounds.bottom) root.scrollTop += (target.bottom - bounds.bottom) / scale + 4;
  }, [currentSlot, s.event?.step]);
  return <section className={styles.buffer} data-bb-buffer>
    <h4>FIFO 버퍼 <span data-bb-occupancy={s.buffer.length}>점유 <b>{s.buffer.length}</b> / {s.capacity}</span></h4>
    <div className={styles.ends}><span>뒤 · 삽입</span><span>앞 · 꺼내기</span></div>
    <div ref={list} className={`${styles.slotScroll} nodrag nowheel`} data-bb-slot-scroll tabIndex={0} aria-label="FIFO 앞에서부터 모든 버퍼 칸">
      <div className={styles.slots}>{s.slots.map(slot => <div key={slot.nodeKey} className={styles.slot} data-bb-slot={slot.nodeKey} data-bb-index={slot.index} data-bb-occupied={slot.occupied} data-bb-inserted={s.transfer?.kind === 'put' && slot.index === s.transfer.slotIndex}>
        <span className={styles.slotIndex}>{slot.index === 0 ? '앞' : slot.index}</span>
        {slot.occupied ? <Value value={slot.value} id={slot.nodeKey} /> : <span className={styles.vacant}>빈칸</span>}
      </div>)}</div>
    </div>
    {s.transfer?.kind === 'take' && <div className={styles.taken} data-bb-taken><span>꺼낸 값</span><Value value={s.transfer.payload} id="taken" /></div>}
  </section>;
}

function Resources({ snapshot: s, keys }: { snapshot: Snapshot; keys: Resource[] }) {
  return <div className={styles.resources} data-bb-resources>{keys.map(key => <section key={key} className={styles.resource} data-bb-resource={key} data-bb-active={s.current?.resources.includes(key) ?? false}>
    <div><strong>{key}</strong><span>{key === 'empty' ? '생산 허용' : key === 'full' ? '소비 허용' : '잠금 소유자'}</span></div>
    {key === 'mutex' ? <strong className={styles.owner} data-bb-owner={s.semaphores.mutex ?? ''}>{s.mutexOwnerLabel ?? '없음'}</strong> : <strong className={styles.resourceValue} data-bb-count={key}>{s.semaphores[key]}</strong>}
  </section>)}</div>;
}

type Measured = { key: string; path: string; from: string; to: string; kind: 'put' | 'take' };
function Transfer({ container, snapshot: s }: { container: RefObject<HTMLDivElement | null>; snapshot: Snapshot }) {
  const marker = useId().replaceAll(':', ''), [path, setPath] = useState<Measured | null>(null);
  const transferKey = s.transfer ? `${s.transfer.kind}:${s.event?.step}:${s.transfer.actor}` : null;
  const signature = JSON.stringify({ transfer: s.transfer, step: s.event?.step, slots: s.slots.length, actors: s.actors.map(actor => [actor.nodeKey, actor.pc, actor.blocked]) });
  useEffect(() => {
    const root = container.current, transfer = s.transfer;
    if (!root || !transfer) { setPath(null); return; }
    const buffer = root.querySelector<HTMLElement>('[data-bb-buffer]');
    const actor = [...root.querySelectorAll<HTMLElement>('[data-bb-actor]')].find(element => element.dataset.bbActor === `actor:${transfer.actor}`);
    const slot = [...root.querySelectorAll<HTMLElement>('[data-bb-slot]')].find(element => element.dataset.bbSlot === `slot:${transfer.slotIndex}`);
    const port = transfer.kind === 'take' ? root.querySelector<HTMLElement>('[data-bb-taken]') : slot;
    const actorList = actor?.closest<HTMLElement>('[data-bb-actor-list]');
    const slots = root.querySelector<HTMLElement>('[data-bb-slot-scroll]');
    if (!buffer || !actor || !port || !actorList || !slots) { setPath(null); return; }
    const reveal = (element: HTMLElement, list: HTMLElement) => {
      const scale = root.getBoundingClientRect().width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const e = element.getBoundingClientRect(), l = list.getBoundingClientRect();
      if (e.top < l.top) list.scrollTop -= (l.top - e.top) / scale + 4;
      else if (e.bottom > l.bottom) list.scrollTop += (e.bottom - l.bottom) / scale + 4;
    };
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const a = actor.getBoundingClientRect(), b = buffer.getBoundingClientRect(), p = port.getBoundingClientRect(), l = actorList.getBoundingClientRect(), slotBounds = slots.getBoundingClientRect();
      if (a.bottom <= l.top || a.top >= l.bottom || transfer.kind === 'put' && (p.bottom <= slotBounds.top || p.top >= slotBounds.bottom)) { setPath(null); return; }
      const actorY = (Math.max(a.top, l.top) + Math.min(a.bottom, l.bottom) - 2 * bounds.top) / scale / 2;
      const portY = (p.top + p.height / 2 - bounds.top) / scale;
      const from = transfer.kind === 'put' ? { x: (a.right - bounds.left) / scale + 6, y: actorY } : { x: (b.right - bounds.left) / scale + 6, y: portY };
      const to = transfer.kind === 'put' ? { x: (b.left - bounds.left) / scale - 8, y: portY } : { x: (a.left - bounds.left) / scale - 8, y: actorY };
      const middle = (from.x + to.x) / 2;
      const next: Measured = { key: `${transfer.kind}:${s.event?.step}:${transfer.actor}`, path: `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`, from: transfer.from, to: transfer.to, kind: transfer.kind };
      setPath(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    reveal(actor, actorList); if (transfer.kind === 'put' && slot) reveal(slot, slots); measure();
    const observer = new ResizeObserver(measure);
    [root, buffer, actor, port, actorList, slots].forEach(element => observer.observe(element));
    actorList.addEventListener('scroll', measure, { passive: true }); slots.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); actorList.removeEventListener('scroll', measure); slots.removeEventListener('scroll', measure); };
    // Snapshots are rebuilt on render; observe only semantic and layout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, signature]);
  if (!path || path.key !== transferKey) return null;
  return <svg className={styles.transfer} aria-hidden="true">
    <defs><marker id={`${marker}-arrow`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke" /></marker></defs>
    <path className={styles.trail} d={path.path} /><path d={path.path} data-bb-edge={path.key} data-bb-from={path.from} data-bb-to={path.to} data-bb-kind={path.kind} markerEnd={`url(#${marker}-arrow)`} />
  </svg>;
}

function Board({ snapshot: s, actors, buffer, resources }: { snapshot: Snapshot; actors: boolean; buffer: boolean; resources: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  return <div className={`${styles.boardScroll} nodrag nowheel`} tabIndex={0} aria-label="생산자와 FIFO 버퍼 및 소비자">
    <div ref={container} className={styles.board} data-bb-layout={actors && buffer ? 'full' : actors ? 'actors' : 'buffer'} data-bb-transfer-from={actors && buffer ? s.transfer?.from : undefined} data-bb-transfer-to={actors && buffer ? s.transfer?.to : undefined}>
      {actors && buffer && <Transfer container={container} snapshot={s} />}
      {actors && <ActorColumn role="producer" snapshot={s} resources={resources} />}
      {buffer && <Buffer snapshot={s} />}
      {actors && <ActorColumn role="consumer" snapshot={s} resources={resources} />}
    </div>
  </div>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const shown = (field: string) => !view.fields.length || view.fields.includes(field);
  const buffer = shown('버퍼'), actors = shown('실행 주체'), resources = shown('세마포어'), progress = shown('진행 상태');
  return <div className={styles.visual} data-bb-visual data-bb-role="record" data-bb-phase={s.phase}>
    <div className={styles.context}><strong className={styles.phase}>{phases[s.phase]}</strong>
      {actors && s.current && <b className={styles.contextActor}>{s.current.actorLabel}</b>}
      {resources && s.current?.resource && <span className={styles.contextResource}>{s.current.resource}</span>}
      {progress && s.stopReason !== 'ready' && s.stopReason !== 'running' && <span className={styles.stop} data-bb-stop-reason={s.stopReason}>{stops[s.stopReason]}</span>}
    </div>
    {(actors || buffer) && <Board snapshot={s} actors={actors} buffer={buffer} resources={resources} />}
    {resources && <Resources snapshot={s} keys={['empty', 'full', 'mutex']} />}
    {!actors && !buffer && !resources && !progress && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function BoundedBufferVisual({ instance, execution, cursor, view }: Props) {
  let snapshot: Snapshot;
  try { snapshot = boundedBufferSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-bb-invalid role="status">설정을 확인하세요. 버퍼와 실행 순서를 완성하면 상태가 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'queue') return <div className={styles.visual} data-bb-visual data-bb-role="queue"><Buffer snapshot={snapshot} /></div>;
  if (view.role === 'resource') {
    const keys = (['empty', 'full', 'mutex'] as Resource[]).filter(key => (!view.target || view.target === key) && (!view.fields.length || view.fields.includes(key)));
    return <div className={styles.visual} data-bb-visual data-bb-role="resource">{keys.length ? <Resources snapshot={snapshot} keys={keys} /> : <p className={styles.empty}>선택한 자원이 없습니다.</p>}</div>;
  }
  if (view.role === 'actor') {
    const actors = snapshot.actors.filter(actor => (!view.target || view.target === actor.id) && (!view.fields.length || view.fields.includes(actor.label)));
    return <div className={styles.independentActors} data-bb-visual data-bb-role="actor">{actors.map(actor => <ActorCard key={actor.nodeKey} actor={actor} resources />)}{!actors.length && <p className={styles.empty}>선택한 실행 주체가 없습니다.</p>}</div>;
  }
  return null;
}

export function BoundedBufferExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = boundedBufferSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 버퍼와 생산·소비 과정을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="PC 하단 설명" data-bb-explanation>
    <p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`PC 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
