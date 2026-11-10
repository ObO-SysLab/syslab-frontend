export const CODE_SNIPPETS: Record<string, string> = {
  c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
  python: 'def solution():\n    pass\n\nif __name__ == "__main__":\n    solution()',
};
export type CodeContext = { account: string | null; kind: 'challenge' | 'contest'; problem: string; contest?: string; contestProblem?: string };
export type CodeRecord = { v: 1; id: string; scope: string; language: string; code: string; savedAt: string; version: string | null };
type BufferValue = { code: string; key: string; dirty: boolean; savedAt: string | null; version: string | null };

export function codeScope(context: CodeContext): string | null {
  if (!context.account || !context.problem || (context.kind === 'contest' && (!context.contest || !context.contestProblem))) return null;
  return 'diveon:code-draft:v1:' + [context.account, context.kind, context.contest ?? '', context.contestProblem ?? '', context.problem].map(encodeURIComponent).join(':') + ':';
}

/** Each editing visit owns its keys. Other tabs' records are never overwritten. */
export class CodeDraftSession {
  readonly scope: string | null;
  language = 'c';
  version: string | null = null;
  error = '';
  warning = '';
  candidates: CodeRecord[] = [];
  private buffers = new Map<string, BufferValue>();
  private starter: (language: string) => string = language => CODE_SNIPPETS[language];
  constructor(context: CodeContext, private storage: () => Storage, private uuid: () => string = () => crypto.randomUUID()) {
    this.scope = codeScope(context);
  }
  private buffer(language = this.language): BufferValue {
    let buffer = this.buffers.get(language);
    if (!buffer) {
      buffer = { code: this.starter(language), key: `${this.scope}${language}:${this.uuid()}`, dirty: false, savedAt: null, version: this.version };
      this.buffers.set(language, buffer);
    }
    return buffer;
  }
  get code() { return this.buffer().code; }
  get savedAt() { return this.buffer().savedAt; }
  get dirty() { return [...this.buffers.values()].some(buffer => buffer.dirty); }
  get versionChanged() { const v = this.buffer().version; return v !== null && this.version !== null && v !== this.version; }
  edit(code: string) {
    const buffer = this.buffer();
    if (buffer.code !== code) { buffer.code = code; buffer.dirty = true; }
  }
  select(language: string) {
    if (!Object.prototype.hasOwnProperty.call(CODE_SNIPPETS, language)) return;
    this.flush();
    this.language = language;
    this.scan();
  }
  /** The problem's first code (2026-11-10). Buffers never edited or kept switch to it; written code stays. */
  setStarter(starter: (language: string) => string) {
    const previous = this.starter;
    this.starter = starter;
    for (const [language, buffer] of this.buffers)
      if (!buffer.dirty && buffer.savedAt === null && buffer.code === previous(language)) buffer.code = starter(language);
  }
  setVersion(version: string | null) {
    this.version = version;
    for (const buffer of this.buffers.values()) if (buffer.version === null) buffer.version = version;
  }
  flush(): boolean {
    if (!this.scope) return !this.dirty;
    try {
      for (const [language, buffer] of this.buffers) {
        if (!buffer.dirty) continue;
        const record: CodeRecord = { v: 1, id: buffer.key, scope: this.scope, language, code: buffer.code, version: buffer.version, savedAt: new Date().toISOString() };
        this.storage().setItem(record.id, JSON.stringify(record));
        buffer.savedAt = record.savedAt;
        buffer.dirty = false;
      }
      this.error = '';
      return true;
    } catch {
      this.error = '브라우저 보관 실패. 코드는 화면에 유지됩니다. 파일로 저장해 주세요.';
      return false;
    }
  }
  scan() {
    this.candidates = [];
    this.warning = '';
    if (!this.scope) return;
    try {
      const storage = this.storage();
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)!;
        if (!key.startsWith(this.scope)) continue;
        try {
          const r = JSON.parse(storage.getItem(key)!);
          if (r.v !== 1 || r.scope !== this.scope || r.id !== key || !Object.prototype.hasOwnProperty.call(CODE_SNIPPETS, r.language) || !key.startsWith(`${this.scope}${r.language}:`) || typeof r.code !== 'string' || typeof r.savedAt !== 'string' || !Number.isFinite(Date.parse(r.savedAt)) || !(r.version === null || typeof r.version === 'string')) throw Error();
          if (![...this.buffers.values()].some(buffer => buffer.key === key)) this.candidates.push(r);
        } catch { this.warning = '읽을 수 없는 초안이 있습니다. 원본은 삭제하지 않았습니다.'; }
      }
      this.candidates.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    } catch { this.error = '브라우저 보관함에 접근하지 못했습니다. 파일로 저장해 주세요.'; }
  }
  recover(record: CodeRecord): boolean {
    if (!this.scope || record.scope !== this.scope || !this.candidates.some(r => r.id === record.id)) return false;
    // Preserve even an unsaved starter before replacing the current buffer.
    this.buffer(record.language).dirty = true;
    if (!this.flush()) return false;
    const buffer = this.buffer(record.language);
    buffer.key = `${this.scope}${record.language}:${this.uuid()}`;
    buffer.code = record.code; buffer.version = record.version; buffer.dirty = true; buffer.savedAt = null;
    this.language = record.language;
    this.flush(); this.scan();
    return true;
  }
  reset(): boolean {
    const buffer = this.buffer();
    if (this.scope) {
      buffer.dirty = true;
      if (!this.flush()) return false;
      buffer.key = `${this.scope}${this.language}:${this.uuid()}`;
    }
    buffer.code = this.starter(this.language); buffer.version = this.version; buffer.dirty = false; buffer.savedAt = null;
    this.scan(); return true;
  }
  deleteSaved(): boolean {
    if (!this.scope) return false;
    try {
      const storage = this.storage();
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i)!;
        if (key.startsWith(this.scope)) storage.removeItem(key);
      }
      for (const buffer of this.buffers.values()) { buffer.dirty = false; buffer.savedAt = null; }
      this.error = ''; this.scan(); return true;
    } catch { this.error = '초안을 모두 삭제하지 못했습니다. 보관함 접근 권한을 확인해 주세요.'; this.scan(); return false; }
  }
}
