// 설정 > 능력치 차트: /api/profile/category-stats는 같은 분야를 표기만 다르게 따로 내려준다
// (예: "FileSystem": 0, "file system": 10, "Memory": 0, "memory": 50). 소문자·공백 제거 키로 모아 합친다.
export function mergeCategoryScores(raw: Record<string, unknown> | null | undefined): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    const k = key.toLowerCase().replace(/[\s_-]/g, "");
    merged[k] = (merged[k] ?? 0) + (Number(value) || 0);
  }
  return merged;
}
