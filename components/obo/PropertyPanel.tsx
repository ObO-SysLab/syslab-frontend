'use client';

interface PropertyPanelProps {
  templateId: string | null;
  params: object | null;
  onChange: (params: object) => void;
}

export function PropertyPanel({ templateId }: PropertyPanelProps) {
  return (
    <div className="w-60 border-l bg-white flex flex-col shrink-0">
      <div className="h-10 border-b flex items-center px-4 shrink-0">
        <span className="text-xs font-bold text-slate-600">속성</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-slate-300">
          {templateId ? '노드를 선택하세요.' : '—'}
        </p>
      </div>
    </div>
  );
}
