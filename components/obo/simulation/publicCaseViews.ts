import type { Json } from '../runtime/index.mjs';
import { createInstance, createView, semanticEntities, type SimulationDocument, type SimulationInstance } from '../runtime/document.mjs';

/**
 * Which drawing the public-case comparison uses (2026-11-08). The author's graded simulation keeps its views,
 * names and layout; cards aimed at an actor/resource the test input does not have are left out. Without the
 * author's document (or for another model) the previous generic per-role cards remain.
 */
export function instanceForCase(document: SimulationDocument | null | undefined, scenarioId: string, input: Record<string, Json>): SimulationInstance {
  const authored = document?.instances.find(i => i.id === document.question.gradingInstanceId);
  if (authored && authored.scenarioId === scenarioId) {
    const next: SimulationInstance = { ...structuredClone(authored), input };
    let entities: Record<string, string[]>;
    try { entities = semanticEntities(next); } catch { entities = { actor: [], resource: [] }; }
    const views = next.views.filter(v => v.target === null || !(v.role in entities) || entities[v.role].includes(v.target));
    if (views.some(v => !v.hidden)) {
      const removed = new Set(next.views.filter(v => !views.includes(v)).map(v => v.id));
      return { ...next, views, decorations: next.decorations.filter(d => !removed.has(d.source) && !removed.has(d.target)) };
    }
  }
  const base = createInstance(scenarioId);
  // Targeted defaults refer to example IDs, which may differ in the public input.
  const views = base.views.some(view => view.target !== null)
    ? [...new Set(base.views.map(view => view.role))].map((role, index) => createView(role, null, index))
    : base.views;
  return { ...base, input, views } as SimulationInstance;
}
