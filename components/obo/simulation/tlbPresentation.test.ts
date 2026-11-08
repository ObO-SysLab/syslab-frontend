import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { eventLabel, projection } from '../runtime/projection.mjs';
import { TlbExplanation, TlbVisual } from './TlbVisual';

function fixture() {
  const doc = createDocument('TLB'), instance = doc.instances[0], view = createView('record');
  instance.input = { addresses: [5, 1, 13, 1, 9, 9], pageSize: 4, table: [7, 3, null, 0], capacity: 2, initialTlb: [{ page: 0, frame: 7 }] };
  const execution = run('TLB', instance.input);
  const cursor = (index: number, kind: string) => execution.events.findIndex(event => event.data.index === index && event.kind === kind);
  const render = (position: number, chosen = view) => renderToStaticMarkup(createElement(TlbVisual, { instance, execution, cursor: position, view: chosen }));
  return { doc, instance, view, execution, cursor, render };
}
const rowTag = (html: string, page: number) => html.match(new RegExp(`<tr[^>]*data-tlb-table-row="${page}"[^>]*>`))?.[0] ?? '';

describe('TLB visual preserves address translation phases and authored view choices', () => {
  it('shows static mappings initially without an access, completed result or invented physical memory', () => {
    const { instance, render } = fixture(), before = JSON.stringify(instance);
    const html = render(-1);
    expect((html.match(/data-tlb-table-row=/g) ?? []).length).toBe(4);
    expect(html).toContain('data-tlb-cache-row="0"');
    expect(html).toContain('data-tlb-page="true">—');
    expect(html).toContain('data-tlb-offset="true">—');
    expect(html).not.toContain('data-tlb-physical');
    expect(html).not.toContain('data-tlb-fault-result');
    expect(html).not.toContain('data-tlb-edge=');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('keeps miss separate from fault and reveals the physical address and insertion only at translate', () => {
    const { render, cursor } = fixture();
    let html = render(cursor(0, 'lookup'));
    expect(html).toContain('data-tlb-hit="false"');
    expect(html).toContain('>Miss</b>');
    expect(html).toContain('data-tlb-from="page" data-tlb-to="tlb"');
    expect(html).not.toContain('data-tlb-edge="tlb-table"');
    expect(rowTag(html, 1)).toContain('data-tlb-active="false"');
    expect(html).not.toContain('data-tlb-physical');
    expect(html).not.toContain('data-tlb-cache-row="1"');
    html = render(cursor(0, 'pageTable'));
    expect(html).toContain('data-tlb-edge="tlb-table"');
    expect(rowTag(html, 1)).toContain('data-tlb-active="true"');
    expect(html).not.toContain('data-tlb-physical');
    expect(html).not.toContain('data-tlb-fault-result');
    html = render(cursor(0, 'translate'));
    expect(html).toContain('data-tlb-hit="false"');
    expect(html).toContain('data-tlb-cache-row="1" data-tlb-active="false" data-tlb-inserted="true"');
    expect(html).toContain('data-tlb-physical="true">13</strong>');
    expect(html).toContain('data-tlb-from="table" data-tlb-to="result"');
    expect(html).toContain('data-tlb-from="offset" data-tlb-to="result"');
  });

  it('uses the direct hit route without claiming a page table access or changing FIFO order', () => {
    const { render, cursor } = fixture();
    const html = render(cursor(1, 'translate'));
    expect(html).toContain('data-tlb-hit="true"');
    expect(html).toContain('data-tlb-physical="true">29</strong>');
    expect(html).toContain('data-tlb-from="tlb" data-tlb-to="result"');
    expect(html).not.toContain('data-tlb-edge="tlb-table"');
    expect(html).not.toContain('data-tlb-edge="table-result"');
    expect(rowTag(html, 0)).toContain('data-tlb-active="false"');
    expect(html.indexOf('data-tlb-cache-row="0"')).toBeLessThan(html.indexOf('data-tlb-cache-row="1"'));
    expect(html).not.toContain('data-tlb-inserted="true"');
  });

  it('shows actual FIFO eviction and frame zero, and resets old completion on the next lookup', () => {
    const { render, cursor } = fixture();
    let html = render(cursor(2, 'pageTable'));
    expect(html).not.toContain('data-tlb-evicted=');
    expect(html).toContain('data-tlb-cache-row="0"');
    html = render(cursor(2, 'translate'));
    expect(html).toContain('data-tlb-evicted="0"');
    expect(html).not.toContain('data-tlb-cache-row="0"');
    expect(html).toContain('data-tlb-cache-row="3"');
    expect(html).toContain('data-tlb-physical="true">1</strong>');
    expect(html).toContain('프레임 0 × 4 + 1');
    html = render(cursor(3, 'lookup'));
    expect(html).not.toContain('data-tlb-physical');
    expect(html).not.toContain('data-tlb-evicted=');
    expect(html).not.toContain('data-tlb-edge="table-result"');
  });

  it('ends repeated page faults at the absent table row without a physical route or cache fill', () => {
    const { render, cursor } = fixture();
    for (const index of [4, 5]) {
      let html = render(cursor(index, 'pageTable'));
      expect(html).not.toContain('data-tlb-fault-result');
      html = render(cursor(index, 'fault'));
      expect(html).toContain('data-tlb-fault-result');
      expect(rowTag(html, 2)).toContain('data-tlb-fault="true"');
      expect(html).toContain('data-tlb-edge="tlb-table"');
      expect(html).not.toContain('data-tlb-physical');
      expect(html).not.toContain('data-tlb-to="result"');
      expect(html).not.toContain('data-tlb-cache-row="2"');
      expect(html).not.toContain('data-tlb-inserted="true"');
    }
  });

  it('honors every record field combination without leaking hidden groups through results or shortcut arrows', () => {
    const { instance, view, render, cursor } = fixture(), before = JSON.stringify(instance.input);
    const keys = ['페이지테이블', 'TLB', '페이지', '오프셋'];
    for (let mask = 1; mask < 16; mask++) {
      view.fields = keys.filter((_, index) => mask & (1 << index));
      const html = render(cursor(2, 'translate'));
      const expectations: [number, string][] = [[1, 'data-tlb-table-row='], [2, 'data-tlb-cache-row='], [4, 'data-tlb-page='], [8, 'data-tlb-offset=']];
      for (const [bit, marker] of expectations) expect(html.includes(marker)).toBe(!!(mask & bit));
      expect(html.includes('data-tlb-physical')).toBe(mask === 15);
      expect(html.includes('data-tlb-address')).toBe(mask === 15);
      expect(html.includes('data-tlb-formula')).toBe(mask === 15);
      if (!(mask & 2)) { expect(html).not.toContain('data-tlb-evicted='); expect(html).not.toContain('FIFO'); }
      for (const match of html.matchAll(/data-tlb-from="([^"]+)" data-tlb-to="([^"]+)"/g)) {
        expect(html).toContain(`data-tlb-node="${match[1]}"`);
        expect(html).toContain(`data-tlb-node="${match[2]}"`);
      }
      if (!(mask & 2) || !(mask & 1)) expect(html).not.toContain('data-tlb-edge="tlb-table"');
    }
    view.fields = ['old field'];
    expect(render(cursor(0, 'translate'))).toContain('선택한 표시 항목이 없습니다.');
    expect(JSON.stringify(instance.input)).toBe(before);
  });

  it('keeps all 256 rows and uses raw memory page fields, with no invented target filter or record values', () => {
    const { doc, instance } = fixture();
    instance.input = { addresses: [255], pageSize: 1, table: Array.from({ length: 256 }, (_, index) => index === 255 ? 0 : index), capacity: 256, initialTlb: [] };
    const execution = run('TLB', instance.input), view = createView('memory', 'ignored-target');
    Object.assign(view, { x: 123, y: -50, width: 190, height: 150 });
    instance.views = [view];
    const render = (cursor: number) => renderToStaticMarkup(createElement(TlbVisual, { instance, execution, cursor, view }));
    expect((render(-1).match(/data-tlb-table-row=/g) ?? []).length).toBe(256);
    view.fields = ['페이지 255'];
    const before = JSON.stringify(doc), html = render(execution.events.length - 1);
    expect((html.match(/data-tlb-table-row=/g) ?? []).length).toBe(1);
    expect(rowTag(html, 255)).toContain('data-tlb-active="true"');
    for (const marker of ['data-tlb-cache-row=', 'data-tlb-address', 'data-tlb-physical', 'data-tlb-page=', 'data-tlb-offset=', 'data-tlb-edge=']) expect(html).not.toContain(marker);
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
    view.fields = ['255'];
    expect(render(-1)).toContain('선택한 페이지가 없습니다.');
  });

  it('only highlights a selected memory row after a real page table visit', () => {
    const { render, cursor } = fixture(), memory = createView('memory');
    memory.fields = ['페이지 0'];
    expect(rowTag(render(cursor(1, 'translate'), memory), 0)).toContain('data-tlb-active="false"');
    expect(rowTag(render(cursor(3, 'lookup'), memory), 0)).toContain('data-tlb-active="false"');
    expect(rowTag(render(cursor(3, 'pageTable'), memory), 0)).toContain('data-tlb-active="true"');
    memory.fields = ['페이지 1'];
    expect(render(cursor(3, 'pageTable'), memory)).not.toContain('data-tlb-active="true"');
  });

  it('retains conditional authored notes and all editable originals without numeric state dumps', () => {
    const { doc, instance, execution, cursor } = fixture(), position = cursor(0, 'pageTable');
    const notes = ['visible', 'hidden', 'wrongKind', 'wrongActor', 'wrongField'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when.kind = 'pageTable'; notes[0].fields = [eventLabel(execution.events[position])];
    notes[1].hidden = true; notes[2].when.kind = 'fault'; notes[3].when.actor = 'page0'; notes[4].fields = ['old event'];
    instance.views = notes;
    const before = JSON.stringify(doc);
    const html = renderToStaticMarkup(createElement(TlbExplanation, { instance, execution, cursor: position }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'wrongKind', 'wrongActor', 'wrongField']) expect(html).not.toContain(`note-${name}`);
    const summary = html.match(/aria-live="polite">([^<]*)/)?.[1] ?? '';
    expect(summary).not.toMatch(/\d/);
    const editable = renderToStaticMarkup(createElement(TlbExplanation, { instance, execution, cursor: position, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(editable).toContain(note.text);
    expect(editable).toContain('+ 설명 추가');
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('preserves view visibility contracts and distinguishes valid empty addresses from invalid drafts', () => {
    const { doc, instance, view, execution, cursor } = fixture();
    view.when.kind = 'pageTable';
    expect(projection(instance, execution, cursor(0, 'lookup'), view).visible).toBe(false);
    expect(projection(instance, execution, cursor(0, 'pageTable'), view).visible).toBe(true);
    view.when.actor = 'page0';
    expect(projection(instance, execution, cursor(0, 'pageTable'), view).visible).toBe(false);
    view.when.actor = null; view.hidden = true;
    expect(projection(instance, execution, cursor(0, 'pageTable'), view).visible).toBe(false);
    instance.input = { addresses: [], pageSize: 1, table: [0, 0], capacity: 1, initialTlb: [] };
    const before = JSON.stringify(doc), empty = run('TLB', instance.input);
    let html = renderToStaticMarkup(createElement(TlbVisual, { instance, execution: empty, cursor: -1, view }));
    expect(html).not.toContain('data-tlb-invalid');
    expect(html).not.toContain('data-tlb-physical');
    expect(html).toContain('저장된 매핑 없음');
    expect(JSON.stringify(doc)).toBe(before);
    instance.input = {};
    html = renderToStaticMarkup(createElement(TlbVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-tlb-invalid');
    expect(html).not.toContain('data-tlb-node=');
  });
});
