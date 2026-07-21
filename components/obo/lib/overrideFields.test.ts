import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { exampleStateValue } from './overrideFields';

function node(type: string, data: Record<string, unknown>): Node {
  return { id: 'x', type, position: { x: 0, y: 0 }, data };
}

describe('exampleStateValue', () => {
  it('text-label → quoted string, falling back to a default when text is empty', () => {
    expect(typeof JSON.parse(exampleStateValue(node('text-label', { text: '' }))!)).toBe('string');
    expect(JSON.parse(exampleStateValue(node('text-label', { text: 'hi' }))!)).toBe('hi');
  });

  it('counter-badge → a plain number', () => {
    const parsed = JSON.parse(exampleStateValue(node('counter-badge', { value: 5 }))!);
    expect(typeof parsed).toBe('number');
    expect(parsed).toBe(5);
  });

  it('slot-grid → an array of null matching slotCount', () => {
    const parsed = JSON.parse(exampleStateValue(node('slot-grid', { slotCount: 4 }))!);
    expect(parsed).toEqual([null, null, null, null]);
  });

  it('slot-grid falls back to slots.length when slotCount is missing', () => {
    const parsed = JSON.parse(exampleStateValue(node('slot-grid', { slots: [1, 2] }))!);
    expect(parsed).toHaveLength(2);
  });

  it('gantt-lane → an array containing one block-shaped object', () => {
    const parsed = JSON.parse(exampleStateValue(node('gantt-lane', {}))!);
    expect(parsed).toEqual([{ start: expect.any(Number), end: expect.any(Number), colorKey: expect.any(String) }]);
  });

  it('node types with no state field return null', () => {
    expect(exampleStateValue(node('state-node', {}))).toBeNull();
    expect(exampleStateValue(node('resource-square', {}))).toBeNull();
    expect(exampleStateValue(node('line-chart', {}))).toBeNull();
  });
});
