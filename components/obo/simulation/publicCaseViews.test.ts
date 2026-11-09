import { describe, expect, it } from 'vitest';
import { createDocument, createView, type SimulationDocument } from '../runtime/document.mjs';
import type { Json } from '../runtime/index.mjs';
import { instanceForCase } from './publicCaseViews';

function authored(): SimulationDocument {
  const doc = createDocument('S3'), instance = doc.instances[0];
  instance.name = '출제자 구성';
  instance.views = [
    { ...instance.views[0], label: '출제자가 바꾼 이름', x: 500 },
    { ...createView('actor', 'P1', 1), id: 'card-p1', label: 'P1 카드' },
    { ...createView('actor', 'P9', 2), id: 'card-p9', label: '없는 P9 카드' },
  ];
  instance.decorations = [{ id: 'd1', source: 'card-p1', target: 'card-p9' }];
  doc.question.judgeProfile = 'obo-v1';
  doc.question.gradingInstanceId = instance.id;
  return doc;
}

describe('public case comparison drawing (2026-11-08)', () => {
  it("keeps the author's cards, names and layout, dropping only targets missing from the test input", () => {
    const doc = authored(), input = structuredClone(doc.instances[0].input) as Record<string, Json>;
    const instance = instanceForCase(doc, 'S3', input);
    expect(instance.views.map(v => v.label)).toEqual(['출제자가 바꾼 이름', 'P1 카드']);
    expect(instance.views[0].x).toBe(500);
    expect(instance.decorations).toEqual([]);
    expect(instance.input).toBe(input);
  });

  it('falls back to the generic cards without the document or for another model', () => {
    const doc = authored(), input = structuredClone(doc.instances[0].input) as Record<string, Json>;
    expect(instanceForCase(null, 'S3', input).views.every(v => v.target === null)).toBe(true);
    expect(instanceForCase(doc, 'BK', createDocument('BK').instances[0].input as Record<string, Json>).scenarioId).toBe('BK');
  });

  it('never leaves an empty drawing when every authored card targets a missing entity', () => {
    const doc = authored();
    doc.instances[0].views = [{ ...createView('actor', 'P9', 0), id: 'only-p9' }];
    const instance = instanceForCase(doc, 'S3', structuredClone(doc.instances[0].input) as Record<string, Json>);
    expect(instance.views.length).toBeGreaterThan(0);
    expect(instance.views.some(v => v.target === 'P9')).toBe(false);
  });
});
