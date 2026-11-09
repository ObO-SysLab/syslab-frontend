'use client';
import { AlertTriangle, CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AuthoringStep } from './authoringSteps';

const LOOK = {
  done: { Icon: CheckCircle2, color: 'text-indigo-600', word: '완료' },
  required: { Icon: CircleDot, color: 'text-rose-600', word: '필수' },
  check: { Icon: AlertTriangle, color: 'text-amber-600', word: '확인' },
  optional: { Icon: Circle, color: 'text-slate-400', word: '선택' },
} as const;

/** Live “what is left” list for the create page (2026-11-09); each row jumps to its field. */
export function AuthoringChecklist({ steps, onGo }: { steps: AuthoringStep[]; onGo: (target: string) => void }) {
  const required = steps.filter(s => s.status === 'required').length, checks = steps.filter(s => s.status === 'check').length;
  return <Card aria-label="만드는 순서" className="overflow-hidden rounded-2xl border-indigo-100 bg-white shadow-sm" data-authoring-checklist>
    <div className="bg-indigo-600 px-5 py-4">
      <p className="text-lg font-black text-white">만드는 순서</p>
      <p role="status" aria-live="polite" className="mt-0.5 text-xs text-indigo-100" data-required-left={required}>
        {required ? `필수 ${required}개 남음` : '필수 항목을 모두 채웠어요'}{checks ? ` · 확인 ${checks}개` : ''}
      </p>
    </div>
    <ol className="max-h-[calc(100dvh-14rem)] divide-y divide-slate-100 overflow-y-auto">
      {steps.map((step, i) => {
        const { Icon, color, word } = LOOK[step.status];
        return <li key={step.id}>
          <button type="button" data-step={step.id} data-status={step.status} onClick={() => onGo(step.target)}
            className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-indigo-50 focus-visible:outline-none">
            <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{i + 1}. {step.label} <span className={`text-[11px] font-medium ${color}`}>{word}</span></span>
              <span className="block break-words text-xs leading-relaxed text-slate-500">{step.hint}</span>
            </span>
          </button>
        </li>;
      })}
    </ol>
  </Card>;
}
