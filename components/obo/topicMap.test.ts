import { describe, expect, it } from 'vitest';
import { registry } from './runtime/index.mjs';
import { OBO_TEMPLATES } from './templates';
import { OBO_TOPICS, freeTemplateName, ruleModelName } from './topicMap';
import { validateDiagramElement } from './runtime/freeDiagram.mjs';
import { parseNumberList } from './authoring/ElementFields';

describe('authoring topic map (2026-11-08)', () => {
  it('names every rule model and every active free template exactly once', () => {
    const rule = OBO_TOPICS.flatMap(t => t.rule), free = OBO_TOPICS.flatMap(t => t.free);
    expect([...rule].sort()).toEqual(Object.keys(registry).sort());
    expect([...free].sort()).toEqual(OBO_TEMPLATES.map(t => t.id).sort());
  });
  it('shows names, never the colliding internal G2 id', () => {
    expect(freeTemplateName('G2')).toContain('라운드 로빈');
    expect(ruleModelName('G2')).not.toBe(freeTemplateName('G2'));
  });
});

describe('small authoring inputs', () => {
  it('parses tick lists and treats empty input as automatic', () => {
    expect(parseNumberList('0, 20 40')).toEqual([0, 20, 40]);
    expect(parseNumberList('  ')).toBeNull();
    expect(parseNumberList('1 x')).toEqual([1, NaN]);
  });
  it('accepts a gantt axis end of zero or more and rejects negatives or text', () => {
    const lane = { trackId: 'P1', blocks: [{ start: 0, end: 3 }] };
    expect(() => validateDiagramElement('gantt-lane', { ...lane, axisEnd: 9 })).not.toThrow();
    expect(() => validateDiagramElement('gantt-lane', lane)).not.toThrow();
    expect(() => validateDiagramElement('gantt-lane', { ...lane, axisEnd: -1 })).toThrow();
    expect(() => validateDiagramElement('gantt-lane', { ...lane, axisEnd: '9' })).toThrow();
  });
});
