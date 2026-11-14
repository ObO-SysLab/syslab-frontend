import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { CRITTER_COLORS, CRITTER_KINDS, critterLayers, pickCritter, __test } from './seaCritter';
import { SeaCritter } from '@/components/dv';

const { SPRITES, BUBBLE_SETS, ORDER } = __test;
const combo = (id: number, scope: 'problem' | 'group' = 'problem') => {
  const c = pickCritter(id, scope);
  return `${c.kind}/${c.color.name}`;
};

describe('seaCritter 그림 데이터', () => {
  it('네 생물 모두 16×16이고 정해진 글자만 쓰며 눈이 하나다', () => {
    for (const kind of CRITTER_KINDS) {
      const rows = SPRITES[kind];
      expect(rows).toHaveLength(16);
      for (const row of rows) expect(row).toMatch(/^[.obelw]{16}$/);
      expect(rows.join('').split('e')).toHaveLength(2);
    }
  });

  it('물방울은 그림 안쪽 빈칸에만 놓인다', () => {
    for (const kind of CRITTER_KINDS) {
      for (const set of BUBBLE_SETS[kind]) {
        for (const [x, y] of set) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(16);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThan(16);
          expect(SPRITES[kind][y][x]).toBe('.');
        }
      }
    }
  });

  it('순서표는 0~31을 한 번씩 쓰고, 이웃은 생물·색이 다르다', () => {
    expect([...ORDER].sort((a, b) => a - b)).toEqual([...Array(32).keys()]);
    for (let i = 0; i < 32; i++) {
      const a = ORDER[i], b = ORDER[(i + 1) % 32];
      expect(a % 4).not.toBe(b % 4);
      expect(a >> 2).not.toBe(b >> 2);
    }
  });

  it('색은 8개다', () => {
    expect(CRITTER_COLORS).toHaveLength(8);
    expect(new Set(CRITTER_COLORS.map((c) => c.body)).size).toBe(8);
  });
});

describe('pickCritter', () => {
  it('같은 번호는 언제나 같은 그림이고, 숫자 문자열도 같은 결과다', () => {
    expect(pickCritter(123)).toEqual(pickCritter(123));
    expect(pickCritter('123')).toEqual(pickCritter(123));
    expect(pickCritter(7, 'group')).toEqual(pickCritter('7', 'group'));
  });

  it('번호가 이어지는 32개는 조합이 모두 다르고, 바로 이웃은 생물·색이 다르다', () => {
    for (const scope of ['problem', 'group'] as const) {
      for (const start of [1, 443, 1000]) {
        const seen = new Set<string>();
        for (let id = start; id < start + 32; id++) seen.add(combo(id, scope));
        expect(seen.size).toBe(32);
        for (let id = start; id < start + 31; id++) {
          const a = pickCritter(id, scope), b = pickCritter(id + 1, scope);
          expect(a.kind).not.toBe(b.kind);
          expect(a.color.name).not.toBe(b.color.name);
        }
      }
    }
  });

  it('같은 번호라도 문제와 그룹은 다른 그림이다', () => {
    for (let id = 1; id <= 64; id++) expect(combo(id, 'group')).not.toBe(combo(id));
  });

  it('번호가 없거나 이상해도 그림을 돌려준다', () => {
    for (const id of [null, undefined, '', 'abc', -5, Number.NaN]) {
      const c = pickCritter(id as never);
      expect(CRITTER_KINDS).toContain(c.kind);
      expect(c.label).toMatch(/^\S+ \S+$/);
    }
  });

  it('뒤집힌 그림은 좌우 대칭 자리에 칠한다', () => {
    let id = 1;
    while (!pickCritter(id).flipped) id++;
    const c = pickCritter(id);
    const plain = critterLayers({ ...c, flipped: false, bubbles: [] });
    const flipped = critterLayers({ ...c, bubbles: [] });
    const cells = (layers: typeof plain) =>
      layers.flatMap((l) => [...l.d.matchAll(/M(\d+) (\d+)h(\d+)/g)].flatMap(([, x, y, w]) =>
        Array.from({ length: Number(w) }, (_, i) => `${l.fill}@${Number(x) + i},${y}`))).sort();
    const mirrored = cells(plain).map((s) => s.replace(/@(\d+),/, (_, x) => `@${15 - Number(x)},`)).sort();
    expect(cells(flipped)).toEqual(mirrored);
  });
});

describe('SeaCritter', () => {
  it('바탕색과 생물 종류를 담은 SVG를 그린다', () => {
    const html = renderToStaticMarkup(createElement(SeaCritter, { id: 42, scope: 'group' }));
    const c = pickCritter(42, 'group');
    expect(html).toContain(`data-critter="${c.kind}"`);
    expect(html).toContain(`background:${c.color.water}`);
    expect(html).toContain('viewBox="-1 -1 18 18"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('원형 틀이면 여백을 더 준다', () => {
    const html = renderToStaticMarkup(createElement(SeaCritter, { id: 1, round: true }));
    expect(html).toContain('viewBox="-2.5 -2.5 21 21"');
  });
});
