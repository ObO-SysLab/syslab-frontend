'use client';

import { useState } from 'react';
import { OBO_TEMPLATES, CATEGORIES, type OBOTemplate } from './templates';
import { Badge } from '@/components/ui/badge';

interface TemplateSidebarProps {
  selectedTemplateId: string | null;
  onSelect: (template: OBOTemplate) => void;
}

export function TemplateSidebar({ selectedTemplateId, onSelect }: TemplateSidebarProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? OBO_TEMPLATES
    : OBO_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="w-60 border-r bg-white flex flex-col shrink-0 overflow-hidden">
      {/* 카테고리 탭 */}
      <div className="p-3 border-b shrink-0">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 템플릿 카드 목록 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(template => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {template.id}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${
                    isSelected ? 'border-indigo-300 text-indigo-500' : 'text-slate-400'
                  }`}
                >
                  {template.description}
                </Badge>
              </div>
              <p className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                {template.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
