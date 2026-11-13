// Same name rule and limit as the backend (PracticeCommandPolicy) and the image build script.
const NAME = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$/;
export const MAX_COMMANDS = 30;

export type AllowlistInput = { names: string[] } | { error: string };

export const isCommandName = (value: unknown): value is string => typeof value === 'string' && NAME.test(value);

/** Author input split on commas or spaces. No names means the practice is unrestricted. */
export function parseCommandAllowlist(input: string): AllowlistInput {
  const names = [...new Set(input.split(/[\s,]+/).filter(Boolean))].sort();
  const invalid = names.find(name => !NAME.test(name));
  if (invalid) return { error: `명령어 이름만 입력해 주세요: ${invalid}` };
  if (names.length > MAX_COMMANDS) return { error: `허용 명령어는 ${MAX_COMMANDS}개까지 입력할 수 있습니다.` };
  return { names };
}

/** Commands the practice image allows, from a problem's vmInfo; null when it is unrestricted. */
export function readCommandAllowlist(vmInfo: unknown): string[] | null {
  const list = (vmInfo as { commandAllowlist?: unknown } | null | undefined)?.commandAllowlist;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.every(name => typeof name === 'string' && NAME.test(name)) ? list : null;
}
