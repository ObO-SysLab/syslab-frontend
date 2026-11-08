import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { ProcessStructureExplanation, ProcessStructureVisual } from './ProcessStructureVisual';

function fixture() {
  const doc = createDocument('PT'), instance = doc.instances[0], view = createView('record');
  instance.input = {
    spaces: { P: { x: 0, flag: true, nullable: 'old' }, Q: { x: 0 }, Unused: {} },
    threads: {
      T1: { process: 'P', registers: { r: 0 }, stack: [0, false, null] },
      T2: { process: 'P', registers: { r: 9 }, stack: [] },
      T3: { process: 'Q', registers: { r: 0 }, stack: [] },
    },
    operations: [
      { op: 'write', thread: 'T1', scope: 'shared', key: 'x', value: 1 },
      { op: 'read', thread: 'T2', scope: 'shared', key: 'x' },
      { op: 'read', thread: 'T3', scope: 'shared', key: 'x' },
      { op: 'write', thread: 'T1', scope: 'private', key: 'r', value: 5 },
      { op: 'read', thread: 'T2', scope: 'private', key: 'r' },
      { op: 'write', thread: 'T2', scope: 'shared', key: 'flag', value: false },
      { op: 'write', thread: 'T1', scope: 'shared', key: 'nullable', value: null },
      { op: 'write', thread: 'T2', scope: 'private', key: 'r', value: 9 },
      { op: 'read', thread: 'T2', scope: 'private', key: 'r', value: 777 },
    ],
  };
  const execution = run('PT', instance.input);
  const render = (cursor: number, selectedView = view) => renderToStaticMarkup(createElement(ProcessStructureVisual, { instance, execution, cursor, view: selectedView }));
  return { doc, instance, view, execution, render };
}

const cellTag = (html: string, key: string) => html.match(new RegExp(`<div[^>]*data-pt-cell="${key}"[^>]*>`))?.[0] ?? '';
const cellValue = (html: string, key: string) => html.match(new RegExp(`<strong[^>]*data-pt-value="${key}"[^>]*>(.*?)</strong>`))?.[1];

describe('PT rule renderer preserves current access and existing view contracts', () => {
  it('groups shared cells once per process and keeps each thread own registers and static stack', () => {
    const { instance, render } = fixture(), before = JSON.stringify(instance);
    const html = render(-1);
    expect((html.match(/data-pt-cell="shared:P:x"/g) ?? []).length).toBe(1);
    expect(html).toContain('data-pt-process="process:Unused"');
    expect(html).toContain('소속 스레드 없음');
    expect(html).toContain('data-pt-thread="thread:T1"');
    expect(html).toContain('data-pt-thread="thread:T2"');
    expect(cellValue(html, 'register:T1:r')).toBe('0');
    expect(cellValue(html, 'register:T2:r')).toBe('9');
    expect(html).toContain('data-pt-stack="thread:T1"');
    expect(html).toContain('정적 · 3개');
    expect(cellValue(html, 'stack:T1:1')).toBe('false');
    expect(cellValue(html, 'stack:T1:2')).toBe('null');
    expect(html).not.toContain('data-pt-current="true"');
    expect(html).not.toContain('data-pt-before=');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('distinguishes shared writes, other-thread reads and another process without carrying old highlights', () => {
    const { render } = fixture();
    let html = render(0);
    expect(cellValue(html, 'shared:P:x')).toBe('1');
    expect(cellValue(html, 'shared:Q:x')).toBe('0');
    expect(cellTag(html, 'shared:P:x')).toContain('data-pt-changed="true"');
    expect(cellTag(html, 'shared:P:x')).toContain('data-pt-access="write"');
    expect(html).toContain('data-pt-before="0"');
    html = render(1);
    expect(cellTag(html, 'shared:P:x')).toContain('data-pt-access="read"');
    expect(html).toContain('data-pt-thread="thread:T2" data-pt-current="true"');
    expect(html).not.toContain('data-pt-changed="true"');
    expect(cellValue(html, 'register:T2:r')).toBe('9');
    html = render(2);
    expect(cellTag(html, 'shared:P:x')).toContain('data-pt-current="false"');
    expect(cellTag(html, 'shared:Q:x')).toContain('data-pt-current="true"');
    expect(cellValue(html, 'shared:P:x')).toBe('1');
    expect(cellValue(html, 'shared:Q:x')).toBe('0');
  });

  it('changes only the private register, keeps same-value writes as writes, and seeks from the selected prefix', () => {
    const { render } = fixture();
    let html = render(3);
    expect(cellTag(html, 'register:T1:r')).toContain('data-pt-changed="true"');
    expect(cellValue(html, 'register:T1:r')).toBe('5');
    expect(cellValue(html, 'register:T2:r')).toBe('9');
    expect(cellTag(html, 'shared:P:x')).toContain('data-pt-current="false"');
    html = render(7);
    expect(cellTag(html, 'register:T2:r')).toContain('data-pt-access="write"');
    expect(html).not.toContain('data-pt-changed="true"');
    expect(html).not.toContain('data-pt-before=');
    html = render(8);
    expect(cellValue(html, 'register:T2:r')).toBe('9');
    expect(html).not.toContain('777');
    html = render(-1);
    expect(cellValue(html, 'register:T1:r')).toBe('0');
    expect(cellValue(html, 'shared:P:x')).toBe('0');
    expect(html).not.toContain('data-pt-current="true"');
  });

  it('hides record groups without leaking their values or removing them from saved input', () => {
    const { instance, view, render } = fixture(), before = JSON.stringify(instance.input);
    view.fields = ['스레드'];
    let html = render(5);
    expect(html).not.toContain('data-pt-shared=');
    expect(html).not.toContain('shared:P:');
    expect(html).not.toContain('nullable');
    expect(html).not.toContain('data-pt-process="process:Unused"');
    expect(html).toContain('data-pt-thread="thread:T2"');
    view.fields = ['주소공간'];
    html = render(3);
    expect(html).toContain('data-pt-cell="shared:P:x"');
    expect(html).toContain('data-pt-process="process:Unused"');
    expect(html).not.toContain('data-pt-thread=');
    expect(html).not.toContain('register:T1:r');
    expect(html).not.toContain('data-pt-stack=');
    expect(html).not.toContain('>T1<');
    view.fields = ['unknown'];
    expect(render(0)).toContain('선택한 표시 항목이 없습니다.');
    view.fields = [];
    expect(render(3)).toContain('register:T1:r');
    expect(JSON.stringify(instance.input)).toBe(before);
  });

  it('keeps actor target and displayed-name fields, while memory/region fields use raw process IDs', () => {
    const { instance, render } = fixture();
    instance.labels.T2 = '두 번째 스레드'; instance.labels.P = '작업 공간';
    const actor = createView('actor', 'T2'); actor.fields = ['두 번째 스레드'];
    let html = render(1, actor);
    expect(html).toContain('두 번째 스레드');
    expect(html).toContain('작업 공간');
    expect(html).not.toContain('thread:T1');
    expect(html).not.toContain('register:T2:r');
    actor.fields = ['T2'];
    expect(render(1, actor)).toContain('선택한 스레드가 없습니다.');
    for (const role of ['memory', 'region']) {
      const view = createView(role, 'ignored-target'); view.fields = ['P'];
      html = render(0, view);
      expect(html).toContain('작업 공간');
      expect(cellValue(html, 'shared:P:x')).toBe('1');
      expect(html).not.toContain('shared:Q:x');
      expect(html).not.toContain('data-pt-thread=');
      view.fields = ['작업 공간'];
      expect(render(0, view)).toContain('선택한 표시 항목이 없습니다.');
    }
  });

  it('preserves typed false, null, zero, empty strings and original long text without HTML execution', () => {
    const { instance, view } = fixture();
    const text = '<script>alert("demo")</script>\n' + '원문 '.repeat(35);
    instance.input = { spaces: { same: { same: null, flag: false, empty: '', zero: 0, text, stringNull: 'null' } }, threads: { same: { process: 'same', registers: { same: false }, stack: [null, false, '', 0, 'null'] } }, operations: [] };
    const execution = run('PT', instance.input);
    const html = renderToStaticMarkup(createElement(ProcessStructureVisual, { instance, execution, cursor: -1, view }));
    expect(html).toContain('data-pt-process="process:same"');
    expect(html).toContain('data-pt-thread="thread:same"');
    expect(cellValue(html, 'shared:same:same')).toBe('null');
    expect(cellValue(html, 'register:same:same')).toBe('false');
    expect(cellValue(html, 'shared:same:empty')).toBe('&quot;&quot;');
    expect(cellValue(html, 'shared:same:zero')).toBe('0');
    expect(cellValue(html, 'shared:same:stringNull')).toBe('&quot;null&quot;');
    expect(html).toContain('data-pt-value-details="shared:same:text"');
    expect(html).toContain('data-pt-raw="shared:same:text"');
    expect(html).toContain('&lt;script&gt;alert(&quot;demo&quot;)&lt;/script&gt;');
    expect(html).toContain('원문 '.repeat(35));
    expect(html).not.toContain('<script>');
  });

  it('retains all 256 shared cells, arbitrary registers and static stack entries', () => {
    const { instance, view } = fixture();
    const values = Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`field_${index}`, index]));
    instance.input = { spaces: { P: values }, threads: { T: { process: 'P', registers: values, stack: Array.from({ length: 256 }, (_, index) => index) } }, operations: [] };
    instance.labels.T = '긴 스레드 이름 '.repeat(20);
    const before = JSON.stringify(instance), execution = run('PT', instance.input);
    const html = renderToStaticMarkup(createElement(ProcessStructureVisual, { instance, execution, cursor: -1, view }));
    expect((html.match(/data-pt-cell="shared:P:/g) ?? []).length).toBe(256);
    expect((html.match(/data-pt-cell="register:T:/g) ?? []).length).toBe(256);
    expect((html.match(/data-pt-stack-index=/g) ?? []).length).toBe(256);
    expect(cellValue(html, 'stack:T:255')).toBe('255');
    expect(html).toContain(instance.labels.T);
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('respects annotation hidden/kind/actor/event-label fields while exposing all notes for editing', () => {
    const { doc, instance, execution } = fixture();
    const notes = ['visible', 'hidden', 'wrongKind', 'wrongActor', 'wrongField'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when = { kind: 'read', actor: 'T2' }; notes[0].fields = ['읽기 · T2'];
    notes[1].hidden = true; notes[2].when.kind = 'write'; notes[3].when.actor = 'T1'; notes[4].fields = ['쓰기 · T2'];
    instance.views = notes;
    const before = JSON.stringify(doc);
    const html = renderToStaticMarkup(createElement(ProcessStructureExplanation, { instance, execution, cursor: 1 }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'wrongKind', 'wrongActor', 'wrongField']) expect(html).not.toContain(`note-${name}`);
    const editable = renderToStaticMarkup(createElement(ProcessStructureExplanation, { instance, execution, cursor: 1, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(editable).toContain(note.text);
    expect(editable).toContain('+ 설명 추가');
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('leaves legacy independent views, positioning and display conditions unchanged', () => {
    const { doc, instance, execution, render } = fixture();
    instance.views = ['actor', 'region', 'memory', 'record', 'relation', 'annotation'].map((role, i) => ({ ...createView(role), x: 80 + i * 251, y: 73, width: 260, height: 170 }));
    const view = instance.views[3]; view.when = { kind: 'write', actor: 'T1' };
    const before = JSON.stringify(doc);
    expect(projection(instance, execution, 0, view).visible).toBe(true);
    expect(projection(instance, execution, 1, view).visible).toBe(false);
    view.hidden = true;
    expect(projection(instance, execution, 0, view).visible).toBe(false);
    view.hidden = false;
    for (const item of instance.views) render(0, item);
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('shows valid empty dictionaries and stack distinctly from an invalid empty-thread draft', () => {
    const { instance, view } = fixture();
    instance.input = { spaces: { P: {}, Unused: {} }, threads: { T: { process: 'P', registers: {}, stack: [] } }, operations: [] };
    let html = renderToStaticMarkup(createElement(ProcessStructureVisual, { instance, execution: run('PT', instance.input), cursor: -1, view }));
    expect(html).toContain('등록된 공유값 없음');
    expect(html).toContain('등록된 값 없음');
    expect(html).toContain('정적 · 0개');
    expect(html).not.toContain('data-pt-invalid');
    instance.input = { spaces: {}, threads: {}, operations: [] };
    html = renderToStaticMarkup(createElement(ProcessStructureVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-pt-invalid');
    expect(html).not.toContain('data-pt-process=');
  });
});
