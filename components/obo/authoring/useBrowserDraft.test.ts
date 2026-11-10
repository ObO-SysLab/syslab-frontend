import { describe, expect, it } from 'vitest';
import { leavesPage } from './useBrowserDraft';

const here = { href: 'https://diveon.net/challenges/create', origin: 'https://diveon.net', pathname: '/challenges/create', search: '' } as Location;
const click = (href: string | null, patch: Partial<MouseEvent> = {}, link: { target?: string; download?: boolean } = {}) => ({
  defaultPrevented: false, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
  target: { closest: () => href === null ? null : { href: new URL(href, here.href).href, target: link.target ?? '', hasAttribute: (name: string) => name === 'download' && !!link.download } },
  ...patch,
}) as unknown as MouseEvent;

// 2026-11-10 user QA #1: leaving the create page with unkept edits asks first instead of storing them silently.
describe('create page leave guard', () => {
  it('asks for links that leave the page in this tab (출제 취소, logo, profile)', () => {
    expect(leavesPage(click('/challenges'), here)).toBe(true);
    expect(leavesPage(click('/'), here)).toBe(true);
    expect(leavesPage(click('https://example.com/x'), here)).toBe(true);
  });
  it('does not ask for new tabs, downloads, modified clicks, in-page anchors or non-links', () => {
    expect(leavesPage(click('/challenges', {}, { target: '_blank' }), here)).toBe(false);
    expect(leavesPage(click('blob:x', {}, { download: true }), here)).toBe(false);
    expect(leavesPage(click('/challenges', { ctrlKey: true }), here)).toBe(false);
    expect(leavesPage(click('/challenges', { button: 1 }), here)).toBe(false);
    expect(leavesPage(click('#problem-description'), here)).toBe(false);
    expect(leavesPage(click(null), here)).toBe(false);
  });
});
