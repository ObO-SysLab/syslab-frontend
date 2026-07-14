'use client';

import { PALETTE_ITEMS, PALETTE_GROUPS, EDGE_TYPES, type EdgeType, type PaletteComponentType } from '../templates';

interface PaletteProps {
  activeEdgeType: EdgeType;
  onEdgeTypeChange: (type: EdgeType) => void;
}

export function Palette({ activeEdgeType, onEdgeTypeChange }: PaletteProps) {
  const onDragStart = (e: React.DragEvent, type: PaletteComponentType, label: string) => {
    e.dataTransfer.setData('application/obo-component', type);
    e.dataTransfer.setData('application/obo-label', label);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-3 space-y-4">
      {PALETTE_GROUPS.map(group => (
        <div key={group.id} className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.id === 'edge'
              ? EDGE_TYPES.map(({ type, label, description }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onEdgeTypeChange(type)}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      activeEdgeType === type
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold">{label}</span>
                    <span className="text-slate-400 ml-1.5">{description}</span>
                  </button>
                ))
              : PALETTE_ITEMS.filter(item => item.group === group.id).map(item => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={e => onDragStart(e, item.type, item.label)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs cursor-grab active:cursor-grabbing hover:bg-indigo-50 hover:border-indigo-200 transition-all select-none"
                  >
                    <span className="font-bold text-slate-700">{item.label}</span>
                    <p className="text-slate-400 mt-0.5 text-[10px]">{item.description}</p>
                  </div>
                ))
            }
          </div>
        </div>
      ))}
    </div>
  );
}