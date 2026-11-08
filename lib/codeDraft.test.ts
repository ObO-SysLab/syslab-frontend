import { describe, expect, it } from 'vitest';
import { CodeDraftSession, codeScope, CODE_SNIPPETS, type CodeContext } from './codeDraft';
import { clearAuthentication, draftAccount, pendingSubmissionKey } from './authSession';

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  fail = false;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw Error('quota'); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
const context: CodeContext = { account: 'alice', kind: 'challenge', problem: '1' };
let sequence = 0;
const open = (store: MemoryStorage, value = context) => new CodeDraftSession(value, () => store, () => `visit-${sequence++}`);

describe('coding draft preservation', () => {
  it('separates account, problem, contest and ambiguous separators', () => {
    const contexts: CodeContext[] = [context, {...context, account:'bob'}, {...context, problem:'2'}, {...context,kind:'contest',contest:'1',contestProblem:'1'}, {...context,kind:'contest',contest:'2',contestProblem:'1'}, {...context,account:'a:b',problem:'c'}, {...context,account:'a',problem:'b:c'}];
    expect(new Set(contexts.map(codeScope)).size).toBe(contexts.length);
    expect(codeScope({...context,account:null})).toBeNull();
    expect(codeScope({...context,kind:'contest'})).toBeNull();
  });
  it('preserves separate language buffers including intentionally empty code', () => {
    const store=new MemoryStorage(), draft=open(store);
    draft.edit('C source'); draft.select('python'); draft.edit(''); draft.select('c');
    expect(draft.code).toBe('C source'); draft.select('python'); expect(draft.code).toBe('');
    const next=open(store); next.scan(); expect(next.candidates.map(r=>r.code).sort()).toEqual(['','C source']);
  });
  it('keeps both concurrent tabs and checkpoints the current code before recovery', () => {
    const store=new MemoryStorage(), a=open(store), b=open(store);
    a.edit('tab A'); b.edit('tab B'); a.flush(); b.flush(); a.scan();
    expect(a.candidates).toHaveLength(1); expect(a.recover(a.candidates[0])).toBe(true);
    expect(a.code).toBe('tab B');
    const next=open(store); next.scan();
    expect(next.candidates.map(r=>r.code).sort()).toEqual(['tab A','tab B','tab B']);
  });
  it('does not replace code on quota failure or pretend a save succeeded', () => {
    const store=new MemoryStorage(), a=open(store), b=open(store);
    b.edit('old'); b.flush(); a.scan(); a.edit('valuable current'); store.fail=true;
    expect(a.flush()).toBe(false); expect(a.savedAt).toBeNull(); expect(a.dirty).toBe(true);
    expect(a.recover(a.candidates[0])).toBe(false); expect(a.code).toBe('valuable current');
    store.fail=false; expect(a.flush()).toBe(true); expect(a.error).toBe('');
  });
  it('reports unreadable or malformed records without deleting them', () => {
    const store=new MemoryStorage(), a=open(store), key=`${a.scope}c:bad`;
    store.setItem(key,'{broken'); a.scan(); expect(a.warning).not.toBe(''); expect(store.getItem(key)).toBe('{broken');
    store.setItem(key,JSON.stringify({v:1,scope:a.scope,id:key,language:'unknown',code:'x',savedAt:new Date().toISOString(),version:null}));
    a.scan(); expect(a.candidates).toHaveLength(0); expect(store.length).toBe(1);
  });
  it('reports inaccessible storage and keeps editable code', () => {
    const a=new CodeDraftSession(context,()=>{throw Error('denied');},()=> 'tab');
    a.scan(); expect(a.error).not.toBe(''); a.edit('keep'); expect(a.flush()).toBe(false); expect(a.code).toBe('keep');
  });
  it('does not read or save account drafts when anonymous', () => {
    const a=new CodeDraftSession({...context,account:null},()=>{throw Error('must not touch');},()=> 'tab');
    a.scan(); a.edit('guest'); a.select('python'); a.select('c'); expect(a.code).toBe('guest'); expect(a.candidates).toEqual([]);
  });
  it('preserves the old version and warns after recovering against a new problem', () => {
    const store=new MemoryStorage(), old=open(store); old.setVersion('v1'); old.edit('v1 code'); old.flush();
    const current=open(store); current.setVersion('v2'); current.scan(); current.recover(current.candidates[0]);
    expect(current.versionChanged).toBe(true); current.edit('changed'); current.flush(); expect(current.versionChanged).toBe(true);
  });
  it('preserves old code on reset and deletes only the explicitly selected context', () => {
    const store=new MemoryStorage(), a=open(store), b=open(store,{...context,account:'bob'});
    a.edit('old A'); b.edit('B'); b.flush(); expect(a.reset()).toBe(true); expect(a.code).toBe(CODE_SNIPPETS.c);
    a.scan(); expect(a.candidates[0].code).toBe('old A'); a.edit('visible'); a.flush();
    expect(a.deleteSaved()).toBe(true); expect(a.code).toBe('visible'); expect(a.dirty).toBe(false);
    const next=open(store); next.scan(); expect(next.candidates).toEqual([]);
    const bob=open(store,{...context,account:'bob'}); bob.scan(); expect(bob.candidates[0].code).toBe('B');
  });
});

describe('authentication-only logout', () => {
  it('namespaces pending receipts by the submitting account even after switching accounts', () => {
    const token=(sub:string)=>`fixture.${btoa(JSON.stringify({sub}))}.fixture`;
    expect(pendingSubmissionKey('12',token('alice'))).not.toBe(pendingSubmissionKey('12',token('bob')));
    expect(pendingSubmissionKey('12',null)).toBeNull();
  });
  it('removes the actual auth keys and pending markers, preserving code/OBO/preferences', () => {
    const local=new MemoryStorage(), session=new MemoryStorage();
    for(const key of ['token','nickname','userImgUrl','obo:problem-draft:v1:alice:new:1','diveon:code-draft:v1:alice:challenge:::1:c:1','theme'])local.setItem(key,'keep');
    for(const key of ['obo:preview:token','pending_sub_1','unrelated'])session.setItem(key,'keep');
    clearAuthentication(local,session);
    expect([...local.values.keys()]).toEqual(['obo:problem-draft:v1:alice:new:1','diveon:code-draft:v1:alice:challenge:::1:c:1','theme']);
    expect([...session.values.keys()]).toEqual(['unrelated']);
  });
  it('only namespaces drafts by a usable account identifier', () => {
    expect(draftAccount(null)).toBeNull(); expect(draftAccount('broken')).toBeNull();
    expect(draftAccount(`fixture.${btoa(JSON.stringify({sub:'alice'}))}.fixture`)).toBe('alice');
    expect(draftAccount(`fixture.${btoa(JSON.stringify({sub:{}}))}.fixture`)).toBeNull();
  });
});
