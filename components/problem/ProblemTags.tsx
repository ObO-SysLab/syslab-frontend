import { CategoryChip, DepthBadge, TypeChip } from '@/components/dv';

/** Difficulty, type and category above a problem title (problem pages and the author preview, 2026-11-10). */
export function ProblemTags({ difficulty, type, category }: { difficulty?: string | number | null; type?: string | null; category?: string | null }) {
  if (!difficulty && !type && !category) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-problem-tags>
      {!!difficulty && <DepthBadge level={difficulty} showZone />}
      {!!type && <TypeChip type={type} />}
      {!!category && <CategoryChip category={category} />}
    </div>
  );
}
