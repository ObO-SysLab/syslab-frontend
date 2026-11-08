const scenarios = new Set(['ST2', 'BK', 'IN', 'PT', 'TLB', 'CS', 'PC', 'IPC', 'K-SYSCALL', 'K-INTERRUPT']);

/** These renderers show annotation views below the canvas, keeping their saved content intact. */
export const hasLowerExplanation = (scenarioId: string) => scenarios.has(scenarioId);
