'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { contextSwitchSnapshot } from './contextSwitchModel';
import styles from './ContextSwitchVisual.module.css';

type Snapshot = ReturnType<typeof contextSwitchSnapshot>;
type Register = Snapshot['registers'][number];
type Scalar = Register['value'];
type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const phaseLabel = { initial: '초기 상태', save: '문맥 저장', restore: '문맥 복원', select: '대상 선택' };
const valueType = (value: Scalar) => value === null ? 'null' : typeof value;
const valueText = (value: Scalar) => typeof value === 'string' ? JSON.stringify(value) : String(value);

function ScalarValue({ cell }: { cell: Register }) {
  const text = valueText(cell.value), long = text.length > 24 || typeof cell.value === 'string' && cell.value.includes('\n');
  return long ? <details className={`${styles.longValue} nodrag`} data-cs-value-details={cell.nodeKey}>
    <summary data-cs-value-type={valueType(cell.value)}>{text.slice(0, 18)}… <span>원문</span></summary>
    <pre data-cs-raw={cell.nodeKey} data-cs-value-type={valueType(cell.value)}>{String(cell.value)}</pre>
  </details> : <strong className={styles.value} data-cs-value={cell.nodeKey} data-cs-value-type={valueType(cell.value)}>{text}</strong>;
}

function Registers({ cells, compact = false }: { cells: Register[]; compact?: boolean }) {
  if (!cells.length) return <p className={styles.empty} data-cs-empty-registers>비어 있음</p>;
  const grid = (values: Register[]) => <div className={compact ? styles.compactCells : styles.cells}>{values.map(cell => <div key={cell.nodeKey} className={styles.cell} data-cs-cell={cell.nodeKey}>
    <span className={styles.key}>{cell.key}</span><ScalarValue cell={cell} />
  </div>)}</div>;
  return <>{grid(compact ? cells.slice(0, 4) : cells)}{compact && cells.length > 4 && <details className={`${styles.moreValues} nodrag`} data-cs-register-details>
    <summary>나머지 {cells.length - 4}개 레지스터</summary>{grid(cells.slice(4))}
  </details>}</>;
}

type MeasuredTransfer = { key: string; path: string; from: string; to: string; kind: 'save' | 'restore' };
function Transfer({ container, snapshot: s, enabled }: { container: RefObject<HTMLDivElement | null>; snapshot: Snapshot; enabled: boolean }) {
  const marker = useId().replaceAll(':', ''), [path, setPath] = useState<MeasuredTransfer | null>(null);
  const signature = JSON.stringify({ phase: s.phase, transfer: s.transfer, step: s.event?.step, cells: s.registers.map(cell => cell.nodeKey), pcbs: s.pcbs.map(pcb => [pcb.nodeKey, pcb.registers.map(cell => cell.nodeKey)]) });
  const transferKey = s.transfer ? `${s.transfer.kind}:${s.transfer.actor}` : null;
  useEffect(() => {
    const root = container.current, transfer = s.transfer;
    if (!root || !enabled || !transfer) { setPath(null); return; }
    const cpu = root.querySelector<HTMLElement>('[data-cs-cpu]');
    const list = root.querySelector<HTMLElement>('[data-cs-pcb-list]');
    const rows = [...root.querySelectorAll<HTMLElement>('[data-cs-pcb]')];
    const target = rows.find(row => row.dataset.csPcb === `pcb:${transfer.actor}`);
    if (!cpu || !list || !target) { setPath(null); return; }
    // Move only the PCB list; scrollIntoView would also move the page/canvas.
    const reveal = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const rowBounds = target.getBoundingClientRect(), listBounds = list.getBoundingClientRect();
      if (rowBounds.top < listBounds.top) list.scrollTop -= (listBounds.top - rowBounds.top) / scale + 4;
      else if (rowBounds.bottom > listBounds.bottom) list.scrollTop += (rowBounds.bottom - listBounds.bottom) / scale + 4;
    };
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const cpuBounds = cpu.getBoundingClientRect(), rowBounds = target.getBoundingClientRect(), listBounds = list.getBoundingClientRect();
      // A user may deliberately scroll the active row out of view: do not draw to a hidden endpoint.
      if (rowBounds.bottom <= listBounds.top || rowBounds.top >= listBounds.bottom) { setPath(null); return; }
      const cpuPoint = { x: (cpuBounds.right - bounds.left) / scale + 7, y: (cpuBounds.top + cpuBounds.height / 2 - bounds.top) / scale };
      const pcbPoint = { x: (rowBounds.left - bounds.left) / scale - 8, y: (Math.max(rowBounds.top, listBounds.top) + Math.min(rowBounds.bottom, listBounds.bottom) - 2 * bounds.top) / scale / 2 };
      const from = transfer.kind === 'save' ? cpuPoint : pcbPoint, to = transfer.kind === 'save' ? pcbPoint : cpuPoint;
      const middle = (from.x + to.x) / 2;
      const next = { key: `${transfer.kind}:${transfer.actor}`, path: `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`, from: transfer.from, to: transfer.to, kind: transfer.kind };
      setPath(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    reveal(); measure();
    const observer = new ResizeObserver(measure);
    [root, cpu, list, ...rows].forEach(element => observer.observe(element));
    list.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); list.removeEventListener('scroll', measure); };
    // New snapshots are created on render; only semantic/layout changes need new observers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, enabled, signature]);
  const visible = enabled && path?.key === transferKey ? path : null;
  if (!visible) return null;
  return <svg className={styles.transfer} aria-hidden="true">
    <defs><marker id={`${marker}-arrow`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke" /></marker></defs>
    <path className={styles.trail} d={visible.path} />
    <path d={visible.path} data-cs-edge={visible.key} data-cs-from={visible.from} data-cs-to={visible.to} data-cs-kind={visible.kind} markerEnd={`url(#${marker}-arrow)`} />
  </svg>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const current = !view.fields.length || view.fields.includes('현재');
  const registers = !view.fields.length || view.fields.includes('레지스터');
  const pcbs = !view.fields.length || view.fields.includes('PCB');
  const container = useRef<HTMLDivElement>(null);
  return <div className={styles.visual} data-cs-visual data-cs-role="record" data-cs-phase={s.phase}>
    <div className={styles.context}>
      <strong className={styles.phase}>{phaseLabel[s.phase]}</strong>
      {current && <span className={styles.identity}>선택된 대상 <b data-cs-selected={s.selectedId}>{s.selectedLabel}</b></span>}
      {current && registers && <span className={styles.identity}>CPU 문맥 <b data-cs-loaded={s.loadedId} data-cs-different={s.loadedId !== s.selectedId}>{s.loadedLabel}</b></span>}
    </div>
    {registers || pcbs ? <div className={`${styles.boardScroll} nodrag nowheel`} tabIndex={0} aria-label="CPU 레지스터와 PCB 문맥">
      <div ref={container} className={styles.board} data-cs-both={registers && pcbs}>
        {registers && pcbs && <Transfer container={container} snapshot={s} enabled />}
        {registers && <section className={styles.cpu} data-cs-cpu data-cs-active={Boolean(s.transfer)}>
          <h4>CPU <span>레지스터</span></h4>
          <div className={`${styles.cpuValues} nodrag nowheel`} tabIndex={0} aria-label="CPU 레지스터 값"><Registers cells={s.registers} /></div>
        </section>}
        {pcbs && <section className={styles.pcbSection}>
          <h4>PCB <span>저장된 문맥</span></h4>
          <div className={`${styles.pcbList} nodrag nowheel`} data-cs-pcb-list tabIndex={0} aria-label="모든 PCB의 저장된 문맥">
            {s.pcbs.map(pcb => <section key={pcb.nodeKey} className={styles.pcb} data-cs-pcb={pcb.nodeKey} data-cs-active={pcb.active} data-cs-selected-row={current ? pcb.selected : undefined}>
              <h5><strong title={pcb.id}>{pcb.label}</strong>{pcb.active && <b className={styles.transferBadge}>{s.phase === 'save' ? '저장' : '복원'}</b>}{current && pcb.selected && <span className={styles.selectedBadge}>선택됨</span>}</h5>
              <Registers cells={pcb.registers} compact />
            </section>)}
          </div>
        </section>}
      </div>
    </div> : !current && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function ContextSwitchVisual({ instance, execution, cursor, view }: Props) {
  let snapshot: Snapshot;
  try { snapshot = contextSwitchSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-cs-invalid role="status">설정을 확인하세요. PCB와 교환 순서를 완성하면 문맥이 표시됩니다.</p>; }
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  if (view.role === 'actor') {
    const pcbs = snapshot.pcbs.filter(pcb => (!view.target || pcb.id === view.target) && (!view.fields.length || view.fields.includes(pcb.label)));
    return <div className={styles.actors} data-cs-visual data-cs-role="actor">{pcbs.map(pcb => <div key={pcb.nodeKey} className={styles.actor} data-cs-actor={pcb.id} data-cs-selected-row={pcb.selected}>
      <strong title={pcb.id}>{pcb.label}</strong><span>{pcb.selected ? '선택됨' : '대기'}</span>
    </div>)}{!pcbs.length && <p className={styles.empty}>선택한 실행 주체가 없습니다.</p>}</div>;
  }
  return null;
}

export function ContextSwitchExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = contextSwitchSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 CPU와 PCB 사이의 저장·복원을 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="CS 하단 설명" data-cs-explanation>
    <p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`CS 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
