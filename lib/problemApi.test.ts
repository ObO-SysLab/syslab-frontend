import { afterEach, expect, it, vi } from 'vitest';
import { problemApi } from './problemApi';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('cannot send a local preview request to a configured production API',()=>{
  vi.stubGlobal('window',{location:{hostname:'127.0.0.1'}});
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL','https://diveon.net');
  expect(problemApi('/api/submissions/grade')).toBe('/api/submissions/grade');
});
it('allows an explicitly configured loopback API for local tests',()=>{
  vi.stubGlobal('window',{location:{hostname:'localhost'}});
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL','http://127.0.0.1:8081/');
  expect(problemApi('/api/problems')).toBe('http://127.0.0.1:8081/api/problems');
});
it('keeps the deployed API routing contract',()=>{
  vi.stubGlobal('window',{location:{hostname:'diveon.net'}});
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL','');
  expect(problemApi('/api/problems')).toBe('https://diveon.net/api/problems');
});
