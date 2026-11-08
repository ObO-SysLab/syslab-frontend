import { describe, expect, it } from 'vitest';
import { AUTHORING_FIELDS, changedFields, validateElement } from '../authoring/model';
import { applyFrame } from '../lib/applyFrame';
import { getEventFields, getStateFields } from '../lib/overrideFields';
import { diagramFields, parseDiagramTrace, validateFreeDiagram } from '../runtime/freeDiagram.mjs';
import type { Frame, OboBlob } from '../types';

const queueData = () => ({ label: 'Buffer', capacity: 3, items: ['A'], direction: 'ltr' });
const blob = (frames: Frame[] = []): OboBlob => ({
  nodes: [
    { id: 'q', type: 'queue-strip', position: { x: 0, y: 0 }, data: queueData() },
    { id: 'empty', type: 'counter-badge', position: { x: 0, y: -80 }, data: { label: 'empty', value: 1, min: 0, max: 3 } },
    { id: 'pending', type: 'text-label', position: { x: -100, y: 0 }, data: { text: 'D' } },
  ], edges: [], frames,
});
const frame = (id: string, nodeDataOverrides: Frame['nodeDataOverrides']): Frame => ({
  id, label: id, highlightNodes: [], highlightEdges: [], nodeDataOverrides,
});
const queuePresentation = { displayStyle: 'buffer', showCount: false, showDirection: true };
const counterPresentation = { displayStyle: 'semaphore', caption: '넣기 허용', showTokens: true, showInPlayback: false };
const withBasePatch = (nodeId: string, patch: Record<string, unknown>) => {
  const document = blob();
  const node = document.nodes.find(node => node.id === nodeId)!;
  node.data = { ...node.data, ...patch };
  return document;
};

describe('C1 presentation at the save/import boundary', () => {
  it('preserves legacy data and omitted presentation defaults in every manual wrapper', () => {
    const legacy = blob();
    const serialized = JSON.stringify(legacy);
    expect(validateElement('queue-strip', queueData())).toEqual({ data: queueData(), errors: [] });
    for (const document of [legacy, { mode: 'single', single: legacy }, { mode: 'per_choice', perChoice: { choice_1: legacy } }]) {
      const imported = JSON.parse(JSON.stringify(document));
      expect(validateFreeDiagram(imported)).toEqual(document);
    }
    expect(JSON.stringify(legacy)).toBe(serialized);
  });

  it('round-trips queue options in base data and scenes while preserving later item edits', () => {
    const edited = validateElement('queue-strip', { ...queueData(), ...queuePresentation });
    expect(edited.errors).toEqual([]);
    expect(changedFields('queue-strip', queueData(), edited.data)).toEqual(queuePresentation);
    const document = withBasePatch('q', edited.data);
    const alternate = { displayStyle: 'strip', showCount: true, showDirection: false, direction: 'rtl' };
    document.frames = [frame('style', { q: alternate }), frame('items', { q: { items: ['B', 'C'] } })];
    const serialized = JSON.stringify(document), imported = JSON.parse(serialized);
    expect(validateFreeDiagram(imported)).toEqual(document);
    expect(applyFrame(imported.nodes, imported.frames, 1)[0].data).toMatchObject({ ...alternate, items: ['B', 'C'] });
    expect(JSON.stringify(imported)).toBe(serialized);
  });

  it('round-trips counter and text presentation without deriving counter values from occupancy', () => {
    const document = withBasePatch('empty', counterPresentation);
    document.nodes[2].data = { ...document.nodes[2].data, variant: 'item', caption: '다음 항목' };
    document.frames = [
      frame('reserved', { q: { items: ['A', 'B'] }, empty: { value: 0, delta: -1 }, pending: { text: 'D' } }),
      frame('waiting', { pending: { text: '' } }),
    ];
    const serialized = JSON.stringify(document), imported = JSON.parse(serialized);
    expect(validateFreeDiagram(imported)).toEqual(document);
    expect(imported.nodes[1].data).toMatchObject({ ...counterPresentation, value: 1 });
    const shown = applyFrame(imported.nodes, imported.frames, 1);
    expect(shown[0].data.items).toEqual(['A', 'B']);
    expect(shown[1].data).toMatchObject({ ...counterPresentation, value: 0, delta: null });
    expect(shown[2].data).toMatchObject({ variant: 'item', caption: '다음 항목', text: '' });
    expect(JSON.stringify(imported)).toBe(serialized);
  });

  it('keeps the generic counter number contract including fractional and negative values', () => {
    for (const value of [-1.5, 0, 2.5, 5]) {
      const document = withBasePatch('empty', { ...counterPresentation, value });
      expect(validateFreeDiagram(document)).toBe(document);
      expect(document.nodes[1].data.value).toBe(value);
    }
  });

  it('rejects malformed queue options and direction in authoring and base/scene imports', () => {
    const invalid: Record<string, unknown>[] = [
      { displayStyle: 'semaphore' }, { displayStyle: null }, { displayStyle: ['buffer'] },
      { showCount: 'false' }, { showCount: 0 }, { showCount: null },
      { showDirection: 'true' }, { showDirection: [] }, { showDirection: null },
      { direction: 'left' }, { direction: ['ltr'] }, { direction: null },
    ];
    for (const patch of invalid) {
      const input = { ...queueData(), ...patch }, serialized = JSON.stringify(input);
      expect.soft(validateElement('queue-strip', input).errors.length, JSON.stringify(patch)).toBeGreaterThan(0);
      for (const document of [withBasePatch('q', patch), blob([frame('invalid', { q: patch })])]) {
        expect(() => validateFreeDiagram(document), JSON.stringify(patch)).toThrow();
      }
      expect(JSON.stringify(input)).toBe(serialized);
    }
  });

  it('rejects wrong counter/text option types and captions longer than 80 characters', () => {
    const invalid: [string, Record<string, unknown>][] = [
      ['empty', { displayStyle: 'buffer' }], ['empty', { displayStyle: null }], ['empty', { displayStyle: ['badge'] }],
      ['empty', { caption: 7 }], ['empty', { caption: null }], ['empty', { caption: '가'.repeat(81) }],
      ['empty', { showTokens: 'true' }], ['empty', { showTokens: 0 }], ['empty', { showTokens: null }],
      ['empty', { showInPlayback: 'false' }], ['empty', { showInPlayback: [] }], ['empty', { showInPlayback: null }],
      ['pending', { caption: false }], ['pending', { caption: null }], ['pending', { caption: '가'.repeat(81) }],
    ];
    for (const [nodeId, patch] of invalid) {
      const document = withBasePatch(nodeId, patch), serialized = JSON.stringify(document);
      expect(() => validateFreeDiagram(document), JSON.stringify(patch)).toThrow();
      expect(JSON.stringify(document)).toBe(serialized);
    }
    for (const nodeId of ['empty', 'pending']) {
      expect(() => validateFreeDiagram(withBasePatch(nodeId, { caption: '가'.repeat(80) }))).not.toThrow();
    }
    for (const variant of ['item', 'status']) {
      expect(() => validateFreeDiagram(withBasePatch('pending', { variant, caption: '' }))).not.toThrow();
    }
  });

  it('keeps counter/text options base-only and retains the specialized counter authoring form', () => {
    expect(AUTHORING_FIELDS['counter-badge']).toBeUndefined();
    expect(AUTHORING_FIELDS['text-label']).toBeUndefined();
    for (const [field, value] of Object.entries(counterPresentation)) {
      expect(() => validateFreeDiagram(blob([frame('invalid', { empty: { [field]: value } })]))).toThrow();
    }
    expect(() => validateFreeDiagram(blob([frame('invalid', { pending: { caption: '다음 항목' } })]))).toThrow();
    expect(() => validateFreeDiagram(blob([frame('invalid', { pending: { variant: 'status' } })]))).toThrow();
  });

  it('keeps every new option out of coding output while accepting the existing value fields', () => {
    expect(diagramFields['queue-strip']).toEqual(['capacity', 'items', 'direction']);
    expect(diagramFields['counter-badge']).toEqual(['value', 'delta']);
    expect(diagramFields['text-label']).toEqual(['text']);
    expect(getStateFields('queue-strip')).toEqual([]);
    expect(getStateFields('counter-badge')).toEqual(['value']);
    expect(getEventFields('counter-badge')).toEqual(['delta']);
    const nodes = blob().nodes;
    const displayOverrides = { q: queuePresentation, empty: counterPresentation, pending: { variant: 'status', caption: '상태' } };
    for (const [nodeId, options] of Object.entries(displayOverrides)) for (const [field, value] of Object.entries(options)) {
      const output = JSON.stringify({ v: 1, overrides: { [nodeId]: { [field]: value } }, highlightNodes: [] });
      expect(parseDiagramTrace(output, nodes, []).errors.length, `${nodeId}.${field}`).toBeGreaterThan(0);
    }
    const output = JSON.stringify({ v: 1, overrides: { q: { items: ['A', 'B'], direction: 'rtl' }, empty: { value: 0, delta: -1 }, pending: { text: 'D' } }, highlightNodes: [] });
    expect(parseDiagramTrace(output, nodes, []).errors).toEqual([]);
  });
});
