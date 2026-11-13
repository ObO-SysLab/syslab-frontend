import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectTerminal, resizeFrame } from './terminal-connection';

class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => this.onclose?.());
  constructor(public url: string) { FakeSocket.instances.push(this); }
}
const cid = 'a'.repeat(64), ticket = 't'.repeat(43);
function options() {
  const controller = new AbortController();
  return { probId: 9, containerId: cid, token: 'login-token', signal: controller.signal,
    controller, onReady: vi.fn(), onError: vi.fn(), onClose: vi.fn() };
}
beforeEach(() => {
  vi.useFakeTimers(); FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true,
    json: async () => ({ ticket, expiresAt: Date.now() + 30000 }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('terminal authentication contract shared by practice and contest', () => {
  it('login uses Authorization header, ticket uses first message, input waits for ready', async () => {
    const opts = options(); await connectTerminal(opts); const ws = FakeSocket.instances[0];
    expect(fetch).toHaveBeenCalledWith('https://diveon.net/api/vm/terminal-ticket', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer login-token' }),
      body: JSON.stringify({ probId: 9, containerId: cid }),
    }));
    expect(ws.url).toBe(`wss://diveon.net/ws/terminal?container_id=${cid}`);
    ws.onopen?.(); expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'auth', ticket }));
    expect(opts.onReady).not.toHaveBeenCalled();
    ws.onmessage?.({ data: '{"type":"ready"}' }); expect(opts.onReady).toHaveBeenCalledWith(ws);
    opts.controller.abort();
  });
  it('missing login or invalid target never fetches or opens a socket', async () => {
    await expect(connectTerminal({ ...options(), token: null })).rejects.toThrow();
    await expect(connectTerminal({ ...options(), containerId: '--help' })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled(); expect(FakeSocket.instances).toHaveLength(0);
  });
  it('rejected or expired ticket never opens a socket', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await expect(connectTerminal(options())).rejects.toThrow();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ticket, expiresAt: Date.now() }) } as Response);
    await expect(connectTerminal(options())).rejects.toThrow();
    expect(FakeSocket.instances).toHaveLength(0);
  });
  it('unmount during ticket fetch prevents late socket creation', async () => {
    const opts = options(); opts.controller.abort();
    await expect(connectTerminal(opts)).rejects.toThrow(); expect(FakeSocket.instances).toHaveLength(0);
  });
  it('malformed ready and handshake timeout close without attaching terminal', async () => {
    const opts = options(); await connectTerminal(opts);
    FakeSocket.instances[0].onmessage?.({ data: 'unexpected shell output' });
    expect(opts.onReady).not.toHaveBeenCalled(); expect(FakeSocket.instances[0].close).toHaveBeenCalled();
    const second = options(); await connectTerminal(second); vi.advanceTimersByTime(8000);
    expect(second.onError).toHaveBeenCalled(); expect(second.onReady).not.toHaveBeenCalled();
    expect(FakeSocket.instances[1].close).toHaveBeenCalled();
  });
  it('unmount closes pending or authenticated connection and suppresses callbacks', async () => {
    const opts = options(); await connectTerminal(opts); const ws = FakeSocket.instances[0];
    opts.controller.abort(); ws.onopen?.(); ws.onmessage?.({ data: '{"type":"ready"}' });
    expect(ws.send).not.toHaveBeenCalled(); expect(opts.onReady).not.toHaveBeenCalled();
    expect(opts.onClose).not.toHaveBeenCalled(); expect(ws.close).toHaveBeenCalled();
  });
});

describe('terminal resize control frame', () => {
  it('encodes the prefix and big-endian size the terminal server reads', () => {
    expect([...resizeFrame(132, 40)]).toEqual([0, 0x44, 0x56, 0x52, 0x53, 0, 132, 0, 40]);
  });
  it('clamps to the server range so the frame is never ignored', () => {
    const size = (frame: Uint8Array) => [new DataView(frame.buffer).getUint16(5), new DataView(frame.buffer).getUint16(7)];
    expect(size(resizeFrame(5, 1))).toEqual([20, 5]);
    expect(size(resizeFrame(9999, 9999))).toEqual([500, 200]);
    expect(size(resizeFrame(Number.NaN, 30.7))).toEqual([20, 30]);
  });
});
