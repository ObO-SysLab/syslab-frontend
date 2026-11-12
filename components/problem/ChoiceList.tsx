'use client';
/**
 * Objective choices as learners see them (2026-11-10). With onToggle the rows are buttons (problem pages);
 * without it they are a still copy for the author's preview. ordered: the answer must be picked in order,
 * so selected rows show their pick number.
 */
export function ChoiceList({ choices, selected = [], ordered = false, onToggle }: {
  choices: { index: number; content: string }[];
  selected?: number[];
  ordered?: boolean;
  onToggle?: (index: number) => void;
}) {
  return (
    <div className="mt-6 space-y-2" data-choice-list>
      {ordered && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs font-bold text-warning" data-ordered-answer>
          이 문제는 정답을 선택하는 <span className="underline decoration-2">정확한 순서</span>까지 일치해야 정답 처리됩니다.
        </div>
      )}
      {choices.map(choice => {
        const order = selected.indexOf(choice.index), isSelected = order !== -1;
        const look = `w-full text-left p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${isSelected
          ? 'border-primary bg-primary/10 shadow-sm'
          : `border-line bg-canvas ${onToggle ? 'hover:border-line-strong hover:bg-raised' : ''}`}`;
        const body = <>
          <span className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center text-xs font-black transition-all ${isSelected
            ? 'bg-primary text-primary-ink border-primary shadow-inner'
            : 'border-line-strong bg-panel text-ink-subtle'}`}>
            {isSelected && ordered ? order + 1 : choice.index}
          </span>
          <span className={`text-sm break-words ${isSelected ? 'text-primary font-bold' : 'text-ink'}`}>{choice.content}</span>
        </>;
        return onToggle
          ? <button type="button" key={choice.index} aria-pressed={isSelected} onClick={() => onToggle(choice.index)} className={`${look} cursor-pointer`}>{body}</button>
          : <div key={choice.index} className={look}>{body}</div>;
      })}
    </div>
  );
}
