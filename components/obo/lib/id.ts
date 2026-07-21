function nextSequentialId(prefix: 'n' | 'e' | 'f', ids: string[]): string {
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  const max = ids.reduce((m, id) => {
    const match = re.exec(id);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `${prefix}_${max + 1}`;
}

export const nextNodeId = (nodes: { id: string }[]): string =>
  nextSequentialId('n', nodes.map(n => n.id));

export const nextEdgeId = (edges: { id: string }[]): string =>
  nextSequentialId('e', edges.map(e => e.id));

export const nextFrameId = (frames: { id: string }[]): string =>
  nextSequentialId('f', frames.map(f => f.id));
