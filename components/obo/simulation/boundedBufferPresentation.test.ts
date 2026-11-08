import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { BoundedBufferExplanation, BoundedBufferVisual } from './BoundedBufferVisual';

function fixture() {
  const doc = createDocument('PC'), instance = doc.instances[0], view = createView('record');
  instance.input = { capacity: 1, initial: [], actors: [{ id: 'P', role: 'producer' }, { id: 'C', role: 'consumer' }], order: ['P', 'P', 'P', 'C', 'P', 'C', 'C', 'C', 'C'], policy: 'correct' };
  const execution = run('PC', instance.input);
  const render = (cursor: number, selectedView = view) => renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor, view: selectedView }));
  return { doc, instance, view, execution, render };
}
const value = (html: string, key: string) => html.match(new RegExp(`<strong[^>]*data-bb-value="${key}"[^>]*>(.*?)</strong>`))?.[1];
const count = (html: string, key: string) => html.match(new RegExp(`<strong[^>]*data-bb-count="${key}"[^>]*>(.*?)</strong>`))?.[1];
const actorTag = (html: string, id: string) => html.match(new RegExp(`<section[^>]*data-bb-actor="actor:${id}"[^>]*>`))?.[0] ?? '';
const slotTag = (html: string, index: number) => html.match(new RegExp(`<div[^>]*data-bb-slot="slot:${index}"[^>]*>`))?.[0] ?? '';

describe('PC rule diagram distinguishes buffer occupancy, permissions and actor attempts', () => {
  it('does not fill an empty slot when a producer only acquires an empty token', () => {
    const { render } = fixture();
    const initial = render(-1), reserved = render(0);
    expect(count(initial, 'empty')).toBe('1');
    expect(count(reserved, 'empty')).toBe('0');
    expect(count(reserved, 'full')).toBe('0');
    expect(reserved).toContain('data-bb-occupancy="0"');
    expect(slotTag(reserved, 0)).toContain('data-bb-occupied="false"');
    expect(value(reserved, 'slot:0')).toBeUndefined();
    expect(reserved).not.toContain('data-bb-transfer-from=');
    expect(reserved).not.toContain('data-bb-taken');
    expect(actorTag(reserved, 'P')).toContain('data-bb-pc="1"');
  });

  it('shows a real put without incrementing full until release and leaves waiters blocked until wake', () => {
    const { render } = fixture();
    const put = render(2);
    expect(value(put, 'slot:0')).toBe('&quot;P&quot;');
    expect(slotTag(put, 0)).toContain('data-bb-inserted="true"');
    expect(count(put, 'full')).toBe('0');
    expect(put).toContain('data-bb-owner="P"');
    expect(put).toContain('data-bb-transfer-from="actor:P" data-bb-transfer-to="slot:0"');
    const waiting = render(3), released = render(4), waking = render(5);
    expect(waiting).toContain('data-bb-wait-for="full"');
    expect(actorTag(released, 'C')).toContain('data-bb-blocked="true"');
    expect(count(released, 'full')).toBe('1');
    expect(released).not.toContain('data-bb-transfer-from=');
    expect(waking).toContain('data-bb-phase="wake"');
    expect(actorTag(waking, 'C')).toContain('data-bb-blocked="false"');
    expect(count(waking, 'full')).toBe('0');
    expect(waking).not.toContain('data-bb-transfer-from=');
  });

  it('keeps the taken value separate from the now empty or shifted buffer and seeks without stale transfers', () => {
    const { instance, execution, render } = fixture(), before = JSON.stringify({ instance, execution });
    const taken = render(7);
    expect(taken).toContain('data-bb-occupancy="0"');
    expect(slotTag(taken, 0)).toContain('data-bb-occupied="false"');
    expect(value(taken, 'taken')).toBe('&quot;P&quot;');
    expect(taken).toContain('data-bb-transfer-from="slot:0" data-bb-transfer-to="actor:C"');
    expect(count(taken, 'empty')).toBe('0');
    expect(count(render(8), 'empty')).toBe('1');
    expect(render(8)).not.toContain('data-bb-taken');
    expect(render(0)).not.toContain('data-bb-transfer-from=');
    expect(render(-1)).not.toContain('data-bb-active="true"');
    expect(JSON.stringify({ instance, execution })).toBe(before);
  });

  it('separates mutex wake, ordinary blocked and actual lock-first deadlock', () => {
    const { instance, view } = fixture();
    instance.input = { capacity: 2, initial: [], actors: [{ id: 'P', role: 'producer' }, { id: 'P2', role: 'producer' }], order: ['P', 'P2', 'P', 'P2', 'P', 'P', 'P2'], policy: 'correct' };
    let execution = run('PC', instance.input);
    let html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: 3, view }));
    expect(html).toContain('data-bb-wait-for="mutex"');
    html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: 6, view }));
    expect(html).toContain('data-bb-phase="wake"');
    expect(html).toContain('data-bb-owner="P2"');
    expect(html).not.toContain('data-bb-transfer-from=');
    instance.input = { capacity: 1, initial: [], actors: [{ id: 'P', role: 'producer' }, { id: 'C', role: 'consumer' }], order: ['C', 'C', 'P'], policy: 'lock-first' };
    execution = run('PC', instance.input);
    html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: 2, view }));
    expect(html).toContain('data-bb-stop-reason="deadlocked"');
    expect(html).toContain('data-bb-owner="C"');
    view.fields = ['버퍼', '실행 주체', '세마포어'];
    html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: 2, view }));
    expect(html).not.toContain('data-bb-stop-reason=');
    expect(html).not.toContain('교착');
    instance.input = { capacity: 1, initial: [], actors: [{ id: 'C', role: 'consumer' }], order: ['C'], policy: 'correct' };
    view.fields = [];
    html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution: run('PC', instance.input), cursor: 0, view }));
    expect(html).toContain('data-bb-stop-reason="blocked"');
    expect(html).not.toContain('교착');
    expect(html).toContain('등록된 주체 없음');
  });

  it('honors all four record groups without leaking hidden resources, actors, buffer values or endpoints', () => {
    const { instance, view, render } = fixture(), before = JSON.stringify(instance.input);
    view.fields = ['실행 주체'];
    let html = render(3);
    expect(html).toContain('data-bb-actor="actor:C"');
    expect(html).not.toContain('data-bb-wait-for=');
    expect(html).not.toContain('full');
    expect(html).not.toContain('empty');
    expect(html).not.toContain('mutex');
    expect(html).not.toContain('data-bb-slot=');
    expect(html).not.toContain('data-bb-resources');
    expect(html).not.toContain('data-bb-transfer-from=');
    view.fields = ['버퍼'];
    html = render(7);
    expect(value(html, 'taken')).toBe('&quot;P&quot;');
    expect(html).not.toContain('data-bb-actor=');
    expect(html).not.toContain('data-bb-owner=');
    expect(html).not.toContain('data-bb-transfer-from=');
    view.fields = ['세마포어'];
    html = render(2);
    expect(count(html, 'full')).toBe('0');
    expect(html).toContain('data-bb-owner="P"');
    expect(html).not.toContain('data-bb-actor=');
    expect(html).not.toContain('data-bb-buffer');
    view.fields = ['진행 상태'];
    html = render(8);
    expect(html).toContain('data-bb-stop-reason="scheduleEnd"');
    expect(html).not.toContain('data-bb-slot=');
    expect(html).not.toContain('data-bb-actor=');
    expect(html).not.toContain('data-bb-resources');
    view.fields = ['unknown'];
    expect(render(2)).toContain('선택한 표시 항목이 없습니다.');
    view.fields = [];
    expect(render(2)).toContain('data-bb-transfer-from="actor:P"');
    expect(JSON.stringify(instance.input)).toBe(before);
  });

  it('preserves actor raw target/display label fields, resource keys, and ignored queue filters', () => {
    const { instance, render } = fixture();
    instance.labels.P = '만드는 주체';
    const actor = createView('actor', 'P'); actor.fields = ['만드는 주체'];
    let html = render(2, actor);
    expect(html).toContain('만드는 주체');
    expect(html).not.toContain('data-bb-actor="actor:C"');
    actor.fields = ['P'];
    expect(render(2, actor)).toContain('선택한 실행 주체가 없습니다.');
    const resource = createView('resource', 'full'); resource.fields = ['full'];
    html = render(2, resource);
    expect(count(html, 'full')).toBe('0');
    expect(html).not.toContain('data-bb-resource="empty"');
    expect(html).not.toContain('data-bb-owner=');
    resource.fields = ['empty'];
    expect(render(2, resource)).toContain('선택한 자원이 없습니다.');
    const queue = createView('queue', 'ignored-target'); queue.fields = ['ignored-field'];
    html = render(2, queue);
    expect(value(html, 'slot:0')).toBe('&quot;P&quot;');
    expect(html).not.toContain('만드는 주체');
    expect(html).not.toContain('data-bb-resources');
    expect(html).not.toContain('data-bb-actor=');
  });

  it('distinguishes occupied false/null/empty values from vacant slots and preserves raw strings', () => {
    const { instance, view } = fixture();
    const text = '<script>x</script>\n' + '원문 '.repeat(50);
    instance.input = { capacity: 8, initial: [null, false, '', 0, 'P', text, Number.MAX_SAFE_INTEGER], actors: [{ id: 'C', role: 'consumer' }], order: ['C', 'C', 'C'], policy: 'correct' };
    instance.labels.P = '이름으로 바꾸지 않음';
    const execution = run('PC', instance.input);
    let html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: -1, view }));
    expect(value(html, 'slot:0')).toBe('null');
    expect(slotTag(html, 0)).toContain('data-bb-occupied="true"');
    expect(value(html, 'slot:1')).toBe('false');
    expect(value(html, 'slot:2')).toBe('&quot;&quot;');
    expect(value(html, 'slot:3')).toBe('0');
    expect(value(html, 'slot:4')).toBe('&quot;P&quot;');
    expect(html).not.toContain('이름으로 바꾸지 않음');
    expect(html).toContain('data-bb-raw="slot:5"');
    expect(html).toContain('원문 '.repeat(50));
    expect(html).not.toContain('<script>');
    expect(value(html, 'slot:6')).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(slotTag(html, 7)).toContain('data-bb-occupied="false"');
    html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: 2, view }));
    expect(value(html, 'taken')).toBe('null');
    expect(value(html, 'slot:0')).toBe('false');
  });

  it('retains all 256 slots and 100 actors rather than truncating large valid inputs', () => {
    const { instance, view } = fixture();
    instance.input = { capacity: 256, initial: Array.from({ length: 256 }, (_, i) => i), actors: Array.from({ length: 100 }, (_, i) => ({ id: `A${i}`, role: i % 2 ? 'producer' : 'consumer' })), order: [], policy: 'correct' };
    const before = JSON.stringify(instance), execution = run('PC', instance.input);
    const html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution, cursor: -1, view }));
    expect((html.match(/data-bb-slot="/g) ?? []).length).toBe(256);
    expect((html.match(/data-bb-actor="/g) ?? []).length).toBe(100);
    expect(value(html, 'slot:255')).toBe('255');
    expect(html).toContain('data-bb-actor="actor:A99"');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('keeps annotation event-label/when/hidden filters and all editable notes', () => {
    const { instance, execution } = fixture();
    const notes = ['visible', 'hidden', 'kind', 'actor', 'field'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when = { kind: 'wait', actor: 'C' }; notes[0].fields = ['대기 · C'];
    notes[1].hidden = true; notes[2].when.kind = 'put'; notes[3].when.actor = 'P'; notes[4].fields = ['대기 · P'];
    instance.views = notes;
    const before = JSON.stringify(instance);
    let html = renderToStaticMarkup(createElement(BoundedBufferExplanation, { instance, execution, cursor: 3 }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'kind', 'actor', 'field']) expect(html).not.toContain(`note-${name}`);
    html = renderToStaticMarkup(createElement(BoundedBufferExplanation, { instance, execution, cursor: 3, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(html).toContain(note.text);
    expect(html).toContain('+ 설명 추가');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('keeps old roles/positioning and visible conditions compatible with the new record and annotations', () => {
    const { doc, instance, execution, view, render } = fixture();
    instance.views = ['actor', 'queue', 'resource', 'metric', 'timeline', 'record', 'annotation'].map((role, i) => ({ ...createView(role), x: 47 + i * 310, y: 72, width: 270, height: 180 }));
    const before = JSON.stringify(doc);
    expect(validateDocument(doc)).toBe(true);
    for (const item of instance.views) render(2, item);
    expect(JSON.stringify(doc)).toBe(before);
    view.when = { kind: 'wait', actor: 'C' };
    expect(projection(instance, execution, 3, view).visible).toBe(true);
    expect(projection(instance, execution, 2, view).visible).toBe(false);
    view.hidden = true;
    expect(projection(instance, execution, 3, view).visible).toBe(false);
  });

  it('shows invalid drafts as configuration issues rather than fake empty buffers', () => {
    const { instance, view } = fixture();
    instance.input = { capacity: 0, initial: [], actors: [], order: [], policy: 'correct' };
    const html = renderToStaticMarkup(createElement(BoundedBufferVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-bb-invalid');
    expect(html).not.toContain('data-bb-buffer');
  });
});
