import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { registry, run } from '../runtime/index.mjs';
import type { Json, ModelRun } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { BankerExplanation, BankerVisual } from './BankerVisual';
import { InodeVisual } from './InodeVisual';
import { ProcessStructureVisual } from './ProcessStructureVisual';
import { ContextSwitchVisual } from './ContextSwitchVisual';
import { LifecycleVisual } from './LifecycleVisual';
import { BoundedBufferVisual } from './BoundedBufferVisual';
import { lifecycleSnapshot } from './lifecycleModel';
import { processSnapshot } from './processStructureModel';
import { inodeSnapshot } from './inodeModel';

type Props = { instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationView };
type Case = { name: string; scenario: string; original: string; component: ComponentType<Props>; setup?: (instance: SimulationInstance) => void };
const cases: Case[] = [
  { name: 'BK actor', scenario: 'BK', original: 'P', component: BankerVisual },
  { name: 'BK resource', scenario: 'BK', original: 'R', component: BankerVisual },
  { name: 'IN name', scenario: 'IN', original: 'a', component: InodeVisual },
  { name: 'IN inode', scenario: 'IN', original: 'i', component: InodeVisual },
  { name: 'IN block', scenario: 'IN', original: 'b', component: InodeVisual },
  { name: 'IN indirect', scenario: 'IN', original: 'indirect1', component: InodeVisual, setup: i => {
    i.input = { fs: { blockSize: 4, directory: { a: 'i' }, inodes: { i: { size: 4, direct: [], indirect: 'indirect1' } }, indirect: { indirect1: ['b'] }, blocks: { b: 'data' } }, accesses: [{ name: 'a', offset: 0 }] };
  } },
  { name: 'PT thread', scenario: 'PT', original: 'T', component: ProcessStructureVisual },
  { name: 'PT process', scenario: 'PT', original: 'P', component: ProcessStructureVisual },
  { name: 'CS actor', scenario: 'CS', original: 'P', component: ContextSwitchVisual },
  { name: 'ST2 actor', scenario: 'ST2', original: 'P1', component: LifecycleVisual },
];
function rename(value: Json, before: string, after: string): Json {
  if (Array.isArray(value)) return value.map(v => rename(v, before, after));
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key === before ? after : key, rename(v, before, after)]));
  return value === before ? after : value;
}
function fixture(test: Case, id = 'toString') {
  const doc = createDocument(test.scenario), instance = doc.instances[0];
  test.setup?.(instance);
  instance.input = rename(instance.input, test.original, id) as SimulationInstance['input'];
  instance.views = instance.views.map(view => ({ ...view, target: view.target === test.original ? id : view.target }));
  // Imports and saved documents use ordinary JSON objects, not null-prototype maps.
  const imported = JSON.parse(JSON.stringify(doc)) as typeof doc;
  expect(validateDocument(imported)).toBe(true);
  const i = imported.instances[0], execution = run(test.scenario, i.input);
  return { doc: imported, instance: i, execution,
    render: (cursor = 0, view = i.views[0]) => renderToStaticMarkup(createElement(test.component, { instance: i, execution, cursor, view })) };
}
afterEach(() => vi.restoreAllMocks());

describe('valid identifiers keep their names through real traces and renderers', () => {
  it.each(cases)('$name renders inherited-looking raw IDs without invalid children', test => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const id of ['toString', 'valueOf', 'hasOwnProperty']) {
      const { render } = fixture(test, id);
      expect(render()).toMatch(new RegExp(`>${id}<`));
      expect(render(-1)).not.toContain('[native code]');
    }
    expect(error).not.toHaveBeenCalled();
  });

  it.each(cases)('$name preserves authored and deliberately empty labels', test => {
    const { instance, render } = fixture(test);
    instance.labels = { ...instance.labels, toString: 'Authored name' };
    expect(render()).toContain('>Authored name<');
    instance.labels = { ...instance.labels, toString: '' };
    const html = render();
    expect(html).not.toContain('>Authored name<');
    expect(html).not.toContain('>toString<');
  });

  it('accepts constructor as a BK resource while still rejecting reserved object keys and actor traces', () => {
    const f = fixture(cases[1], 'constructor');
    expect(f.render()).toContain('>constructor<');
    const invalid = createDocument('CS');
    invalid.instances[0].input = { pcbs: Object.fromEntries([['constructor', { pc: 1 }]]), initialId: 'constructor', order: [] };
    expect(() => validateDocument(invalid)).toThrow();
    const bk = createDocument('BK');
    bk.instances[0].input = rename(bk.instances[0].input, 'P', 'constructor') as SimulationInstance['input'];
    expect(() => validateDocument(bk)).toThrow();
  });

  it('keeps actor and memory field selections usable across the shared projection', () => {
    for (const scenario of ['ST2', 'G2', 'RR', 'PS', 'CS', 'TH', 'S3', 'PC', 'BK', 'DP', 'IPC', 'K-SYSCALL', 'K-INTERRUPT', 'PT']) {
      // Since 2026-11-08 the CPU scheduling, S3 and ST2 defaults start at P1 and the DP default at A; rename the first actor.
      const doc = createDocument(scenario), i = doc.instances[0], before = scenario === 'PT' ? 'T' : ['G2', 'RR', 'PS', 'S3', 'ST2'].includes(scenario) ? 'P1' : scenario === 'DP' ? 'A' : 'P';
      i.input = rename(i.input, before, 'toString') as SimulationInstance['input'];
      i.views = i.views.map(view => ({ ...view, target: view.target === before ? 'toString' : view.target }));
      expect(validateDocument(doc)).toBe(true);
      const execution = run(scenario, i.input), view = createView(scenario === 'TH' ? 'memory' : 'actor');
      view.fields = ['toString'];
      expect(projection(i, execution, -1, view).rows.map(row => row[0])).toEqual(['toString']);
      i.labels = { ...i.labels, toString: 'Chosen name' }; view.fields = ['Chosen name'];
      expect(projection(i, execution, -1, view).rows.map(row => row[0])).toEqual(['Chosen name']);
      i.labels = { ...i.labels, toString: '' }; view.fields = [''];
      expect(projection(i, execution, -1, view).rows.map(row => row[0])).toEqual(['']);
    }
  });

  it('uses safe names in final scheduling metrics and resource relationships', () => {
    const cpu = createDocument('G2').instances[0];
    cpu.input = rename(cpu.input, 'P1', 'toString') as SimulationInstance['input'];
    const execution = run('G2', cpu.input);
    expect(projection(cpu, execution, execution.events.length - 1, createView('metric')).rows[0][0]).toBe('toString');
    // The contract's minimal example has one pending request P → R at the initial state.
    const resource = createDocument('S3').instances[0];
    resource.input = rename(structuredClone(registry.S3.inputExample), 'P', 'toString') as SimulationInstance['input'];
    const relationship = projection(resource, run('S3', resource.input), -1, createView('relation'));
    expect(relationship.rows[0][0]).toBe('toString → R');
  });

  it('keeps summaries and authored condition descriptions free of native function text', () => {
    const st2 = fixture(cases[9]), pt = fixture(cases[6]), inode = fixture(cases[4]);
    expect(lifecycleSnapshot(st2.instance, st2.execution, 0).summary).toMatch(/^toString:/);
    expect(processSnapshot(pt.instance, pt.execution, 0).summary).toMatch(/^toString/);
    expect(inodeSnapshot(inode.instance, inode.execution, inode.execution.events.length - 1).summary).toContain('블록 toString');
    const bk = fixture(cases[0]);
    bk.instance.views.find(view => view.role === 'annotation')!.when.actor = 'toString';
    const html = renderToStaticMarkup(createElement(BankerExplanation, { instance: bk.instance, execution: bk.execution, cursor: 0, onChange() {} }));
    expect(html).toContain('모든 사건 · toString');
    expect(html).not.toContain('[native code]');
  });

  it('preserves compact lifecycle views and the prior PC helper fix', () => {
    const st2 = fixture(cases[9]), compact = createView('relation');
    expect(st2.render(0, compact)).toContain('title="toString"');
    const actor = createView('actor'); actor.fields = ['toString'];
    expect(st2.render(0, actor)).toContain('>toString<');
    const pc = fixture({ name: 'PC', scenario: 'PC', original: 'P', component: BoundedBufferVisual });
    expect(pc.render()).toContain('>toString<');
  });
});
