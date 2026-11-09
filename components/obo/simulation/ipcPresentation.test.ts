import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument, type SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { IpcExplanation, IpcVisual } from './IpcVisual';

type Input = SimulationInstance['input'];
const channel = (): Input => ({
  actors: ['P', 'Q', 'R'], mode: 'pipe', capacity: 3, initial: [], shared: {},
  operations: [
    { actor: 'Q', op: 'receive' }, { actor: 'P', op: 'send', value: 7 }, { actor: 'Q', op: 'receive' },
    { actor: 'Q', op: 'send', value: 0 }, { actor: 'R', op: 'send', value: false }, { actor: 'P', op: 'send', value: '' },
    { actor: 'Q', op: 'send', value: null }, { actor: 'P', op: 'receive' }, { actor: 'Q', op: 'send', value: null },
    { actor: 'R', op: 'receive' }, { actor: 'P', op: 'receive' }, { actor: 'Q', op: 'receive' },
  ],
});
const shared = (): Input => ({
  actors: ['P', 'Q', 'R'], mode: 'shared', capacity: 3, initial: [99],
  shared: { count: 0, flag: false, empty: '', nullable: null },
  operations: [
    { actor: 'P', op: 'read', key: 'flag' }, { actor: 'P', op: 'write', key: 'count', value: 1 },
    { actor: 'Q', op: 'read', key: 'count' }, { actor: 'R', op: 'write', key: 'added', value: null },
    { actor: 'Q', op: 'read', key: 'nullable', value: 777 }, { actor: 'Q', op: 'write', key: 'empty', value: '' },
    { actor: 'P', op: 'read', key: 'empty' }, { actor: 'R', op: 'write', key: 'flag', value: true },
    { actor: 'P', op: 'write', key: 'count', value: 1 },
  ],
});
function fixture(input: Input = channel()) {
  const doc = createDocument('IPC'), instance = doc.instances[0], view = createView('record');
  instance.input = input;
  const execution = run('IPC', input);
  const render = (cursor: number, selectedView = view) => renderToStaticMarkup(createElement(IpcVisual, { instance, execution, cursor, view: selectedView }));
  return { doc, instance, view, execution, render };
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tag = (html: string, attribute: string, key: string) => html.match(new RegExp(`<[^>]+${attribute}="${escape(key)}"[^>]*>`))?.[0] ?? '';
const value = (html: string, key: string) => html.match(new RegExp(`<strong[^>]*data-ipc-value="${escape(key)}"[^>]*>(.*?)</strong>`))?.[1];

describe('IPC presentation follows actual communication and preserves author choices', () => {
  it('keeps another actor waiting after a send, then shows the successful receive and its shifted payload', () => {
    const { instance, render } = fixture(), before = JSON.stringify(instance);
    let html = render(1);
    expect(tag(html, 'data-ipc-actor', 'actor:Q')).toContain('data-ipc-blocked="true"');
    expect(tag(html, 'data-ipc-actor', 'actor:Q')).toContain('data-ipc-active="false"');
    expect(tag(html, 'data-ipc-actor', 'actor:P')).toContain('data-ipc-active="true"');
    expect(html).toContain('data-ipc-wait-op="receive"');
    expect(value(html, 'channel:0')).toBe('7');
    expect(html).toContain('data-ipc-transfer-from="actor:P" data-ipc-transfer-to="channel:0"');
    expect(html).not.toContain('data-ipc-received=');
    html = render(2);
    expect(html).toContain('data-ipc-phase="resume" data-ipc-operation="receive"');
    expect(html).toContain('data-ipc-transfer-from="channel:0" data-ipc-transfer-to="actor:Q"');
    expect(value(html, 'received')).toBe('7');
    expect(value(html, 'channel:0')).toBeUndefined();
    expect(tag(html, 'data-ipc-actor', 'actor:Q')).toContain('data-ipc-blocked="false"');
    expect(value(html, 'read:0')).toBe('7');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('uses the current operation direction when a blocked receive resumes as a send', () => {
    const { render } = fixture({ actors: ['Same'], mode: 'pipe', capacity: 1, initial: [], shared: {}, operations: [
      { actor: 'Same', op: 'receive' }, { actor: 'Same', op: 'send', value: 7 }, { actor: 'Same', op: 'receive' },
    ] });
    const html = render(1);
    expect(html).toContain('data-ipc-phase="resume" data-ipc-operation="send"');
    expect(html).toContain('data-ipc-transfer-from="actor:Same" data-ipc-transfer-to="channel:0"');
    expect(value(html, 'channel:0')).toBe('7');
    expect(value(html, 'received')).toBeUndefined();
    expect(value(html, 'read:0')).toBeUndefined();
  });

  it('shows a rejected send as an attempted value, never as delivered or an automatic later retry', () => {
    const { render } = fixture({ actors: ['P', 'Q'], mode: 'message', capacity: 1, initial: ['seed'], shared: {}, operations: [
      { actor: 'P', op: 'send', value: 999 }, { actor: 'Q', op: 'receive' }, { actor: 'P', op: 'send', value: 42 },
    ] });
    let html = render(0);
    expect(value(html, 'channel:0')).toBe('&quot;seed&quot;');
    expect(value(html, 'attempted')).toBe('999');
    expect(html).not.toContain('data-ipc-transfer-from=');
    expect(html).toContain('송신 대기');
    html = render(1);
    expect(tag(html, 'data-ipc-actor', 'actor:P')).toContain('data-ipc-blocked="true"');
    expect(value(html, 'received')).toBe('&quot;seed&quot;');
    html = render(2);
    expect(value(html, 'channel:0')).toBe('42');
    expect(html).not.toContain('999');
    expect(html).toContain('메시지 큐');
  });

  it('distinguishes occupied null, false, empty strings and zero from vacant slots and failed receives', () => {
    const { render } = fixture({ actors: ['P'], mode: 'pipe', capacity: 5, initial: [null, false, '', 0], shared: {}, operations: [
      { actor: 'P', op: 'receive' }, { actor: 'P', op: 'receive' }, { actor: 'P', op: 'receive' }, { actor: 'P', op: 'receive' }, { actor: 'P', op: 'receive' },
    ] });
    let html = render(-1);
    for (const [index, expected] of ['null', 'false', '&quot;&quot;', '0'].entries()) {
      expect(value(html, `channel:${index}`)).toBe(expected);
      expect(tag(html, 'data-ipc-slot', `channel:${index}`)).toContain('data-ipc-occupied="true"');
    }
    expect(tag(html, 'data-ipc-slot', 'channel:4')).toContain('data-ipc-occupied="false"');
    html = render(0);
    expect(value(html, 'received')).toBe('null');
    expect(value(html, 'channel:0')).toBe('false');
    html = render(4);
    expect(html).toContain('수신 대기');
    expect(value(html, 'received')).toBeUndefined();
    expect(html).not.toContain('data-ipc-transfer-from=');
    expect(value(html, 'read:3')).toBe('0');
    expect(value(html, 'read:4')).toBeUndefined();
  });

  it('links actual shared read/write endpoints and highlights only real cell changes', () => {
    const { render } = fixture(shared());
    let html = render(0);
    expect(html).toContain('data-ipc-transfer-from="shared:flag" data-ipc-transfer-to="actor:P"');
    expect(tag(html, 'data-ipc-cell', 'shared:flag')).toContain('data-ipc-access="read"');
    expect(tag(html, 'data-ipc-cell', 'shared:flag')).toContain('data-ipc-changed="false"');
    expect(value(html, 'shared:flag')).toBe('false');
    html = render(1);
    expect(html).toContain('data-ipc-transfer-from="actor:P" data-ipc-transfer-to="shared:count"');
    expect(tag(html, 'data-ipc-cell', 'shared:count')).toContain('data-ipc-changed="true"');
    expect(value(html, 'shared:count')).toBe('1');
    expect(value(html, 'before:shared:count')).toBe('0');
    html = render(3);
    expect(value(html, 'shared:added')).toBe('null');
    expect(html).toContain('data-ipc-added');
    expect(value(html, 'before:shared:added')).toBeUndefined();
    html = render(8);
    expect(tag(html, 'data-ipc-cell', 'shared:count')).toContain('data-ipc-current="true" data-ipc-changed="false"');
    expect(html).toContain('data-ipc-transfer-to="shared:count"');
    expect(html).not.toContain('data-ipc-before');
  });

  it('uses actual shared reads and keeps static channel values separate from active shared operations', () => {
    const { render } = fixture(shared());
    const html = render(4);
    expect(value(html, 'read:0')).toBe('false');
    expect(value(html, 'read:1')).toBe('1');
    expect(value(html, 'read:2')).toBe('null');
    expect(html).not.toContain('777');
    expect(html).toContain('data-ipc-inactive="channel"');
    expect(tag(html, 'data-ipc-space', 'channel')).toContain('data-ipc-space-active="false"');
    expect(value(html, 'channel:0')).toBe('99');
    expect(tag(html, 'data-ipc-slot', 'channel:0')).toContain('data-ipc-current="false"');
    expect(value(html, 'received')).toBeUndefined();
  });

  it('honors the four record groups without leaking hidden actors, cell keys, payloads or arrows', () => {
    const { instance, view, render } = fixture(shared());
    instance.labels.P = 'private-actor-label';
    const before = JSON.stringify(instance.input);
    view.fields = ['실행 주체'];
    let html = render(1);
    expect(html).toContain('private-actor-label');
    expect(html).not.toContain('shared:count');
    expect(html).not.toContain('data-ipc-value');
    expect(html).not.toContain('data-ipc-transfer-from');
    view.fields = ['공유값'];
    html = render(1);
    expect(value(html, 'shared:count')).toBe('1');
    expect(html).not.toContain('private-actor-label');
    expect(html).not.toContain('actor:P');
    expect(html).not.toContain('data-ipc-transfer-from');
    view.fields = ['읽은 값'];
    html = render(4);
    expect(value(html, 'read:2')).toBe('null');
    expect(html).not.toContain('private-actor-label');
    expect(html).not.toContain('nullable');
    expect(html).not.toContain('data-ipc-cell');
    expect(html).not.toContain('data-ipc-slot');
    view.fields = ['채널'];
    html = render(1);
    expect(value(html, 'channel:0')).toBe('99');
    expect(html).not.toContain('data-ipc-cell');
    view.fields = ['unknown'];
    expect(render(1)).toContain('선택한 표시 항목이 없습니다.');
    view.fields = [];
    expect(render(1)).toContain('data-ipc-transfer-to="shared:count"');
    expect(JSON.stringify(instance.input)).toBe(before);
  });

  it('preserves legacy actor target/label fields, queue ignoring filters and memory/region raw key filters', () => {
    const { instance, render } = fixture(shared());
    instance.labels.P = '보내는 주체'; instance.labels.count = '별명으로 바꾸지 않는 키';
    const actor = createView('actor', 'P'); actor.fields = ['보내는 주체'];
    let html = render(1, actor);
    expect(html).toContain('보내는 주체');
    expect(html).not.toContain('actor:Q');
    actor.fields = ['P'];
    expect(render(1, actor)).toContain('선택한 실행 주체가 없습니다.');
    const queue = createView('queue', 'unused'); queue.fields = ['unused'];
    html = render(1, queue);
    expect(value(html, 'channel:0')).toBe('99');
    expect(html).not.toContain('data-ipc-cell');
    for (const role of ['memory', 'region']) {
      const selected = createView(role, 'unused'); selected.fields = ['count'];
      html = render(1, selected);
      expect(value(html, 'shared:count')).toBe('1');
      expect(html).not.toContain('별명으로 바꾸지 않는 키');
      expect(html).not.toContain('shared:flag');
      expect(html).not.toContain('actor:P');
      selected.fields = ['unknown'];
      expect(render(1, selected)).not.toContain('data-ipc-cell=');
    }
    const empty = fixture({ actors: ['P'], mode: 'shared', capacity: 1, initial: [], shared: {}, operations: [] });
    const region = createView('region'); region.fields = ['영역'];
    expect(empty.render(-1, region)).toContain('이 실행 내부의 독립 공간');
    region.fields = ['unknown'];
    expect(empty.render(-1, region)).not.toContain('이 실행 내부의 독립 공간');
  });

  it('retains raw typed payloads and long escaped content despite colliding actor/shared IDs and labels', () => {
    const text = '<b>원문</b>\n' + '긴 값 '.repeat(40);
    const { instance, render } = fixture({ actors: ['same'], mode: 'shared', capacity: 1, initial: ['same'], shared: { same: false, text, '0raw': 0, big: Number.MAX_SAFE_INTEGER }, operations: [{ actor: 'same', op: 'write', key: 'same', value: null }] });
    instance.labels.same = '주체 별명';
    const html = render(0);
    expect(html).toContain('data-ipc-actor="actor:same"');
    expect(html).toContain('data-ipc-cell="shared:same"');
    expect(value(html, 'shared:same')).toBe('null');
    expect(value(html, 'before:shared:same')).toBe('false');
    expect(value(html, 'channel:0')).toBe('&quot;same&quot;');
    expect(value(html, 'shared:0raw')).toBe('0');
    expect(value(html, 'shared:big')).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(html).toContain('data-ipc-raw="shared:text"');
    expect(html).toContain('긴 값 '.repeat(40));
    expect(html).toContain('&lt;b&gt;원문&lt;/b&gt;');
    expect(html).not.toContain('<b>원문</b>');
  });

  it('keeps all 100 actors, 256 slots and 256 shared values accessible without truncating or mutating them', () => {
    const { instance, render } = fixture({ actors: Array.from({ length: 100 }, (_, i) => `A${i}`), mode: 'pipe', capacity: 256,
      initial: Array.from({ length: 256 }, (_, i) => i), shared: Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`key${i}`, i])), operations: [] });
    const before = JSON.stringify(instance), html = render(-1);
    expect((html.match(/data-ipc-actor="/g) ?? []).length).toBe(100);
    expect((html.match(/data-ipc-slot="/g) ?? []).length).toBe(256);
    expect((html.match(/data-ipc-cell="/g) ?? []).length).toBe(256);
    expect(html).toContain('actor:A99');
    expect(value(html, 'channel:255')).toBe('255');
    expect(value(html, 'shared:key255')).toBe('255');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('keeps annotation when/event-label/hidden filters and allows editing every authored note', () => {
    const { instance, execution } = fixture();
    const notes = ['visible', 'hidden', 'kind', 'actor', 'field'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when = { kind: 'send', actor: 'P' }; notes[0].fields = ['송신 · P'];
    notes[1].hidden = true; notes[2].when.kind = 'receive'; notes[3].when.actor = 'Q'; notes[4].fields = ['송신 · Q'];
    instance.views = notes;
    const before = JSON.stringify(instance);
    let html = renderToStaticMarkup(createElement(IpcExplanation, { instance, execution, cursor: 1 }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'kind', 'actor', 'field']) expect(html).not.toContain(`note-${name}`);
    html = renderToStaticMarkup(createElement(IpcExplanation, { instance, execution, cursor: 1, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(html).toContain(note.text);
    expect(html).toContain('aria-label="IPC 설명 5"');
    expect(html).toContain('+ 설명 추가');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('preserves legacy placement and visibility while accepting an additive record', () => {
    const { doc, instance, execution, view, render } = fixture();
    instance.views = ['actor', 'queue', 'memory', 'relation', 'region', 'annotation', 'record'].map((role, i) => ({ ...createView(role), x: 31 + i * 300, y: 53, width: 270, height: 180 }));
    const before = JSON.stringify(doc);
    expect(validateDocument(doc)).toBe(true);
    for (const item of instance.views) render(1, item);
    expect(JSON.stringify(doc)).toBe(before);
    view.when = { kind: 'send', actor: 'P' };
    expect(projection(instance, execution, 1, view).visible).toBe(true);
    expect(projection(instance, execution, 2, view).visible).toBe(false);
    view.hidden = true;
    expect(projection(instance, execution, 1, view).visible).toBe(false);
  });

  it('shows invalid drafts and inconsistent traces as configuration issues rather than invented empty state', () => {
    const { instance, execution, view } = fixture();
    const badRun = structuredClone(execution); badRun.events[1].data.channel = [111];
    let html = renderToStaticMarkup(createElement(IpcVisual, { instance, execution: badRun, cursor: 1, view }));
    expect(html).toContain('data-ipc-invalid');
    instance.input.capacity = 0;
    html = renderToStaticMarkup(createElement(IpcVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-ipc-invalid');
    expect(html).not.toContain('data-ipc-slot');
  });
});
