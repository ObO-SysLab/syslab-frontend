import { describe, expect, it } from 'vitest';
import { authBootScript, tokenExpired, tokenExpiresAt } from './authToken';

const NOW = Date.UTC(2026, 10, 14, 9, 0, 0);
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

class MemoryStorage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(i: number) { return [...this.values.keys()][i] ?? null; }
  getItem(k: string) { return this.values.get(k) ?? null; }
  setItem(k: string, v: string) { this.values.set(k, v); }
  removeItem(k: string) { this.values.delete(k); }
}

function boot(token: string | null) {
  const local = new MemoryStorage(), session = new MemoryStorage();
  if (token) local.setItem('token', token);
  local.setItem('nickname', 'diver'); local.setItem('userImgUrl', 'a.png'); local.setItem('diveon:theme', 'light');
  session.setItem('obo:preview:token', 'p'); session.setItem('pending_sub_7:12', '99'); session.setItem('other', 'x');
  const RealDate = Date;
  const FixedDate = class extends RealDate { static now() { return NOW; } };
  new Function('localStorage', 'sessionStorage', 'Date', authBootScript)(local, session, FixedDate);
  return { local, session };
}

describe('expired sign-in', () => {
  it('reads exp from a base64url JWT payload', () => {
    expect(tokenExpiresAt(jwt({ sub: '7', exp: NOW / 1000 + 60 }))).toBe(NOW + 60_000);
    expect(tokenExpiresAt('mock-access-token')).toBeNull();
    expect(tokenExpiresAt(jwt({ sub: '7' }))).toBeNull();
    expect(tokenExpiresAt(null)).toBeNull();
  });

  it('treats only a readable, passed (or about to pass) exp as expired', () => {
    expect(tokenExpired(jwt({ exp: NOW / 1000 - 1 }), NOW)).toBe(true);
    expect(tokenExpired(jwt({ exp: NOW / 1000 + 10 }), NOW)).toBe(true);
    expect(tokenExpired(jwt({ exp: NOW / 1000 + 3600 }), NOW)).toBe(false);
    expect(tokenExpired('mock-access-token', NOW)).toBe(false);
    expect(tokenExpired(jwt({ sub: '7' }), NOW)).toBe(false);
  });

  it('boot script signs out an expired token before the page renders', () => {
    const { local, session } = boot(jwt({ sub: '7', exp: NOW / 1000 - 3600 }));
    expect(local.getItem('token')).toBeNull();
    expect(local.getItem('nickname')).toBeNull();
    expect(local.getItem('userImgUrl')).toBeNull();
    expect(local.getItem('diveon:theme')).toBe('light');
    expect(session.getItem('obo:preview:token')).toBeNull();
    expect(session.getItem('pending_sub_7:12')).toBeNull();
    expect(session.getItem('other')).toBe('x');
  });

  it('boot script keeps a valid token, a mock token and an empty session untouched', () => {
    for (const token of [jwt({ sub: '7', exp: NOW / 1000 + 3600 }), 'mock-access-token']) {
      const { local, session } = boot(token);
      expect(local.getItem('token')).toBe(token);
      expect(local.getItem('nickname')).toBe('diver');
      expect(session.getItem('pending_sub_7:12')).toBe('99');
    }
    expect(boot(null).local.getItem('nickname')).toBe('diver');
  });
});
