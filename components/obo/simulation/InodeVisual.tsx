'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { eventLabel } from '../runtime/projection.mjs';
import { inodeSnapshot } from './inodeModel';
import styles from './InodeVisual.module.css';

type Snapshot = ReturnType<typeof inodeSnapshot>;
type Node = Snapshot['nodes'][number];
type Link = Snapshot['links'][number];
type VisualProps = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
const groups = [
  { kind: 'name', field: '디렉터리', heading: '파일 이름' },
  { kind: 'inode', field: 'inode', heading: 'inode' },
  { kind: 'indirect', field: '간접블록', heading: '간접 블록' },
  { kind: 'block', field: '데이터', heading: '데이터 블록' },
] as const;
const phaseNames: Record<string, string> = { lookup: '이름 조회', inode: 'inode 확인', indirect: '간접 참조', data: '데이터 접근', eof: '파일 끝 · EOF' };
const linkName = (link: Link) => link.kind === 'direct' ? `직접 ${link.pointerIndex}` : link.kind === 'indirect' ? '간접' : link.kind === 'indirect-data' ? String(link.pointerIndex) : 'inode';
const scalarText = (value: string | number | boolean | null) => value === '' ? '""' : String(value);

function StructureLinks({ container, links, active }: {
  container: RefObject<HTMLDivElement | null>; links: Link[]; active: string[];
}) {
  const marker = useId().replaceAll(':', '');
  const signature = JSON.stringify(links);
  const [paths, setPaths] = useState<Record<string, string>>({});
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const nodes = new Map([...root.querySelectorAll<HTMLElement>('[data-inode-node]')].map(element => [element.dataset.inodeNode, element]));
    const ports = new Map([...root.querySelectorAll<HTMLElement>('[data-inode-port]')].map(element => [element.dataset.inodePort, element]));
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const next: Record<string, string> = {};
      for (const link of links) {
        const source = ports.get(link.key) ?? nodes.get(link.from), target = nodes.get(link.to);
        if (!source || !target) continue;
        const a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
        const x1 = (a.right - bounds.left) / scale, y1 = (a.top + a.height / 2 - bounds.top) / scale;
        const x2 = (b.left - bounds.left) / scale, y2 = (b.top + b.height / 2 - bounds.top) / scale;
        // Direct pointers cross above the indirect column, never through its cards.
        next[link.key] = link.kind === 'direct' && x2 - x1 > 140
          ? `M ${x1} ${y1} H ${x1 + 16} V 51 H ${x2 - 16} V ${y2} H ${x2 - 3}`
          : `M ${x1} ${y1} C ${x1 + (x2 - x1) / 2} ${y1}, ${x1 + (x2 - x1) / 2} ${y2}, ${x2 - 3} ${y2}`;
      }
      setPaths(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [root, ...nodes.values(), ...ports.values()].forEach(element => observer.observe(element));
    return () => observer.disconnect();
    // Links are reconstructed by the snapshot; their semantic signature is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, signature]);
  const activeKeys = new Set(active);
  return <svg className={styles.links} aria-hidden="true">
    <defs><marker id={`${marker}-arrow`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse"><path d="M 0 0 L 5 2.5 L 0 5 z" fill="context-stroke" /></marker></defs>
    {links.filter(link => activeKeys.has(link.key)).map(link => <path key={`trail-${link.key}`} className={styles.pathTrail} d={paths[link.key] ?? ''} />)}
    {[...links.filter(link => !activeKeys.has(link.key)), ...links.filter(link => activeKeys.has(link.key))].map(link => <path
      key={link.key} d={paths[link.key] ?? ''} markerEnd={`url(#${marker}-arrow)`}
      data-inode-edge={link.key} data-inode-from={link.from} data-inode-to={link.to} data-inode-active={activeKeys.has(link.key)}
    />)}
  </svg>;
}

function BlockContent({ node }: { node: Extract<Node, { kind: 'block' }> }) {
  const text = scalarText(node.value), long = text.length > 32 || text.includes('\n');
  return <div className={styles.blockContent}>
    {long ? <details className="nodrag" data-inode-content-details={node.key}>
      <summary>{text.slice(0, 24)}… <span>원문 펼치기</span></summary>
      <pre data-inode-content={node.key}>{text}</pre>
    </details> : <strong data-inode-content={node.key}>{text}</strong>}
  </div>;
}

function StructureNode({ node, snapshot, links, showMissingPointers }: { node: Node; snapshot: Snapshot; links: Link[]; showMissingPointers: boolean }) {
  const current = snapshot.currentNodeKey === node.key, visited = snapshot.activeNodeKeys.includes(node.key);
  const missingPointers = node.kind === 'indirect' && showMissingPointers
    ? node.blocks.flatMap((id, index) => snapshot.nodes.some(candidate => candidate.kind === 'block' && candidate.id === id) ? [] : [{ id, index }])
    : [];
  return <div className={styles.node} data-inode-node={node.key} data-inode-kind={node.kind} data-inode-current={current} data-inode-visited={visited} data-inode-eof={current && snapshot.result?.eof === true}>
    <div className={styles.nodeHeading}><strong title={node.id}>{node.label}</strong>{current && <span className={styles.current}>{snapshot.result?.eof ? 'EOF' : '현재'}</span>}</div>
    {node.kind === 'inode' && <div className={styles.size}><strong>{node.size}</strong><span>바이트</span></div>}
    {node.kind === 'block' && <BlockContent node={node} />}
    {(node.kind === 'inode' || node.kind === 'indirect') && links.length > 0 && <div className={styles.ports}>
      {links.map(link => <div key={link.key} className={styles.port} data-inode-port={link.key} data-inode-active={snapshot.activeLinkKeys.includes(link.key)}><span>{linkName(link)}</span><i aria-hidden="true" /></div>)}
    </div>}
    {missingPointers.map(({ id, index }) => <div key={index} className={styles.missingPointer} data-inode-missing-pointer={`${node.key}:${index}`}>
      <span>{index} ·</span><strong>{id}</strong><span>대상 없음</span>
    </div>)}
  </div>;
}

function StorageVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const container = useRef<HTMLDivElement>(null);
  const visibleGroups = groups.filter(group => !view.fields.length || view.fields.includes(group.field));
  const kinds = new Set<string>(visibleGroups.map(group => group.kind));
  const nodes = s.nodes.filter(node => kinds.has(node.kind)), nodeKeys = new Set(nodes.map(node => node.key));
  const links = s.links.filter(link => nodeKeys.has(link.from) && nodeKeys.has(link.to));
  const currentFileVisible = kinds.has('name');
  return <div className={styles.storage} data-inode-visual data-inode-role="storage">
    <div className={styles.context} data-inode-phase={s.current?.kind ?? 'initial'} data-inode-access={s.access?.index}>
      <strong className={styles.phase} data-inode-eof={s.result?.eof === true}>{s.current ? phaseNames[s.current.kind] ?? eventLabel(s.current) : '파일 구조'}</strong>
      {s.access && <>
        <span className={styles.contextItem}>접근 <b>{s.access.index + 1}</b></span>
        {currentFileVisible && <span className={styles.currentFile} data-inode-current-file={s.access.name}>{s.access.label}</span>}
        <span className={styles.contextItem}>파일 위치 <b data-inode-file-offset>{s.access.fileOffset}</b></span>
      </>}
      {s.result && <span className={styles.result} data-inode-result={s.result.eof ? 'eof' : 'data'}>
        {s.result.eof ? '범위 밖' : <>{kinds.has('inode') && <span>논리 블록 <b>{s.result.logical}</b></span>}{kinds.has('block') && <span>블록 내 위치 <b data-inode-block-offset>{s.result.offset}</b></span>}</>}
      </span>}
    </div>
    {visibleGroups.length ? <div className={`${styles.graphScroll} nodrag nowheel`} tabIndex={0} aria-label="파일 이름과 inode, 블록의 연결 구조">
      <div ref={container} className={styles.graph} style={{ gridTemplateColumns: `repeat(${visibleGroups.length}, minmax(168px, 1fr))`, minWidth: visibleGroups.length * 168 + Math.max(visibleGroups.length - 1, 0) * 44 }}>
        <StructureLinks container={container} links={links} active={s.activeLinkKeys} />
        {visibleGroups.map(group => <section key={group.kind} className={styles.column} data-inode-group={group.field}>
          <h4>{group.heading}</h4>
          <div className={styles.nodeList}>{nodes.filter(node => node.kind === group.kind).map(node => <StructureNode key={node.key} node={node} snapshot={s} links={links.filter(link => link.from === node.key)} showMissingPointers={kinds.has('block')} />)}
            {!nodes.some(node => node.kind === group.kind) && <span className={styles.empty}>없음</span>}
          </div>
        </section>)}
      </div>
      <ul className={styles.srOnly} aria-label="표시된 연결">{links.map(link => <li key={link.key}>{nodes.find(node => node.key === link.from)?.label} → {nodes.find(node => node.key === link.to)?.label} · {linkName(link)}</li>)}</ul>
    </div> : <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

function RecordVisual({ snapshot: s, view }: { snapshot: Snapshot; view: SimulationView }) {
  const fields = new Set(view.fields.length ? view.fields : ['index', 'target', 'result']);
  const target = s.nodes.find(node => node.key === s.currentNodeKey);
  return <div className={styles.record} data-inode-visual data-inode-role="record" data-inode-phase={s.current?.kind ?? 'initial'}>
    <strong className={styles.phase}>{s.current ? phaseNames[s.current.kind] ?? eventLabel(s.current) : '접근 전'}</strong>
    <div className={styles.recordFields}>
      {fields.has('index') && <div data-inode-field="index"><span>접근</span><strong data-inode-index={s.access?.index} title={s.access ? `index ${s.access.index}` : undefined}>{s.access ? s.access.index + 1 : '—'}</strong></div>}
      {fields.has('target') && <div data-inode-field="target"><span>현재 대상</span><strong>{target?.label ?? '—'}</strong></div>}
      {fields.has('result') && <div className={styles.recordResult} data-inode-field="result" data-inode-result={s.result ? s.result.eof ? 'eof' : 'data' : 'pending'}><span>결과</span>
        {!s.result ? <strong>—</strong> : s.result.eof ? <strong className={styles.eof}>파일 끝 · EOF</strong> : <dl>
          <div><dt>inode</dt><dd>{s.nodes.find(node => node.key === `inode:${s.result!.inode}`)?.label ?? s.result.inode}</dd></div>
          <div><dt>논리 블록</dt><dd>{s.result.logical}</dd></div>
          <div><dt>데이터 블록</dt><dd>{s.nodes.find(node => node.key === `block:${s.result!.block}`)?.label ?? s.result.block}</dd></div>
          <div><dt>블록 내 위치</dt><dd data-inode-block-offset>{s.result.offset}</dd></div>
        </dl>}
      </div>}
    </div>
    {!['index', 'target', 'result'].some(field => fields.has(field)) && <p className={styles.empty}>선택한 표시 항목이 없습니다.</p>}
  </div>;
}

export function InodeVisual({ instance, execution, cursor, view }: VisualProps) {
  let snapshot: Snapshot;
  try { snapshot = inodeSnapshot(instance, execution, cursor); }
  catch { return <p className={styles.invalid} role="status" data-inode-invalid>설정을 확인하세요. 파일과 블록 입력을 완성하면 구조가 표시됩니다.</p>; }
  if (view.role === 'storage') return <StorageVisual snapshot={snapshot} view={view} />;
  if (view.role === 'record') return <RecordVisual snapshot={snapshot} view={view} />;
  return null;
}

export function InodeExplanation({ instance, execution, cursor, onChange, onAdd }: {
  instance: SimulationInstance; execution: ModelRun | null; cursor: number;
  onChange?: (id: string, text: string) => void; onAdd?: () => void;
}) {
  let summary: string;
  try { summary = inodeSnapshot(instance, execution, cursor).summary; }
  catch { summary = '입력 설정을 확인하면 파일 접근 경로를 볼 수 있습니다.'; }
  const event = execution?.events[cursor];
  const notes = instance.views.filter(view => view.role === 'annotation');
  const visible = notes.filter(view => !view.hidden && (!view.when.kind || view.when.kind === event?.kind) && (!view.when.actor || view.when.actor === event?.actor) && (!view.fields.length || view.fields.includes(eventLabel(event))) && view.text.trim());
  return <section className={styles.explanation} aria-label="IN 하단 설명" data-inode-explanation>
    <p className={styles.autoExplanation} aria-live="polite">{summary}</p>
    {onChange ? <div className={styles.noteEditors}>{notes.map((view, i) => <label key={view.id}>
      <span>설명 {i + 1}{view.hidden ? ' · 숨김' : ''}</span>
      <textarea className="nodrag nowheel" value={view.text} rows={3} maxLength={4000} aria-label={`IN 설명 ${i + 1}`} placeholder="그림 아래에 보여줄 설명" onChange={event => onChange(view.id, event.target.value)} />
    </label>)}</div> : visible.map(view => <p key={view.id} className={styles.authored}>{view.text}</p>)}
    {onChange && onAdd && <button type="button" className={styles.addNote} onClick={onAdd}>+ 설명 추가</button>}
  </section>;
}
