import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { ContextSwitchExplanation, ContextSwitchVisual } from './ContextSwitchVisual';

function fixture() {
  const doc = createDocument('CS'), instance = doc.instances[0], view = createView('record');
  instance.input = {
    pcbs: { P: { pc: 10, sp: 100, flag: false, note: null }, Q: { pc: 20, sp: 200, mode: 'user' }, R: {} },
    initialId: 'P', order: ['Q', 'R', 'P', 'P'],
  };
  const execution = run('CS', instance.input);
  const render = (cursor: number, selectedView = view) => renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution, cursor, view: selectedView }));
  return { doc, instance, view, execution, render };
}
const value = (html: string, key: string) => html.match(new RegExp(`<strong[^>]*data-cs-value="${key}"[^>]*>(.*?)</strong>`))?.[1];
const pcbTag = (html: string, key: string) => html.match(new RegExp(`<section[^>]*data-cs-pcb="${key}"[^>]*>`))?.[0] ?? '';

describe('CS diagram preserves snapshots, selected groups and existing authoring contracts', () => {
  it('distinguishes the selected process from the CPU context during restore', () => {
    const { render } = fixture();
    let html = render(-1);
    expect(html).toContain('data-cs-phase="initial"');
    expect(html).toContain('data-cs-selected="P"');
    expect(html).toContain('data-cs-loaded="P" data-cs-different="false"');
    expect(value(html, 'cpu-register:pc')).toBe('10');
    html = render(1);
    expect(html).toContain('data-cs-phase="restore"');
    expect(html).toContain('data-cs-selected="P"');
    expect(html).toContain('data-cs-loaded="Q" data-cs-different="true"');
    expect(pcbTag(html, 'pcb:P')).toContain('data-cs-selected-row="true"');
    expect(pcbTag(html, 'pcb:P')).toContain('data-cs-active="false"');
    expect(pcbTag(html, 'pcb:Q')).toContain('data-cs-active="true"');
    expect(pcbTag(html, 'pcb:Q')).toContain('data-cs-selected-row="false"');
    expect(value(html, 'cpu-register:pc')).toBe('20');
    expect(html).not.toContain('data-cs-cell="cpu-register:flag"');
    expect(html).not.toContain('data-cs-cell="cpu-register:note"');
    expect(value(html, 'pcb-register:P:flag')).toBe('false');
    expect(value(html, 'pcb-register:P:note')).toBe('null');
  });

  it('keeps same-value saves and same-target switches as distinct phases without fabricated changes', () => {
    const { render } = fixture();
    const save = render(0);
    expect(save).toContain('data-cs-phase="save"');
    expect(value(save, 'cpu-register:pc')).toBe('10');
    expect(value(save, 'pcb-register:P:pc')).toBe('10');
    expect(pcbTag(save, 'pcb:P')).toContain('data-cs-active="true"');
    const selected = render(2);
    expect(selected).toContain('data-cs-selected="Q"');
    expect(selected).toContain('data-cs-loaded="Q"');
    expect(selected).not.toContain('data-cs-active="true"');
    for (const [cursor, phase] of [[9, 'save'], [10, 'restore'], [11, 'select']] as const) {
      const html = render(cursor);
      expect(html).toContain(`data-cs-phase="${phase}"`);
      expect(html).toContain('data-cs-selected="P"');
      expect(html).toContain('data-cs-loaded="P"');
      expect(value(html, 'cpu-register:pc')).toBe('10');
      expect(html).not.toContain('이전 값');
    }
  });

  it('renders empty restored registers without inventing zero fields and seeks from the chosen prefix', () => {
    const { instance, execution, render } = fixture(), before = JSON.stringify({ instance, execution });
    const empty = render(4);
    expect(empty).toContain('data-cs-selected="Q"');
    expect(empty).toContain('data-cs-loaded="R"');
    expect(empty).not.toContain('data-cs-cell="cpu-register:');
    expect(empty).toContain('data-cs-empty-registers');
    render(11);
    const earlier = render(1);
    expect(value(earlier, 'cpu-register:pc')).toBe('20');
    expect(earlier).toContain('data-cs-selected="P"');
    expect(JSON.stringify({ instance, execution })).toBe(before);
  });

  it('preserves record fields without leaking hidden IDs, values or endpoints through tags', () => {
    const { instance, view, render } = fixture(), before = JSON.stringify(instance.input);
    view.target = 'ignored-target';
    view.fields = ['레지스터'];
    let html = render(1);
    expect(value(html, 'cpu-register:pc')).toBe('20');
    expect(html).not.toContain('data-cs-selected=');
    expect(html).not.toContain('data-cs-loaded=');
    expect(html).not.toContain('data-cs-pcb=');
    expect(html).not.toContain('pcb-register:');
    expect(html).not.toContain('>P<');
    expect(html).not.toContain('>Q<');
    view.fields = ['PCB'];
    html = render(1);
    expect(html).toContain('pcb-register:P:note');
    expect(html).toContain('data-cs-pcb="pcb:Q" data-cs-active="true"');
    expect(html).not.toContain('data-cs-selected-row=');
    expect(html).not.toContain('data-cs-selected=');
    expect(html).not.toContain('data-cs-loaded=');
    expect(html).not.toContain('data-cs-cpu=');
    expect(html).not.toContain('cpu-register:');
    view.fields = ['현재'];
    html = render(1);
    expect(html).toContain('data-cs-selected="P"');
    expect(html).not.toContain('data-cs-loaded=');
    expect(html).not.toContain('data-cs-cell=');
    expect(html).not.toContain('data-cs-pcb=');
    view.fields = ['unknown'];
    expect(render(1)).toContain('선택한 표시 항목이 없습니다.');
    view.fields = [];
    expect(render(1)).toContain('data-cs-loaded="Q"');
    expect(JSON.stringify(instance.input)).toBe(before);
  });

  it('keeps actor raw targets, display-name fields and selected state based on current rather than restore actor', () => {
    const { instance, render } = fixture();
    instance.labels.P = '첫 번째 작업'; instance.labels.Q = '다음 작업';
    const actor = createView('actor', 'P'); actor.fields = ['첫 번째 작업'];
    const html = render(1, actor);
    expect(html).toContain('data-cs-actor="P" data-cs-selected-row="true"');
    expect(html).toContain('첫 번째 작업');
    expect(html).not.toContain('다음 작업');
    expect(html).not.toContain('data-cs-cell=');
    actor.fields = ['P'];
    expect(render(1, actor)).toContain('선택한 실행 주체가 없습니다.');
    actor.fields = []; actor.target = 'Q';
    expect(render(1, actor)).toContain('data-cs-actor="Q" data-cs-selected-row="false"');
  });

  it('preserves scalar types, namespace collisions and full escaped long values', () => {
    const { instance, view } = fixture(), text = '<script>x</script>\n' + '긴 원문 '.repeat(30);
    instance.input = { pcbs: { same: { same: false, nullable: null, zero: 0, empty: '', text, stringNull: 'null', big: Number.MAX_SAFE_INTEGER } }, initialId: 'same', order: [] };
    const html = renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution: run('CS', instance.input), cursor: -1, view }));
    expect(html).toContain('data-cs-pcb="pcb:same"');
    expect(value(html, 'cpu-register:same')).toBe('false');
    expect(value(html, 'pcb-register:same:same')).toBe('false');
    expect(value(html, 'cpu-register:nullable')).toBe('null');
    expect(value(html, 'cpu-register:zero')).toBe('0');
    expect(value(html, 'cpu-register:empty')).toBe('&quot;&quot;');
    expect(value(html, 'cpu-register:stringNull')).toBe('&quot;null&quot;');
    expect(value(html, 'cpu-register:big')).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(html).toContain('data-cs-value-details="cpu-register:text"');
    expect(html).toContain('data-cs-raw="cpu-register:text"');
    expect(html).toContain('긴 원문 '.repeat(30));
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('data-cs-register-details');
  });

  it('retains all 256 PCBs and all 256 register values through scrolling and local details', () => {
    const { instance, view } = fixture();
    const pcbs = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`P${i}`, { register: i }]));
    instance.input = { pcbs, initialId: 'P0', order: ['P255'] };
    let html = renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution: run('CS', instance.input), cursor: 1, view }));
    expect((html.match(/data-cs-pcb="/g) ?? []).length).toBe(256);
    expect(value(html, 'pcb-register:P255:register')).toBe('255');
    expect(pcbTag(html, 'pcb:P255')).toContain('data-cs-active="true"');
    const registers = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`r${i}`, i]));
    instance.input = { pcbs: { P: registers }, initialId: 'P', order: [] };
    const before = JSON.stringify(instance);
    html = renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution: run('CS', instance.input), cursor: -1, view }));
    expect((html.match(/data-cs-cell="cpu-register:/g) ?? []).length).toBe(256);
    expect((html.match(/data-cs-cell="pcb-register:P:/g) ?? []).length).toBe(256);
    expect(value(html, 'pcb-register:P:r255')).toBe('255');
    expect(html).toContain('나머지 252개 레지스터');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('honors annotation conditions and event-label fields while keeping every note editable', () => {
    const { instance, execution } = fixture();
    const notes = ['visible', 'hidden', 'kind', 'actor', 'field'].map(name => ({ ...createView('annotation'), text: `note-${name}` }));
    notes[0].when = { kind: 'restore', actor: 'Q' }; notes[0].fields = ['문맥 복원 · Q'];
    notes[1].hidden = true; notes[2].when.kind = 'save'; notes[3].when.actor = 'P'; notes[4].fields = ['문맥 복원 · P'];
    instance.views = notes;
    const before = JSON.stringify(instance);
    let html = renderToStaticMarkup(createElement(ContextSwitchExplanation, { instance, execution, cursor: 1 }));
    expect(html).toContain('note-visible');
    for (const name of ['hidden', 'kind', 'actor', 'field']) expect(html).not.toContain(`note-${name}`);
    html = renderToStaticMarkup(createElement(ContextSwitchExplanation, { instance, execution, cursor: 1, onChange: () => {}, onAdd: () => {} }));
    for (const note of notes) expect(html).toContain(note.text);
    expect(html).toContain('+ 설명 추가');
    expect(JSON.stringify(instance)).toBe(before);
  });

  it('leaves legacy roles, layout and visibility semantics intact and does not add fake time or mode', () => {
    const { doc, instance, execution, view, render } = fixture();
    instance.views = ['actor', 'processor', 'record', 'timeline', 'annotation'].map((role, i) => ({ ...createView(role), x: 75 + i * 300, y: 83, width: 265, height: 175 }));
    view.when = { kind: 'restore', actor: 'Q' };
    expect(projection(instance, execution, 1, view).visible).toBe(true);
    view.when.actor = 'P';
    expect(projection(instance, execution, 1, view).visible).toBe(false);
    view.when.actor = 'Q'; view.hidden = true;
    expect(projection(instance, execution, 1, view).visible).toBe(false);
    const before = JSON.stringify(doc);
    for (const item of instance.views) render(1, item);
    expect(validateDocument(JSON.parse(before))).toBe(true);
    expect(JSON.stringify(doc)).toBe(before);
    const html = render(-1);
    expect(html).not.toContain('시각');
    expect(html).not.toContain('실행 영역');
  });

  it('shows a valid empty context distinctly from an invalid draft', () => {
    const { instance, view } = fixture();
    instance.input = { pcbs: { P: {} }, initialId: 'P', order: [] };
    let html = renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution: run('CS', instance.input), cursor: -1, view }));
    expect(html).toContain('비어 있음');
    expect(html).not.toContain('data-cs-invalid');
    instance.input = { pcbs: {}, initialId: 'missing', order: [] };
    html = renderToStaticMarkup(createElement(ContextSwitchVisual, { instance, execution: null, cursor: -1, view }));
    expect(html).toContain('data-cs-invalid');
    expect(html).not.toContain('data-cs-cpu=');
  });
});
