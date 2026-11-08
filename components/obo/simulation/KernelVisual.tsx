'use client';

import { useEffect, useRef } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { kernelSnapshot, type KernelContext, type KernelScalar, type KernelSnapshot, type KernelState } from './kernelModel';
import styles from './KernelVisual.module.css';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const stateNames: Record<KernelState, string> = { Running: '실행', Ready: '준비', Waiting: '대기' };
const phaseNames: Record<KernelSnapshot['phase'], string> = {
  initial: '초기 상태', enter: '커널 진입', interrupt: '인터럽트', save: '문맥 저장', service: '요청 처리', handle: '핸들러 실행',
  return: '반환값 결정', block: '대기 전환', unblock: '대기 해제', select: '실행 대상 선택', restore: '문맥 복원',
};
const valueType = (value: KernelScalar) => value === null ? 'null' : typeof value;
const valueText = (value: KernelScalar) => typeof value === 'string' ? JSON.stringify(value) : String(value);

function Value({ value, id }: { value: KernelScalar; id: string }) {
  const text = valueText(value), long = text.length > 24 || typeof value === 'string' && value.includes('\n');
  return long ? <details className={`${styles.longValue} nodrag`} data-kernel-value-details={id}>
    <summary data-kernel-type={valueType(value)}>{text.slice(0, 18)}… <span>원문</span></summary>
    <pre data-kernel-raw={id}>{String(value)}</pre>
  </details> : <b className={styles.registerValue} data-kernel-value={id} data-kernel-type={valueType(value)}>{text}</b>;
}

/** Which context tag describes the current event for this row (static values are never shown as changed). */
function stepTag(s: KernelSnapshot, c: KernelContext) {
  if (!c.eventActor) return null;
  if (s.phase === 'save') return '문맥 저장 대상';
  if (s.phase === 'restore') return '문맥 복원 대상';
  if (s.phase === 'block') return '대기로 전환';
  if (s.phase === 'unblock') return '대기 해제';
  if (s.phase === 'select') return s.switched ? '새 실행 대상' : '계속 실행';
  return null;
}

function ContextRow({ snapshot: s, context: c }: { snapshot: KernelSnapshot; context: KernelContext }) {
  const tag = stepTag(s, c);
  return <li className={styles.contextRow} data-kernel-context={c.nodeKey} data-kernel-state={c.state} data-kernel-current={c.current} data-kernel-event-actor={c.eventActor}>
    <div className={styles.contextHead}>
      <strong title={c.id}>{c.label}</strong>
      <span className={styles.state} data-kernel-state-badge={c.state}>{stateNames[c.state]}</span>
      {c.current && <span className={styles.currentTag}>현재 실행</span>}
      {tag && <span className={styles.eventTag} data-kernel-step-tag>{tag}</span>}
    </div>
    {c.registers.length ? <dl className={styles.registers}>{c.registers.map(r => <div key={r.key}><dt>{r.key}</dt><dd><Value value={r.value} id={`${c.nodeKey}:${r.key}`} /></dd></div>)}</dl>
      : <p className={styles.emptyRegisters}>레지스터 값 없음</p>}
  </li>;
}

function Contexts({ snapshot: s, contexts }: { snapshot: KernelSnapshot; contexts: KernelContext[] }) {
  const list = useRef<HTMLOListElement>(null), focus = s.eventActor ?? s.current;
  useEffect(() => {
    const root = list.current, target = root && [...root.querySelectorAll<HTMLElement>('[data-kernel-context]')].find(e => e.dataset.kernelContext === `context:${focus}`);
    if (!root || !target) return;
    const box = root.getBoundingClientRect(), item = target.getBoundingClientRect(), scale = box.height / root.offsetHeight;
    if (!scale || !Number.isFinite(scale)) return;
    if (item.top < box.top) root.scrollTop -= (box.top - item.top) / scale + 4;
    else if (item.bottom > box.bottom) root.scrollTop += (item.bottom - box.bottom) / scale + 4;
  }, [focus, s.event?.step]);
  return <section className={styles.contexts}><h4>실행 문맥 <span>{contexts.length}개 · 사건 중 값은 바뀌지 않음</span></h4>
    <ol ref={list} className={`${styles.contextList} nodrag nowheel`} tabIndex={0} aria-label="모든 실행 문맥" data-kernel-context-list>
      {contexts.map(c => <ContextRow key={c.nodeKey} snapshot={s} context={c} />)}
    </ol>
  </section>;
}

function Regions({ snapshot: s, showActor }: { snapshot: KernelSnapshot; showActor: (id: string | null) => boolean }) {
  const runner = s.current === null ? <p className={styles.noRunner} data-kernel-runner="none">현재 실행 없음</p>
    : <p className={styles.runner} data-kernel-runner={showActor(s.current) ? s.current : 'hidden'}><span>실행 중</span>{showActor(s.current) && <b>{s.currentLabel}</b>}</p>;
  const eventActorDiffers = s.eventActor !== null && s.eventActor !== s.current && showActor(s.eventActor);
  const region = (mode: 'user' | 'kernel', title: string) => <section className={styles.region} data-kernel-region={mode} data-kernel-region-active={s.mode === mode}>
    <h4>{title}{s.mode === mode && <span className={styles.here}>현재 위치</span>}</h4>
    {s.mode === mode && <>
      {mode === 'kernel' && s.phase !== 'initial' && <p className={styles.step} data-kernel-step={s.phase}>{phaseNames[s.phase]}</p>}
      {runner}
      {eventActorDiffers && <p className={styles.eventActor} data-kernel-event-actor={s.eventActor}><span>사건 대상</span><b>{s.eventActorLabel}</b></p>}
    </>}
  </section>;
  return <div className={styles.regions} data-kernel-transition={s.transition ?? 'none'}>
    {region('user', '사용자 영역')}
    <div className={styles.modeLink} aria-hidden={s.transition === null} data-kernel-mode-link={s.transition ?? 'none'}>
      {s.transition === 'enter' && <><svg viewBox="0 0 80 24"><path d="M 4 12 H 70" /><path d="M 64 5 L 76 12 L 64 19 z" /></svg><span>진입</span></>}
      {s.transition === 'exit' && <><svg viewBox="0 0 80 24"><path d="M 76 12 H 10" /><path d="M 16 5 L 4 12 L 16 19 z" /></svg><span>복귀</span></>}
    </div>
    {region('kernel', '커널 영역')}
  </div>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: KernelSnapshot; view: SimulationView }) {
  const shown = (field: string) => !view.fields.length || view.fields.includes(field);
  const mode = shown('모드'), returnShown = shown('반환값');
  const contexts = s.contexts.filter(c => shown(c.id));
  // Hidden contexts must not reappear through the region chips either.
  const showActor = (id: string | null) => id !== null && contexts.some(c => c.id === id);
  const returnReady = s.returnValue !== null;
  return <div className={styles.visual} data-kernel-visual data-kernel-role="record" data-kernel-model={s.model} data-kernel-mode={mode ? s.mode : undefined} data-kernel-phase={s.phase}>
    <div className={styles.context}>
      {mode && <strong className={styles.modeBadge} data-kernel-mode-badge={s.mode}>{s.mode === 'kernel' ? '커널 모드' : '사용자 모드'}</strong>}
      <b className={styles.phase}>{phaseNames[s.phase]}</b>
    </div>
    {mode && <Regions snapshot={s} showActor={showActor} />}
    <div className={styles.lower}>
      {contexts.length > 0 && <Contexts snapshot={s} contexts={contexts} />}
      {returnShown && s.model === 'K-SYSCALL' && <section className={styles.returnBox} data-kernel-return={returnReady ? 'ready' : 'pending'}>
        <h4>반환값</h4>
        {returnReady ? <strong data-kernel-return-value>{s.returnValue}</strong> : <p>아직 정해지지 않음</p>}
        {returnReady && s.mode === 'kernel' && <span className={styles.returnNote}>커널에서 결정 · 아직 복귀 전</span>}
      </section>}
    </div>
    {!mode && !contexts.length && !(returnShown && s.model === 'K-SYSCALL') && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function KernelVisual({ instance, execution, cursor, view }: Props) {
  let snapshot: KernelSnapshot;
  try { snapshot = kernelSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} data-kernel-invalid role="status">설정을 확인하세요. 실행·대기 대상과 문맥을 완성하면 흐름이 표시됩니다.</p>; }
  return <RecordVisual snapshot={snapshot} view={view} />;
}

export function KernelExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = kernelSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 모드 전환과 실행 주체를 볼 수 있습니다.'; }
  const event = execution?.events[cursor], notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="커널 흐름 하단 설명" data-kernel-explanation><p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}><span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`커널 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
