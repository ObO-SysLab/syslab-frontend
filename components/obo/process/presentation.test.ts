import { describe, expect, it } from 'vitest';
import { changedFields, validateElement } from '../authoring/model';
import { applyFrame } from '../lib/applyFrame';
import { getEventFields, getStateFields, isOverridableNodeType } from '../lib/overrideFields';
import { validateFreeDiagram, parseDiagramTrace, diagramFields } from '../runtime/freeDiagram.mjs';
import type { Frame, OboBlob } from '../types';

const originalData = () => ({
  label: 'P1',
  sections: [{ name: '코드', value: 'main', shared: true }, { name: '데이터', value: 'x = 0', shared: true }],
  threads: [{ id: 't1', label: 'T1', pc: '읽기', register: '0', stack: '지역값 7' }],
  activeThreadId: null,
});
const blob = (data: Record<string, unknown> = originalData(), frames: Frame[] = []): OboBlob => ({
  nodes: [{ id: 'p', type: 'process-box', position: { x: 0, y: 0 }, data }], edges: [], frames,
});
const frame = (id: string, patch: Record<string, unknown>): Frame => ({
  id, label: `${id}의 설명`, highlightNodes: [], highlightEdges: [], nodeDataOverrides: { p: patch },
});
const presentation = {
  hiddenSectionNames: ['코드'], hiddenThreadIds: [], threadFields: ['stack'],
  threadLayout: 'column', sectionLayout: 'row', showSharedLinks: false, width: 420,
};

describe('PT presentation at the save/import boundary', () => {
  it('preserves legacy documents with omitted presentation defaults in every manual wrapper', () => {
    const legacy = blob();
    const serialized = JSON.stringify(legacy);
    expect(validateElement('process-box', legacy.nodes[0].data)).toEqual({ data: originalData(), errors: [] });
    for (const document of [legacy, { mode: 'single', single: legacy }, { mode: 'per_choice', perChoice: { choice_1: legacy } }]) {
      const imported = JSON.parse(JSON.stringify(document));
      expect(validateFreeDiagram(imported)).toEqual(document);
    }
    expect(JSON.stringify(legacy)).toBe(serialized);
  });

  it('round-trips authored presentation in both base data and scene overrides', () => {
    const edited = validateElement('process-box', { ...originalData(), ...presentation, width: '420' });
    expect(edited.errors).toEqual([]);
    const patch = changedFields('process-box', originalData(), edited.data);
    expect(patch).toEqual(presentation);
    const alternate = { hiddenSectionNames: [], hiddenThreadIds: ['t1'], threadFields: [], threadLayout: 'row', sectionLayout: 'column', showSharedLinks: true, width: 800 };
    const document = blob(edited.data, [frame('f1', alternate), frame('f2', { width: 280 })]);
    const serialized = JSON.stringify(document);
    const imported = JSON.parse(serialized);
    expect(validateFreeDiagram(imported)).toEqual(document);
    expect(JSON.stringify(imported)).toBe(serialized);
    expect(applyFrame(imported.nodes, imported.frames, 0)[0].data).toMatchObject(alternate);
  });

  it('keeps presentation when later scenes replace section and thread arrays', () => {
    const next = originalData();
    next.sections[1].value = 'x = 1';
    next.threads[0].register = '1';
    const document = blob({ ...originalData(), ...presentation }, [
      frame('f1', { sections: next.sections }),
      frame('f2', { threads: next.threads }),
    ]);
    const imported = JSON.parse(JSON.stringify(document));
    expect(() => validateFreeDiagram(imported)).not.toThrow();
    const shown = applyFrame(imported.nodes, imported.frames, 1)[0].data;
    expect(shown).toMatchObject(presentation);
    expect(shown.sections).toEqual(next.sections);
    expect(shown.threads).toEqual(next.threads);
  });

  it('hides and restores content without deleting values from any scene or the base', () => {
    const document = blob(originalData(), [
      frame('hide', { hiddenSectionNames: ['데이터'], hiddenThreadIds: ['t1'], threadFields: [] }),
      frame('show', { hiddenSectionNames: [], hiddenThreadIds: [], threadFields: ['pc', 'register', 'stack'] }),
    ]);
    const serialized = JSON.stringify(document);
    const imported = JSON.parse(serialized);
    validateFreeDiagram(imported);
    for (const index of [0, 1, 0]) {
      const state = applyFrame(imported.nodes, imported.frames, index)[0].data;
      expect(state.sections).toEqual(originalData().sections);
      expect(state.threads).toEqual(originalData().threads);
    }
    expect(applyFrame(imported.nodes, imported.frames, 1)[0].data.hiddenThreadIds).toEqual([]);
    expect(JSON.stringify(imported)).toBe(serialized);
  });

  it('rejects malformed presentation in authoring and imported base/scene data without mutation', () => {
    const invalid: Record<string, unknown>[] = [
      { threadFields: ['heap'] }, { threadFields: ['pc', 'pc'] }, { threadFields: 'pc' },
      { hiddenSectionNames: '코드' }, { hiddenSectionNames: ['코드', '코드'] },
      { hiddenThreadIds: [1] }, { hiddenThreadIds: null },
      { threadLayout: 'grid' }, { sectionLayout: null }, { sectionLayout: ['row'] },
      { width: 279 }, { width: 801 }, { width: 360.5 }, { width: '' }, { width: [360] },
      { showSharedLinks: 'false' }, { showSharedLinks: 0 },
    ];
    for (const patch of invalid) {
      const input = { ...originalData(), ...patch };
      const serialized = JSON.stringify(input);
      expect.soft(validateElement('process-box', input).errors.length, JSON.stringify(patch)).toBeGreaterThan(0);
      for (const document of [blob(input), blob(originalData(), [frame('invalid', patch)])]) {
        expect(() => validateFreeDiagram(document), JSON.stringify(patch)).toThrow();
      }
      expect(JSON.stringify(input)).toBe(serialized);
    }
  });

  it('rejects unknown scene fields and leaves the coding field registry unchanged', () => {
    expect(diagramFields['process-box']).toEqual(['sections', 'threads', 'activeThreadId']);
    expect(parseDiagramTrace(JSON.stringify({ v: 1, overrides: { p: presentation }, highlightNodes: [] }), blob().nodes, []).errors.length).toBeGreaterThan(0);
    expect(() => validateFreeDiagram(blob(originalData(), [frame('invalid', { threadFieldsExtra: ['pc'] })]))).toThrow(/지원하지 않는 장면 필드/);
    expect(changedFields('process-box', originalData(), { ...originalData(), threadFieldsExtra: ['pc'] })).toEqual({});
    expect(getStateFields('process-box')).toEqual([]);
    expect(getEventFields('process-box')).toEqual([]);
    expect(isOverridableNodeType('process-box')).toBe(false);
    expect(getStateFields('slot-grid')).toEqual(['slots']);
  });
});
