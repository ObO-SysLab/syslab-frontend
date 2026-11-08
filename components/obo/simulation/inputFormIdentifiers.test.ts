import { createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument, validateDocument } from '../runtime/document.mjs';
import { registry } from '../runtime/index.mjs';
import type { Json } from '../runtime/index.mjs';
import { InputForm } from './InputForm';
import type { FieldSchema } from './InputForm';

const pcbSchema = (registry.CS.inputSchema as FieldSchema).properties!.pcbs;

// Only direct event tests supply hook state. SSR tests use React's real hooks.
const hookState = vi.hoisted(() => ({ enabled: false, key: '' }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useState: (initial: unknown) => hookState.enabled
    ? [typeof initial === 'string' ? hookState.key : initial, vi.fn()]
    : actual.useState(initial) };
});
afterEach(() => { hookState.enabled = false; vi.restoreAllMocks(); });
function elements(node: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

describe('InputForm preserves valid own identifiers and nested schemas', () => {
  it.each(['toString', 'valueOf', 'hasOwnProperty'])('renders the nested numeric PCB for %s', id => {
    const doc = createDocument('CS');
    doc.instances[0].input = { pcbs: { [id]: { pc: 17 } }, initialId: id, order: [] };
    expect(validateDocument(doc)).toBe(true);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToStaticMarkup(createElement(InputForm, { schema: registry.CS.inputSchema, value: doc.instances[0].input, onChange() {} }));
    expect(html).toContain(`>${id}</legend>`);
    expect(html).toMatch(/<input[^>]*aria-label="pc"[^>]*type="number"[^>]*value="17"/);
    expect(error).not.toHaveBeenCalled();
  });

  it('retains boolean/null/string inputs inside a valid PT shared map', () => {
    const doc = createDocument('PT');
    doc.instances[0].input = { spaces: { toString: { valueOf: false, hasOwnProperty: null, note: 'text' } }, threads: { T: { process: 'toString', registers: {}, stack: [] } }, operations: [] };
    expect(validateDocument(doc)).toBe(true);
    const html = renderToStaticMarkup(createElement(InputForm, { schema: registry.PT.inputSchema, value: doc.instances[0].input, onChange() {} }));
    expect(html).toContain('>toString</legend>');
    expect(html).toContain('valueOf'); expect(html).toContain('type="checkbox"');
    expect(html).toMatch(/<select aria-label="hasOwnProperty 값 종류"[^>]*>[^]*?<option value="3" selected="">없음<\/option><\/select>/);
    expect(html).toContain('value="text"');
    expect(html).not.toContain('[native code]');
  });

  it.each(['toString', 'valueOf', 'hasOwnProperty'])('adds the allowed new key %s using the actual button handler', id => {
    hookState.enabled = true; hookState.key = id;
    let changed: Json | undefined;
    const form = InputForm({ schema: pcbSchema, value: {}, onChange(value) { changed = value; } });
    const button = elements(form).find(node => node.type === 'button' && node.props.children === '추가')!;
    expect(button.props.disabled).toBe(false);
    (button.props.onClick as () => void)();
    expect(changed).toEqual({ [id]: {} });
    const doc = createDocument('CS');
    doc.instances[0].input = { pcbs: changed!, initialId: id, order: [] };
    expect(validateDocument(doc)).toBe(true);
  });

  it.each(['constructor', 'prototype', '__proto__'])('keeps the forbidden new key %s disabled', id => {
    hookState.enabled = true; hookState.key = id;
    const onChange = vi.fn();
    const form = InputForm({ schema: pcbSchema, value: {}, onChange });
    const button = elements(form).find(node => node.type === 'button' && node.props.children === '추가')!;
    expect(button.props.disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still blocks a real own duplicate and preserves optional missing-field state', () => {
    hookState.enabled = true; hookState.key = 'toString';
    const form = InputForm({ schema: pcbSchema, value: { toString: {} }, onChange() {} });
    expect(elements(form).find(node => node.type === 'button' && node.props.children === '추가')!.props.disabled).toBe(true);
    const optional = InputForm({ schema: { type: 'object', properties: { toString: { type: 'integer' } }, required: [] }, value: {}, onChange() {} });
    const checkbox = elements(optional).find(node => node.type === 'input' && node.props.type === 'checkbox')!;
    expect(checkbox.props.checked).toBe(false);
  });
});
