import { describe, expect, it } from 'vitest';
import { MAX_COMMANDS, parseCommandAllowlist, readCommandAllowlist } from './command-allowlist';

describe('author allowlist input', () => {
  it('splits on commas and spaces into sorted unique names', () => {
    expect(parseCommandAllowlist(' ls, cat  strings,ls\nxxd ')).toEqual({ names: ['cat', 'ls', 'strings', 'xxd'] });
  });
  it('treats empty input as unrestricted', () => {
    expect(parseCommandAllowlist('')).toEqual({ names: [] });
    expect(parseCommandAllowlist(' , ,')).toEqual({ names: [] });
  });
  it.each(['/bin/ls', '-rf', 'ls;id', '$(id)', '명령', 'a'.repeat(33)])('rejects %s', value => {
    expect(parseCommandAllowlist(value)).toHaveProperty('error');
  });
  it('allows up to the backend limit', () => {
    const names = Array.from({ length: MAX_COMMANDS + 1 }, (_, i) => `c${i}`);
    expect(parseCommandAllowlist(names.slice(0, MAX_COMMANDS).join(','))).toHaveProperty('names');
    expect(parseCommandAllowlist(names.join(','))).toHaveProperty('error');
  });
});

describe('allowlist from a problem response', () => {
  it('reads the restricted commands', () => {
    expect(readCommandAllowlist({ osImage: 'ubuntu:22.04', commandAllowlist: ['cat', 'ls'] })).toEqual(['cat', 'ls']);
  });
  it.each([undefined, null, {}, { commandAllowlist: null }, { commandAllowlist: [] }, { allowedCommands: ['ls'] },
    { commandAllowlist: ['ls', 7] }, { commandAllowlist: ['<b>x</b>'] }])('is unrestricted for %j', value => {
    expect(readCommandAllowlist(value)).toBeNull();
  });
});
