type TerminalConnectionOptions = {
  probId: number;
  containerId: string;
  token: string | null;
  signal: AbortSignal;
  onReady: (socket: WebSocket) => void;
  onError: () => void;
  onClose: () => void;
};

const RESIZE_PREFIX = [0x00, 0x44, 0x56, 0x52, 0x53]; // "\0DVRS"

/**
 * Binary control frame the terminal server applies as a PTY resize instead of typing it into the shell.
 * Sizes are clamped to the server's accepted range (cols 20-500, rows 5-200).
 */
export function resizeFrame(cols: number, rows: number): Uint8Array {
  const clamp = (value: number, low: number, high: number) =>
    Math.min(high, Math.max(low, Number.isFinite(value) ? Math.floor(value) : low));
  const frame = new Uint8Array(RESIZE_PREFIX.length + 4);
  frame.set(RESIZE_PREFIX);
  const view = new DataView(frame.buffer);
  view.setUint16(RESIZE_PREFIX.length, clamp(cols, 20, 500));
  view.setUint16(RESIZE_PREFIX.length + 2, clamp(rows, 5, 200));
  return frame;
}

export async function connectTerminal(options: TerminalConnectionOptions): Promise<WebSocket> {
  const { probId, containerId, token, signal, onReady, onError, onClose } = options;
  if (!token || !Number.isSafeInteger(probId) || probId <= 0 || !/^[a-f0-9]{64}$/.test(containerId)) {
    throw new Error('터미널 접속 정보를 확인해주세요.');
  }
  const response = await fetch('https://diveon.net/api/vm/terminal-ticket', {
    method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ probId, containerId }),
  });
  if (!response.ok) throw new Error('터미널 접속 권한을 확인할 수 없습니다.');
  const grant = await response.json();
  signal.throwIfAborted();
  if (!/^[A-Za-z0-9_-]{43}$/.test(grant.ticket || '') || !Number.isSafeInteger(grant.expiresAt)
      || grant.expiresAt <= Date.now()) throw new Error('터미널 접속권이 만료되었습니다.');

  // Neither the login token nor the one-use ticket appears in the URL.
  const socket = new WebSocket(`wss://diveon.net/ws/terminal?container_id=${encodeURIComponent(containerId)}`);
  let ticket: string | null = grant.ticket;
  let ready = false;
  const abort = () => { ticket = null; clearTimeout(timer); socket.close(); };
  const fail = () => { onError(); abort(); };
  const timer = setTimeout(fail, 8000);
  signal.addEventListener('abort', abort, { once: true });
  socket.onopen = () => {
    if (signal.aborted || !ticket) return abort();
    socket.send(JSON.stringify({ type: 'auth', ticket }));
    ticket = null;
  };
  socket.onmessage = event => {
    if (ready || signal.aborted) return;
    try {
      const message = JSON.parse(event.data);
      if (message.type !== 'ready' || Object.keys(message).length !== 1) return fail();
      ready = true; clearTimeout(timer); socket.onmessage = null;
      onReady(socket);
    } catch { fail(); }
  };
  socket.onerror = () => { if (!signal.aborted) fail(); };
  socket.onclose = () => {
    clearTimeout(timer); ticket = null; signal.removeEventListener('abort', abort);
    if (!signal.aborted) onClose();
  };
  return socket;
}
