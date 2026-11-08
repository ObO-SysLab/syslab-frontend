import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type InodeScalar = string | number | boolean | null;
interface NodeBase { key: string; id: string; label: string }
export type InodeNode =
  | (NodeBase & { kind: 'name'; inode: string })
  | (NodeBase & { kind: 'inode'; size: number; direct: string[]; indirect: string | null; names: string[] })
  | (NodeBase & { kind: 'indirect'; blocks: string[] })
  | (NodeBase & { kind: 'block'; value: InodeScalar });
export interface InodeLink {
  key: string;
  from: string;
  to: string;
  kind: 'name' | 'direct' | 'indirect' | 'indirect-data';
  pointerIndex?: number;
}
export interface InodeAccessResult {
  inode: string;
  logical: number | null;
  block: string | null;
  offset: number | null;
  eof: boolean;
}
export interface InodeSnapshot {
  blockSize: number;
  nodes: InodeNode[];
  links: InodeLink[];
  activeNodeKeys: string[];
  activeLinkKeys: string[];
  currentNodeKey: string | null;
  current: SemanticEvent | null;
  access: { index: number; name: string; label: string; fileOffset: number } | null;
  result: InodeAccessResult | null;
  summary: string;
}
interface InodeInput {
  fs: {
    blockSize: number;
    directory: Record<string, string>;
    inodes: Record<string, { size: number; direct: string[]; indirect: string | null }>;
    indirect: Record<string, string[]>;
    blocks: Record<string, InodeScalar>;
  };
  accesses: { name: string; offset: number }[];
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`inode 표시: ${message}`);
}

/** Static authored structure, with highlights derived only from the selected trace prefix. */
export function inodeSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): InodeSnapshot {
  requireValue(instance.scenarioId === 'IN', '파일 접근 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'IN', '실행 기록의 모델이 다릅니다.');
  // Reuse the accepted shape contract, without running the model or inspecting its final result.
  checkShape(registry.IN.inputSchema, instance.input, 'input');
  const { fs, accesses } = instance.input as unknown as InodeInput;
  const { directory, inodes, indirect, blocks, blockSize } = fs;
  for (const id of Object.values(directory)) {
    requireValue(Object.hasOwn(inodes, id), '디렉터리가 없는 inode를 가리킵니다.');
  }
  for (const node of Object.values(inodes)) {
    requireValue(node.indirect === null || Object.hasOwn(indirect, node.indirect), '간접 블록이 없습니다.');
    const pointers = [...node.direct, ...(node.indirect === null ? [] : indirect[node.indirect])];
    requireValue(node.size <= pointers.length * blockSize, '파일 크기보다 블록이 부족합니다.');
    requireValue(pointers.every(id => Object.hasOwn(blocks, id)), '데이터 블록이 없습니다.');
  }
  requireValue(accesses.every(access => Object.hasOwn(directory, access.name)), '접근할 파일 이름이 없습니다.');
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  const base = (kind: InodeNode['kind'], id: string) => ({ key: `${kind}:${id}`, id, label: label(id) });
  const nodes: InodeNode[] = [
    ...Object.entries(directory).map(([id, inode]): InodeNode => ({ ...base('name', id), kind: 'name', inode })),
    ...Object.entries(inodes).map(([id, node]): InodeNode => ({
      ...base('inode', id), kind: 'inode', size: node.size, direct: [...node.direct], indirect: node.indirect,
      names: Object.keys(directory).filter(name => directory[name] === id),
    })),
    ...Object.entries(indirect).map(([id, pointers]): InodeNode => ({ ...base('indirect', id), kind: 'indirect', blocks: [...pointers] })),
    ...Object.entries(blocks).map(([id, value]): InodeNode => ({ ...base('block', id), kind: 'block', value })),
  ];
  const links: InodeLink[] = [];
  for (const [name, id] of Object.entries(directory)) {
    links.push({ key: `name-link:${name}`, from: `name:${name}`, to: `inode:${id}`, kind: 'name' });
  }
  for (const [id, node] of Object.entries(inodes)) {
    node.direct.forEach((block, pointerIndex) => links.push({
      key: `direct:${id}:${pointerIndex}`, from: `inode:${id}`, to: `block:${block}`, kind: 'direct', pointerIndex,
    }));
    if (node.indirect !== null) links.push({
      key: `indirect:${id}`, from: `inode:${id}`, to: `indirect:${node.indirect}`, kind: 'indirect',
    });
  }
  for (const [id, pointers] of Object.entries(indirect)) {
    pointers.forEach((block, pointerIndex) => links.push({
      key: `indirect-data:${id}:${pointerIndex}`, from: `indirect:${id}`, to: `block:${block}`, kind: 'indirect-data', pointerIndex,
    }));
  }
  // An unused indirect entry may reference a missing block in the existing model.
  // Preserve its pointer; do not invent a block or reject an otherwise valid input.
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  const current = events.at(-1) ?? null;
  if (current === null) return {
    blockSize, nodes, links, activeNodeKeys: [], activeLinkKeys: [], currentNodeKey: null,
    current: null, access: null, result: null,
    summary: Object.keys(directory).length
      ? '파일 이름에서 inode를 찾고, 직접 또는 간접 포인터를 따라 데이터 블록에 접근합니다.'
      : '등록된 파일 이름이 없습니다.',
  };

  checkShape(registry.IN.eventSchema, current, 'event');
  const index = current.data.index as number;
  requireValue(index < accesses.length, '사건에 해당하는 접근 입력이 없습니다.');
  const selected = accesses[index], id = directory[selected.name], node = inodes[id];
  const access = { index, name: selected.name, label: label(selected.name), fileOffset: selected.offset };
  const activeNodes = new Set<string>(), activeLinks = new Set<string>();
  let currentNodeKey: string | null = null;
  const visit = (key: string, linkKey?: string) => {
    activeNodes.add(key);
    currentNodeKey = key;
    const link = linkKey ? links.find(item => item.key === linkKey) : undefined;
    if (link && activeNodes.has(link.from) && activeNodes.has(link.to)) activeLinks.add(link.key);
  };
  for (const event of events.filter(item => item.data.index === index)) {
    checkShape(registry.IN.eventSchema, event, 'event');
    requireValue(event.actor === null, '파일 접근 사건의 주체를 확인하세요.');
    const { target, result } = event.data;
    if (event.kind === 'lookup') {
      requireValue(target === selected.name && result === null, '파일 이름 조회 사건이 입력과 다릅니다.');
      visit(`name:${selected.name}`);
    } else if (event.kind === 'inode') {
      requireValue(target === id && result === null, 'inode 조회 사건이 입력과 다릅니다.');
      visit(`inode:${id}`, `name-link:${selected.name}`);
    } else if (event.kind === 'indirect') {
      requireValue(node.indirect !== null && target === node.indirect && result === null
        && selected.offset < node.size && Math.floor(selected.offset / blockSize) >= node.direct.length,
      '간접 블록 조회 사건이 입력과 다릅니다.');
      visit(`indirect:${node.indirect}`, `indirect:${id}`);
    } else {
      requireValue(result !== null, '접근 결과가 없습니다.');
      const value = result as unknown as InodeAccessResult;
      requireValue(value.inode === id, '접근 결과의 inode가 입력과 다릅니다.');
      if (event.kind === 'eof') {
        requireValue(target === id && selected.offset >= node.size && value.eof
          && value.logical === null && value.block === null && value.offset === null,
        '파일 끝 사건이 입력과 다릅니다.');
        visit(`inode:${id}`);
      } else {
        const logical = Math.floor(selected.offset / blockSize);
        const direct = logical < node.direct.length;
        const block = direct ? node.direct[logical] : node.indirect === null ? undefined : indirect[node.indirect][logical - node.direct.length];
        requireValue(selected.offset < node.size && !value.eof && value.logical === logical
          && value.block === block && target === block && value.offset === selected.offset % blockSize,
        '데이터 접근 사건이 입력과 다릅니다.');
        visit(`block:${block}`, direct ? `direct:${id}:${logical}` : `indirect-data:${node.indirect}:${logical - node.direct.length}`);
      }
    }
  }
  const result = current.kind === 'data' || current.kind === 'eof'
    ? { ...(current.data.result as unknown as InodeAccessResult) } : null;
  const summaries: Record<string, string> = {
    lookup: `파일 이름 ${access.label}을 디렉터리에서 찾습니다.`,
    inode: `${access.label}이 가리키는 inode ${label(id)}의 크기와 블록 포인터를 확인합니다.`,
    indirect: `inode ${label(id)}에서 간접 블록 ${node.indirect === null ? '' : label(node.indirect)}으로 이동합니다.`,
    data: `데이터 블록 ${result?.block === null || result?.block === undefined ? '' : label(result.block)}에 도달했습니다. 파일 위치 ${selected.offset}의 읽기 지점은 논리 블록 ${result?.logical}, 블록 내 위치 ${result?.offset}입니다.`,
    eof: `파일 위치 ${selected.offset}이 파일 크기 ${node.size} 이상이므로 EOF입니다. 데이터 블록에 접근하지 않습니다.`,
  };
  return {
    blockSize, nodes, links, activeNodeKeys: [...activeNodes], activeLinkKeys: [...activeLinks], currentNodeKey,
    current: structuredClone(current), access, result, summary: summaries[current.kind],
  };
}
