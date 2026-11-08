export interface Section {
  name: string;
  shared?: boolean;
  value?: string | number;
}

export const THREAD_FIELDS = ['pc', 'register', 'stack'] as const;
export type ThreadField = typeof THREAD_FIELDS[number];

export interface Thread {
  id: string;
  label: string;
  pc: string;
  register: string;
  stack: string;
}

export interface ProcessData {
  label?: string;
  color?: string;
  sections?: Section[];
  threads?: Thread[];
  activeThreadId?: string | null;
  hiddenSectionNames?: string[];
  hiddenThreadIds?: string[];
  threadFields?: ThreadField[];
  threadLayout?: 'row' | 'column';
  sectionLayout?: 'row' | 'column';
  showSharedLinks?: boolean;
  width?: number;
}

/** Legacy nodes without authored sections retain their original region labels. */
export const DEFAULT_PROCESS_SECTIONS: readonly Section[] = [
  { name: 'Code' }, { name: 'Data' }, { name: 'Heap' }, { name: 'Stack' },
];

export interface ProcessChanges {
  sections: Set<number>;
  threads: Record<string, Set<ThreadField>>;
}

/**
 * Compare adjacent logical scenes, independently of how the viewer navigated.
 * New fields/items are introductions, not changes to a previously shown value.
 * Presentation options never alter the authored data used for this comparison.
 */
export function processChanges(previous: ProcessData | undefined, current: ProcessData): ProcessChanges {
  const changes: ProcessChanges = { sections: new Set(), threads: Object.create(null) };
  if (!previous) return changes;

  // Region names need not be unique. Match each occurrence within its name,
  // so moving a different region ahead of it does not produce false changes.
  const previousSections = new Map<string, Section[]>();
  for (const section of previous.sections ?? DEFAULT_PROCESS_SECTIONS) {
    const entries = previousSections.get(section.name) ?? [];
    entries.push(section);
    previousSections.set(section.name, entries);
  }
  const occurrences = new Map<string, number>();
  (current.sections ?? DEFAULT_PROCESS_SECTIONS).forEach((section, index) => {
    const occurrence = occurrences.get(section.name) ?? 0;
    occurrences.set(section.name, occurrence + 1);
    const before = previousSections.get(section.name)?.[occurrence];
    if (before?.value !== undefined && section.value !== undefined && !Object.is(before.value, section.value)) {
      changes.sections.add(index);
    }
  });

  const previousThreads = new Map((previous.threads ?? []).map(thread => [thread.id, thread]));
  for (const thread of current.threads ?? []) {
    const before = previousThreads.get(thread.id);
    if (!before) continue;
    const fields = new Set(THREAD_FIELDS.filter(field =>
      before[field] !== undefined && thread[field] !== undefined && !Object.is(before[field], thread[field]),
    ));
    if (fields.size) changes.threads[thread.id] = fields;
  }
  return changes;
}
