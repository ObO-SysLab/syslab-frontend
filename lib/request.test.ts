import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpIssue, requestIssue, requestJson, RequestFailure, safeReturnPath, loginHref } from './request';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('safe request handling without automatic retries',()=>{
  it.each([401,403,404,429,500])('classifies HTTP %i even when its body is HTML or sensitive text',async status=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('secret-token and stack trace <html>',{status,headers:{'Retry-After':'12'}}));
    vi.stubGlobal('fetch',fetcher);
    const error=await requestJson('/api/resource').catch(error=>error as RequestFailure);
    expect(error.issue.status).toBe(status);expect(error.message).not.toContain('secret');expect(fetcher).toHaveBeenCalledTimes(1);
    if(status===429)expect(error.message).toContain('12초');
  });
  it('distinguishes an empty valid array from a malformed success response',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('{"data":[]}')).mockResolvedValueOnce(new Response('<html>bad gateway</html>')));
    expect(await requestJson('/api/resource')).toEqual({data:[]});
    await expect(requestJson('/api/resource')).rejects.toMatchObject({issue:{kind:'format'}});
  });
  it('treats a missing mutation receipt as uncertain and never repeats the POST',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('<html>unexpected</html>'));
    vi.stubGlobal('fetch',fetcher);
    await expect(requestJson('/api/save',{method:'POST'})).rejects.toMatchObject({issue:{uncertain:true,kind:'format'}});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('records uncertainty for connection loss or server errors during writes',async()=>{
    vi.stubGlobal('navigator',{onLine:true});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('private details')));
    await expect(requestJson('/api/save',{method:'PATCH'})).rejects.toMatchObject({issue:{kind:'network',uncertain:true}});
    expect(httpIssue(500,true).uncertain).toBe(true);expect(httpIssue(403,true).uncertain).toBe(false);
  });
  it('distinguishes offline status without leaking exception messages',()=>{
    vi.stubGlobal('navigator',{onLine:false});const issue=requestIssue(new Error('token'));
    expect(issue.kind).toBe('offline');expect(issue.message).not.toContain('token');
  });
  it('times out a stalled body as well as a stalled connection, with one request',async()=>{
    vi.useFakeTimers();const fetcher=vi.fn().mockResolvedValue({ok:true,text:()=>new Promise(()=>{})});vi.stubGlobal('fetch',fetcher);
    const outcome=requestJson('/api/save',{method:'POST'},{timeoutMs:100}).catch(error=>error);
    await vi.advanceTimersByTimeAsync(101);
    expect(await outcome).toMatchObject({issue:{kind:'timeout',uncertain:true}});
    await vi.advanceTimersByTimeAsync(10000);expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('makes deliberate cancellation distinct from errors even for a transport ignoring abort',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Promise(()=>{})));
    const controller=new AbortController();const outcome=requestJson('/api/old',{signal:controller.signal}).catch(error=>error);
    controller.abort();expect((await outcome).name).toBe('AbortError');
  });
  it('allows an intentionally empty OBO response only when requested',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:200})));
    expect(await requestJson('/api/obo',{}, {allowEmpty:true})).toBeNull();
  });
});
describe('return to the editing page after login',()=>{
  it('keeps local queries while rejecting external and control-character destinations',()=>{
    expect(safeReturnPath('/challenges/editor?id=98')).toBe('/challenges/editor?id=98');
    for(const input of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/\n/evil.example'])expect(safeReturnPath(input)).toBe('/');
    expect(loginHref('/contests/editor?contestId=7&probId=98')).toBe('/signin?next=%2Fcontests%2Feditor%3FcontestId%3D7%26probId%3D98');
  });
});
