'use client';

const fields = [['pc', 'PC'], ['register', '레지스터'], ['stack', '스택']] as const;
type Data = Record<string, unknown>;

export function ProcessDisplayFields({ data, set }: { data: Data; set: (key: string, value: unknown) => void }) {
  const sections = (data.sections ?? []) as { name: string }[];
  const threads = (data.threads ?? []) as { id: string; label: string }[];
  const hiddenSections = (data.hiddenSectionNames ?? []) as string[];
  const hiddenThreads = (data.hiddenThreadIds ?? []) as string[];
  const visibleFields = (data.threadFields ?? fields.map(([key]) => key)) as string[];
  const toggle = (key: string, values: string[], value: string, include: boolean) => set(key, include ? [...values, value] : values.filter(v => v !== value));
  const check = (label: string, checked: boolean, onChange: (checked: boolean) => void) => <label key={label} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><input type="checkbox" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>;
  return <fieldset className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
    <legend className="px-1 text-xs font-semibold text-teal-800">그림에 표시할 내용</legend>
    <p className="text-xs text-slate-500">숨긴 값은 보존됩니다. 설명은 그림 아래에 적으세요.</p>
    {sections.length > 0 && <div><p className="mb-1.5 text-xs font-medium">영역</p><div className="flex flex-wrap gap-1.5">{[...new Set(sections.map(s => s.name))].map(name => check(`${name} 표시`, !hiddenSections.includes(name), checked => toggle('hiddenSectionNames', hiddenSections, name, !checked)))}</div>{new Set(sections.map(s => s.name)).size !== sections.length && <p className="mt-1 text-xs text-slate-500">같은 이름의 영역은 함께 표시됩니다.</p>}</div>}
    {threads.length > 0 && <div><p className="mb-1.5 text-xs font-medium">스레드</p><div className="flex flex-wrap gap-1.5">{threads.map(t => <span key={t.id}>{check(`${t.label} 표시`, !hiddenThreads.includes(t.id), checked => toggle('hiddenThreadIds', hiddenThreads, t.id, !checked))}</span>)}</div></div>}
    <div><p className="mb-1.5 text-xs font-medium">스레드 안의 항목</p><div className="flex flex-wrap gap-1.5">{fields.map(([key, label]) => check(`${label} 표시`, visibleFields.includes(key), checked => toggle('threadFields', visibleFields, key, checked)))}</div></div>
    <div className="grid grid-cols-2 gap-2">{[['sectionLayout', '영역 배치'], ['threadLayout', '스레드 배치']].map(([key, label]) => <label key={key} className="space-y-1 text-xs text-slate-600"><span>{label}</span><select aria-label={label} value={String(data[key] ?? 'row')} onChange={e => set(key, e.target.value)} className="w-full rounded border bg-white p-1.5"><option value="row">가로</option><option value="column">세로</option></select></label>)}</div>
    <label className="block space-y-1 text-xs text-slate-600"><span>프로세스 너비</span><input aria-label="프로세스 너비" type="number" min={280} max={800} step={20} value={String(data.width ?? 360)} onChange={e => set('width', e.target.value)} className="w-full rounded border bg-white p-1.5" /></label>
    {check('공유 관계선 표시', data.showSharedLinks !== false, checked => set('showSharedLinks', checked))}
  </fieldset>;
}
