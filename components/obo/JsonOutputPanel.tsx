'use client';

import { X } from 'lucide-react';

interface JsonOutputPanelProps {
  params: object | null;
  templateId: string | null;
  onClose: () => void;
}

export function JsonOutputPanel({ params, templateId, onClose }: JsonOutputPanelProps) {
  return (
    <div className="w-80 border-l bg-white flex flex-col shrink-0">
      <div className="h-10 border-b flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-bold text-slate-600">JSON 출력</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
          {JSON.stringify({ templateId, params }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
