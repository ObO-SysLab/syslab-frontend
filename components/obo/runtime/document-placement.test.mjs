import { describe, expect, it, vi } from 'vitest';
import { registry, run } from './index.mjs';
import { addActor, arrangeViews, createDocument, createView, placeNewView, semanticEntities, validateDocument } from './document.mjs';

const clone = value => structuredClone(value);
const gap = 30;
const separated = (a, b) => a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x || a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y;
const withoutPosition = view => { const { x, y, ...rest } = view; return rest; };
const notes = instance => instance.views.filter(view => view.role === 'annotation').map(view => view.id);
function expectGeometry(view) {
  expect([view.x, view.y, view.width, view.height].every(Number.isFinite)).toBe(true);
  expect(Math.abs(view.x)).toBeLessThanOrEqual(100000);
  expect(Math.abs(view.y)).toBeLessThanOrEqual(100000);
  expect(view.width).toBeGreaterThanOrEqual(100); expect(view.width).toBeLessThanOrEqual(2000);
  expect(view.height).toBeGreaterThanOrEqual(60); expect(view.height).toBeLessThanOrEqual(2000);
}
function expectDisjoint(views) {
  views.forEach(expectGeometry);
  for (let i = 0; i < views.length; i++) for (let j = i + 1; j < views.length; j++) expect(separated(views[i], views[j])).toBe(true);
}

describe('view placement changes geometry only at explicit authoring actions', () => {
  it('preserves the standalone createView contract and already free requested positions', () => {
    const defaultView = createView('record', 'example', 3);
    expect([defaultView.x, defaultView.y, defaultView.width, defaultView.height]).toEqual([40, 260, 270, 180]);
    const instance = createDocument('PC').instances[0];
    const desired = { ...createView('record'), x: -1400.125, y: -840.5, fields: ['버퍼'], text: 'keep me', when: { kind: 'put', actor: 'P' } };
    const before = clone(instance), result = placeNewView(instance, desired);
    expect(result).toEqual(desired); expect(result).not.toBe(desired);
    result.fields.push('세마포어'); result.when.kind = 'take';
    expect(desired.fields).toEqual(['버퍼']); expect(desired.when.kind).toBe('put');
    expect(instance).toEqual(before);
  });

  it('places a new view below each current large default without moving or resizing existing views', () => {
    for (const id of ['ST2', 'BK', 'IN', 'PT', 'TLB', 'CS', 'PC']) {
      const document = createDocument(id), instance = document.instances[0], before = clone(instance);
      const desired = { ...createView(instance.views[0].role, null, instance.views.length), text: 'new display' };
      const added = placeNewView(instance, desired, { excludedIds: notes(instance) });
      expect(instance).toEqual(before);
      expect(added.x).toBe(instance.views[0].x);
      expect(added.y).toBe(instance.views[0].y + instance.views[0].height + 30);
      expect(separated(added, instance.views[0])).toBe(true);
      expect(withoutPosition(added)).toEqual(withoutPosition(desired));
      instance.views.push(added);
      expect(validateDocument(document)).toBe(true);
      expect(instance.views.slice(0, -1)).toEqual(before.views);
      expect(run(id, instance.input)).toEqual(run(id, before.input));
    }
  });

  it('reserves hidden and conditional geometry and preserves intentional existing overlaps', () => {
    const instance = createDocument('PT').instances[0];
    instance.views = [
      { ...createView('record'), x: 40, y: 40, width: 900, height: 500, hidden: true },
      { ...createView('record'), x: 100, y: 100, when: { kind: 'read', actor: 'T' } },
    ];
    const before = clone(instance), added = placeNewView(instance, createView('record'));
    expect(instance.views.every(old => separated(added, old))).toBe(true);
    expect(separated(instance.views[0], instance.views[1])).toBe(false);
    expect(instance).toEqual(before);
    expect(placeNewView(instance, createView('record', null, 0)).x).toBe(added.x);
  });

  it('excludes only IDs supplied by the caller, keeping lower notes unchanged and out of row counts', () => {
    const instance = createDocument('PT').instances[0], note = instance.views[1];
    Object.assign(note, { x: 40, y: 570, width: 2000, height: 2000, text: 'lower note', hidden: true });
    const a = { ...createView('record'), width: 350, height: 210 }, b = { ...createView('record'), width: 410, height: 350 }, c = createView('record');
    instance.views.push(a, b, c);
    const before = clone(instance), desired = { ...createView('record'), x: 40, y: 570 };
    const withNote = placeNewView(instance, desired), withoutNote = placeNewView(instance, desired, { excludedIds: [note.id] });
    expect(separated(withNote, note)).toBe(true);
    expect(withoutNote.x).toBe(40); expect(withoutNote.y).toBe(570);
    const arranged = arrangeViews(instance, { excludedIds: [note.id] });
    expect(arranged.views.find(view => view.id === note.id)).toEqual(note);
    const visible = arranged.views.filter(view => view.id !== note.id);
    expectDisjoint(visible);
    expect(visible[0].y).toBe(40); expect(visible[2].y).toBe(40); expect(visible[3].y).toBe(570);
    expect(instance).toEqual(before);
  });

  it('uses actual dimensions for explicit rows and is stable across all 21 model arrangements', () => {
    expect(Object.keys(registry)).toHaveLength(21);
    for (const id of Object.keys(registry)) {
      const document = createDocument(id), instance = document.instances[0], before = clone(instance);
      const next = arrangeViews(instance);
      expect(instance).toEqual(before);
      expect(next.input).toEqual(before.input); expect(next.decorations).toEqual(before.decorations);
      if (id !== 'DP') {
        expect(next.views.map(withoutPosition)).toEqual(before.views.map(withoutPosition));
        expectDisjoint(next.views);
      }
      expect(arrangeViews(next)).toEqual(next);
      expect(run(id, next.input)).toEqual(run(id, before.input));
      document.instances[0] = next;
      expect(validateDocument(document)).toBe(true);
    }
    const instance = createDocument('PT').instances[0];
    instance.views = [[900, 500], [270, 180], [400, 650], [110, 80]].map(([width, height]) => ({ ...createView('record'), width, height }));
    const next = arrangeViews(instance);
    expect(next.views.map(({ x, y }) => [x, y])).toEqual([[40, 40], [970, 40], [1270, 40], [40, 720]]);
  });

  it('keeps all 100 maximum-size views in the existing coordinate range without shrinking values', () => {
    const document = createDocument('PT'), instance = document.instances[0];
    instance.views = Array.from({ length: 100 }, (_, i) => ({ ...createView('record'), width: 2000, height: 2000, fields: ['주소공간'], text: `content-${i}` }));
    const before = clone(instance), arranged = arrangeViews(instance);
    expectDisjoint(arranged.views);
    expect(arranged.views.at(-1).y).toBe(67030);
    expect(arranged.views.map(withoutPosition)).toEqual(before.views.map(withoutPosition));
    expect(instance).toEqual(before);
    const occupied = { ...arranged, views: arranged.views.slice(0, -1) };
    const desired = { ...arranged.views.at(-1), x: 40, y: 40 };
    const added = placeNewView(occupied, desired);
    expect(occupied.views.every(old => separated(added, old))).toBe(true);
    expect(added.width).toBe(2000); expect(added.height).toBe(2000); expectGeometry(added);
    document.instances[0] = arranged;
    expect(validateDocument(document)).toBe(true);
  });

  it('places at both coordinate limits and preserves negative, fractional and far-away geometry', () => {
    for (const coordinate of [-100000, 100000]) {
      const instance = createDocument('PT').instances[0];
      instance.views = [{ ...createView('record'), x: coordinate, y: coordinate, width: 2000, height: 2000 }];
      const before = clone(instance), desired = { ...createView('record'), x: coordinate, y: coordinate, width: 2000, height: 2000 };
      const result = placeNewView(instance, desired);
      expectGeometry(result); expect(separated(result, instance.views[0])).toBe(true); expect(instance).toEqual(before);
    }
    const instance = createDocument('PT').instances[0];
    instance.views = [{ ...createView('record'), x: -40.125, y: 60.625, width: 900.5, height: 500.25 }, { ...createView('record'), x: 90000, y: -80000 }];
    const desired = { ...createView('record'), x: 40.125, y: 60.625, width: 270.5, height: 180.25 }, before = clone(instance);
    const first = placeNewView(instance, desired), again = placeNewView(instance, desired);
    expect(first).toEqual(again); expect(first.width).toBe(270.5); expect(first.height).toBe(180.25);
    expect(instance.views.every(old => separated(first, old))).toBe(true); expect(instance).toEqual(before);
  });

  it('rejects invalid draft geometry without mutating existing layouts or silently clamping', () => {
    const instance = createDocument('PT').instances[0], before = clone(instance);
    for (const bad of [{ x: Infinity }, { y: NaN }, { x: 100001 }, { y: -100001 }, { width: 99 }, { height: 59 }, { width: 2001 }, { height: 2001 }]) {
      expect(() => placeNewView(instance, { ...createView('record'), ...bad })).toThrow();
      expect(instance).toEqual(before);
    }
    const invalid = clone(instance); invalid.views[0].x = NaN;
    expect(() => placeNewView(invalid, createView('record'))).toThrow();
    expect(() => arrangeViews(invalid)).toThrow();
    expect(Number.isNaN(invalid.views[0].x)).toBe(true);
  });

  it('retains the existing DP circle, actor/resource dimensions and sidebar spacing', () => {
    const instance = createDocument('DP').instances[0];
    instance.views[0].width = 900; instance.views[0].height = 500; instance.views[0].x = -1000;
    instance.views.push({ ...createView('record'), width: 900, height: 500 });
    const before = clone(instance), next = arrangeViews(instance, { excludedIds: instance.views.map(view => view.id) });
    expect(next.views.map(({ role, x, y, width, height }) => ({ role, x, y, width, height }))).toEqual([
      { role: 'actor', x: 360, y: 60, width: 180, height: 120 },
      { role: 'actor', x: 360, y: 720, width: 180, height: 120 },
      { role: 'resource', x: 584.6, y: 400, width: 140, height: 100 },
      { role: 'resource', x: 175.4, y: 400, width: 140, height: 100 },
      { role: 'relation', x: 930, y: 60, width: 270, height: 180 },
      { role: 'timeline', x: 930, y: 280, width: 270, height: 180 },
      { role: 'annotation', x: 930, y: 500, width: 270, height: 180 },
      { role: 'record', x: 930, y: 720, width: 900, height: 500 },
    ]);
    expect(instance).toEqual(before);
    const added = placeNewView(next, createView('actor', next.input.actors[0]));
    expect(next.views.every(old => separated(added, old))).toBe(true);
  });

  it('keeps all 14 supported actor additions and calculations identical when only placement options differ', () => {
    const supported = [];
    for (const id of Object.keys(registry).filter(id => registry[id].metadata.elements.includes('actor'))) {
      const document = createDocument(id), original = document.instances[0], before = clone(original);
      const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000999');
      try {
        let direct;
        try { direct = addActor(original, 'consumer', { excludedIds: original.views.map(view => view.id) }); }
        catch (error) { if (error.message.includes('입력 설정에서 구성')) continue; throw error; }
        const placed = addActor(original, 'consumer');
        expect(original).toEqual(before);
        expect(placed.views.slice(0, -1)).toEqual(original.views);
        expect(placed.input).toEqual(direct.input);
        expect(run(id, placed.input)).toEqual(run(id, direct.input));
        expect(semanticEntities(placed).actor).toHaveLength(semanticEntities(original).actor.length + 1);
        expect(original.views.every(old => separated(placed.views.at(-1), old))).toBe(true);
        expect(withoutPosition(placed.views.at(-1))).toEqual(withoutPosition(direct.views.at(-1)));
        if (original.input.order) expect(placed.input.order).toEqual(original.input.order);
        if (id === 'PC') expect(placed.input.actors.at(-1).role).toBe('consumer');
        if (id === 'CS') expect(placed.input.pcbs[placed.views.at(-1).target]).toEqual(Object.values(original.input.pcbs)[0]);
        document.instances[0] = placed;
        expect(validateDocument(document)).toBe(true);
        supported.push(id);
      } finally { random.mockRestore(); }
    }
    expect(supported).toHaveLength(14);
  });
});
