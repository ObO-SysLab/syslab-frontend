import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { InodeExplanation, InodeVisual } from './InodeVisual';

function fixture() {
  const doc = createDocument('IN'), instance = doc.instances[0];
  instance.input = {
    fs: {
      blockSize: 4, directory: { a: 'i', alias: 'i', empty: 'j' },
      inodes: { i: { size: 10, direct: ['d0'], indirect: 'ix' }, j: { size: 0, direct: [], indirect: null } },
      indirect: { ix: ['d1', 'd2'] }, blocks: { d0: 'ABCD', d1: false, d2: null },
    },
    accesses: [{ name: 'a', offset: 0 }, { name: 'alias', offset: 9 }, { name: 'a', offset: 10 }, { name: 'empty', offset: 0 }],
  };
  const execution = run('IN', instance.input), view = createView('storage');
  const render = (cursor: number, chosenView = view) => renderToStaticMarkup(createElement(InodeVisual, { instance, execution, cursor, view: chosenView }));
  const cursor = (index: number, kind: string) => execution.events.findIndex(event => event.data.index === index && event.kind === kind);
  return { doc, instance, execution, view, render, cursor };
}

function nodeTag(html: string, key: string) {
  return html.match(new RegExp(`<div[^>]*data-inode-node="${key}"[^>]*>`))?.[0] ?? '';
}

describe('IN visual presentation preserves authored data and current trace semantics', () => {
  it('renders names sharing one inode with direct and indirect links, retaining false and null block values', () => {
    const { instance, render } = fixture(), before = JSON.stringify(instance);
    const html = render(-1);
    expect((html.match(/data-inode-node="inode:i"/g) ?? []).length).toBe(1);
    expect(html).toContain('data-inode-from="name:a" data-inode-to="inode:i"');
    expect(html).toContain('data-inode-from="name:alias" data-inode-to="inode:i"');
    expect(html).toContain('data-inode-from="inode:i" data-inode-to="block:d0"');
    expect(html).toContain('data-inode-from="indirect:ix" data-inode-to="block:d2"');
    expect(html).toContain('data-inode-content="block:d1">false</strong>');
    expect(html).toContain('data-inode-content="block:d2">null</strong>');
    expect(html).not.toContain('data-inode-active="true"');
    expect(html).not.toContain('data-inode-result="data"');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('filters complete storage groups without shortcut links, hidden labels, or input mutation', () => {
    const { instance, view, render, cursor } = fixture(), original = JSON.stringify(instance.input);
    view.fields = ['디렉터리', '데이터'];
    let html = render(cursor(1, 'data'));
    expect(html).toContain('data-inode-node="name:alias"');
    expect(html).toContain('data-inode-node="block:d2"');
    expect(html).not.toContain('data-inode-kind="inode"');
    expect(html).not.toContain('data-inode-kind="indirect"');
    expect(html).not.toContain('data-inode-edge=');
    view.fields = ['데이터'];
    html = render(cursor(1, 'data'));
    expect(html).not.toContain('data-inode-current-file');
    expect(html).not.toContain('>alias<');
    view.fields = [];
    expect(render(-1)).toContain('data-inode-group="간접블록"');
    expect(JSON.stringify(instance.input)).toBe(original);
  });

  it('highlights only the traversed current access, resets on the next lookup and stops at inode for EOF', () => {
    const { render, cursor } = fixture();
    const firstData = render(cursor(0, 'data'));
    expect(nodeTag(firstData, 'block:d0')).toContain('data-inode-current="true"');
    const nextLookup = render(cursor(1, 'lookup'));
    expect(nodeTag(nextLookup, 'name:alias')).toContain('data-inode-current="true"');
    expect(nodeTag(nextLookup, 'block:d0')).toContain('data-inode-visited="false"');
    expect(nodeTag(nextLookup, 'block:d2')).toContain('data-inode-visited="false"');
    expect(nextLookup).not.toContain('data-inode-result="data"');
    const indirect = render(cursor(1, 'indirect'));
    expect(nodeTag(indirect, 'indirect:ix')).toContain('data-inode-current="true"');
    expect(nodeTag(indirect, 'block:d2')).toContain('data-inode-visited="false"');
    const data = render(cursor(1, 'data'));
    expect(data).toContain('data-inode-file-offset="true">9</b>');
    expect(data).toContain('data-inode-block-offset="true">1</b>');
    const eof = render(cursor(2, 'eof'));
    expect(nodeTag(eof, 'inode:i')).toContain('data-inode-eof="true"');
    expect(nodeTag(eof, 'block:d0')).toContain('data-inode-visited="false"');
    expect(nodeTag(eof, 'indirect:ix')).toContain('data-inode-visited="false"');
    expect(eof).toContain('data-inode-result="eof"');
    expect(render(cursor(0, 'lookup'))).not.toContain('data-inode-visited="true" data-inode-eof="true"');
  });

  it('keeps record index/target/result fields independent and does not expose a later result', () => {
    const { render, cursor } = fixture(), view = createView('record');
    view.fields = ['result'];
    let html = render(cursor(1, 'data'), view);
    expect(html).toContain('data-inode-field="result"');
    expect(html).not.toContain('data-inode-field="index"');
    expect(html).not.toContain('data-inode-field="target"');
    expect(html).toContain('<dd>d2</dd>');
    expect(html).toContain('data-inode-block-offset="true">1</dd>');
    html = render(cursor(1, 'inode'), view);
    expect(html).toContain('data-inode-result="pending"');
    expect(html).not.toContain('<dd>d2</dd>');
    view.fields = ['target'];
    html = render(cursor(1, 'indirect'), view);
    expect(html).toContain('>ix</strong>');
    expect(html).not.toContain('data-inode-field="result"');
  });

  it('preserves hidden, event/actor and annotation field filters while keeping all notes editable', () => {
    const { doc, instance, execution, cursor } = fixture();
    const notes = ['visible', 'hidden', 'wrongKind', 'wrongActor', 'wrongField'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when.kind = 'data'; notes[0].fields = ['데이터 접근'];
    notes[1].hidden = true;
    notes[2].when.kind = 'eof';
    notes[3].when.actor = 'a';
    notes[4].fields = ['inode 조회'];
    instance.views = notes;
    const before = JSON.stringify(doc), current = cursor(1, 'data');
    const html = renderToStaticMarkup(createElement(InodeExplanation, { instance, execution, cursor: current }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'wrongKind', 'wrongActor', 'wrongField']) expect(html).not.toContain(`note-${name}`);
    const editable = renderToStaticMarkup(createElement(InodeExplanation, { instance, execution, cursor: current, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(editable).toContain(note.text);
    expect(editable).toContain('+ 설명 추가');
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
    const view = createView('storage');
    view.when.kind = 'eof';
    expect(projection(instance, execution, current, view).visible).toBe(false);
    view.when.kind = null; view.hidden = true;
    expect(projection(instance, execution, current, view).visible).toBe(false);
  });

  it('keeps same IDs in all four groups distinct and preserves long scalar source text safely', () => {
    const { instance, view } = fixture();
    const content = '<script>alert("demo")</script>\n' + '긴 원문 '.repeat(40);
    instance.input = { fs: { blockSize: 4, directory: { same: 'same' }, inodes: { same: { size: 4, direct: [], indirect: 'same' } }, indirect: { same: ['same'] }, blocks: { same: content } }, accesses: [{ name: 'same', offset: 0 }] };
    const execution = run('IN', instance.input);
    const html = renderToStaticMarkup(createElement(InodeVisual, { instance, execution, cursor: execution.events.length - 1, view }));
    for (const kind of ['name', 'inode', 'indirect', 'block']) expect(html).toContain(`data-inode-node="${kind}:same"`);
    expect(html).toContain('data-inode-content-details="block:same"');
    expect(html).toContain('data-inode-content="block:same"');
    expect(html).toContain('&lt;script&gt;alert(&quot;demo&quot;)&lt;/script&gt;');
    expect(html).toContain('긴 원문 '.repeat(40));
    expect(html).not.toContain('<script>');
  });

  it('renders every authored node beyond forty without changing saved view layout or adding a read constraint', () => {
    const { doc, instance, view } = fixture();
    const directory = Object.fromEntries(Array.from({ length: 53 }, (_, i) => [`file_${i}`, 'shared']));
    instance.labels.file_52 = '긴 파일 이름 '.repeat(30);
    instance.input = { fs: { blockSize: 4, directory, inodes: { shared: { size: 0, direct: [], indirect: null } }, indirect: { unused: ['missing'] }, blocks: { empty: '', zero: 0 } }, accesses: [] };
    Object.assign(view, { x: 321, y: 234, width: 170, height: 120 });
    instance.views = [view];
    const saved = JSON.stringify(doc), execution = run('IN', instance.input);
    const html = renderToStaticMarkup(createElement(InodeVisual, { instance, execution, cursor: -1, view }));
    expect((html.match(/data-inode-kind="name"/g) ?? []).length).toBe(53);
    expect(html).toContain(Object.keys(directory)[52]);
    expect(html).toContain(instance.labels.file_52);
    expect(html).toContain('data-inode-content="block:empty">&quot;&quot;</strong>');
    expect(html).toContain('data-inode-content="block:zero">0</strong>');
    expect(html).not.toContain('data-inode-invalid');
    expect(validateDocument(JSON.parse(saved))).toBe(true);
    expect(JSON.stringify(doc)).toBe(saved);
  });

  it('retains unused dangling pointer values without inventing blocks or exposing a hidden data group', () => {
    const { instance, view } = fixture();
    instance.input = { fs: { blockSize: 4, directory: {}, inodes: {}, indirect: { orphan: ['missing_target'] }, blocks: {} }, accesses: [] };
    const original = JSON.stringify(instance.input), execution = run('IN', instance.input);
    const render = () => renderToStaticMarkup(createElement(InodeVisual, { instance, execution, cursor: -1, view }));
    const html = render();
    expect(html).toContain('data-inode-missing-pointer="indirect:orphan:0"');
    expect(html).toContain('>missing_target</strong>');
    expect(html).toContain('대상 없음');
    expect(html).not.toContain('data-inode-node="block:missing_target"');
    expect(html).not.toContain('data-inode-edge=');
    view.fields = ['간접블록'];
    expect(render()).toContain('data-inode-node="indirect:orphan"');
    expect(render()).not.toContain('missing_target');
    view.fields = ['데이터'];
    expect(render()).not.toContain('indirect:orphan');
    view.fields = ['간접블록', '데이터'];
    expect(render()).toContain('>missing_target</strong>');
    expect(JSON.stringify(instance.input)).toBe(original);
  });

  it('renders an input correction state for incomplete author drafts', () => {
    const { instance, view } = fixture();
    instance.input = {};
    const html = renderToStaticMarkup(createElement(InodeVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-inode-invalid');
    expect(html).toContain('설정을 확인하세요');
    expect(html).not.toContain('data-inode-node=');
  });
});
