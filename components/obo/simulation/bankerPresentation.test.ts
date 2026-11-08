import { describe, expect, it } from 'vitest';
import { addActor, createDocument, createView, replaceInput, validateDocument } from '../runtime/document.mjs';
import { defaultInput, grade, run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';

describe('Banker presentation remains separate from model and document contracts', () => {
  it('starts with a focused comparison and separate authored explanation without changing calculation', () => {
    const doc = createDocument('BK'), instance = doc.instances[0];
    expect(instance.views.map(view => view.role)).toEqual(['record', 'annotation']);
    expect(instance.views[0].fields).toEqual(['Need', 'Work', 'Finish']);
    expect(instance.input).toEqual(defaultInput('BK'));
    instance.views[1].text = 'Need가 Work 이하이면 완료를 가정할 수 있습니다.';
    const encoded = JSON.stringify(doc), decoded = JSON.parse(encoded);
    expect(validateDocument(decoded)).toBe(true);
    expect(JSON.stringify(decoded)).toBe(encoded);
    const execution = run('BK', instance.input);
    expect(execution.result).toEqual({ safe: true, sequence: ['P'], granted: null });
    expect(execution).toEqual(run('BK', defaultInput('BK')));
  });

  it('loads old independent actor/resource/record views without migrating positions, options or values', () => {
    const doc = createDocument('BK'), instance = doc.instances[0];
    instance.views = [createView('actor', 'P'), createView('resource', 'R'), createView('record'), createView('annotation')];
    instance.views.forEach((view, index) => { view.x = 83 + index * 311; view.y = 42; view.width = 270; view.height = 180; });
    instance.views[2].fields = [];
    instance.views[3].text = '기존 설명';
    const encoded = JSON.stringify(doc), execution = run('BK', instance.input);
    expect(validateDocument(JSON.parse(encoded))).toBe(true);
    for (const view of instance.views) projection(instance, execution, 0, view);
    expect(JSON.stringify(doc)).toBe(encoded);
    expect(projection(instance, execution, -1, instance.views[2]).rows.map(([key]) => key)).toEqual(['Available', 'Allocation', 'Max', 'Need', 'Work', 'Finish']);
  });

  it('keeps adding calculation actors and independent resource displays after input replacement', () => {
    const doc = createDocument('BK'), original = doc.instances[0], before = JSON.stringify(original);
    const added = addActor(original);
    const actors = added.input.actors as string[];
    const newActor = actors.at(-1)!;
    expect(added.views.some(view => view.role === 'actor' && view.target === newActor)).toBe(true);
    const replacement = { ...added.input, resources: ['R', 'S'], available: [1, 2], allocated: [[0, 0], [0, 0]], max: [[1, 0], [0, 2]] };
    const next = replaceInput(added, replacement);
    next.views.push(createView('resource', 'S'));
    next.views[0].fields = ['Need'];
    doc.instances[0] = next;
    expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toBe(true);
    expect(run('BK', next.input).result.sequence).toContain(newActor);
    const resource = next.views.at(-1)!;
    expect(projection(next, null, -1, resource).rows).toEqual([['S', '가용 2']]);
    expect(JSON.stringify(original)).toBe(before);
  });

  it('preserves field selection, event conditions and hidden settings through saving without deleting data', () => {
    const doc = createDocument('BK'), instance = doc.instances[0], input = JSON.stringify(instance.input);
    const view = instance.views[0], execution = run('BK', instance.input);
    view.fields = ['Allocation', 'Max']; view.when = { kind: 'check', actor: 'P' };
    expect(projection(instance, execution, 0, view).rows.map(([key]) => key)).toEqual(['Allocation', 'Max']);
    expect(projection(instance, execution, 0, view).visible).toBe(true);
    expect(projection(instance, execution, 1, view).visible).toBe(false);
    view.hidden = true;
    const saved = JSON.parse(JSON.stringify(doc));
    expect(validateDocument(saved)).toBe(true);
    expect(saved.instances[0].views[0]).toEqual(view);
    expect(projection(saved.instances[0], execution, 0, saved.instances[0].views[0]).visible).toBe(false);
    expect(JSON.stringify(instance.input)).toBe(input);
    expect(run('BK', saved.instances[0].input)).toEqual(execution);
  });

  it('projects tentative Allocation from current Need while rejecting presentation fields in coding output', () => {
    const doc = createDocument('BK'), instance = doc.instances[0];
    instance.input = { actors: ['P', 'Q'], resources: ['R'], available: [1], allocated: [[1], [1]], max: [[2], [2]], request: { actor: 'P', values: [1] } };
    const before = JSON.stringify(instance.input), execution = run('BK', instance.input), view = createView('record');
    const rows = (cursor: number) => Object.fromEntries(projection(instance, execution, cursor, view).rows);
    expect(JSON.parse(rows(0).Allocation)).toEqual([[1], [1]]);
    expect(JSON.parse(rows(1).Allocation)).toEqual([[2], [1]]);
    expect(JSON.parse(rows(1).Need)).toEqual([[0], [1]]);
    expect(JSON.parse(rows(1).Available)).toEqual([0]);
    expect(JSON.stringify(instance.input)).toBe(before);
    const output = { v: 1, result: execution.result, events: execution.events };
    expect(grade('BK', instance.input, 'process', JSON.stringify(output)).correct).toBe(true);
    const modified = structuredClone(output);
    modified.events[1].data.displayStyle = 'comparison';
    expect(grade('BK', instance.input, 'process', JSON.stringify(modified)).correct).toBe(false);
  });
});
