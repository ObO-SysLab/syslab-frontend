'use client';
import { AlertTriangle, CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AuthoringStep } from './authoringSteps';

const LOOK = {
  done: { Icon: CheckCircle2, color: 'text-success', word: '완료' },
  required: { Icon: CircleDot, color: 'text-danger', word: '필수' },
  check: { Icon: AlertTriangle, color: 'text-warning', word: '확인' },
  optional: { Icon: Circle, color: 'text-ink-subtle', word: '선택' },
} as const;

/** Live “what is left” list for the create page (2026-11-09); each row jumps to its field. */
export function AuthoringChecklist({ steps, onGo }: { steps: AuthoringStep[]; onGo: (target: string) => void }) {
  const required = steps.filter(s => s.status === 'required').length, checks = steps.filter(s => s.status === 'check').length;
  return <Card aria-label="만드는 순서" className="overflow-hidden rounded-2xl border-line bg-panel shadow-sm" data-authoring-checklist>
    <div className="border-b border-line bg-deep px-5 py-4">
      <p className="text-lg font-bold text-ink">만드는 순서</p>
      <p role="status" aria-live="polite" className="mt-0.5 text-xs text-ink-muted" data-required-left={required}>
        {required ? `필수 ${required}개 남음` : '필수 항목을 모두 채웠습니다'}{checks ? ` · 확인 ${checks}개` : ''}
      </p>
    </div>
    <ol className="max-h-[calc(100dvh-14rem)] divide-y divide-line overflow-y-auto">
      {steps.map((step, i) => {
        const { Icon, color, word } = LOOK[step.status];
        return <li key={step.id}>
          <button type="button" data-step={step.id} data-status={step.status} onClick={() => onGo(step.target)}
            className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-raised/60 focus-visible:bg-raised focus-visible:outline-none">
            <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{i + 1}. {step.label} <span className={`text-xs font-medium ${color}`}>{word}</span></span>
              <span className="block break-words text-xs leading-relaxed text-ink-muted">{step.hint}</span>
            </span>
          </button>
        </li>;
      })}
    </ol>
  </Card>;
}
