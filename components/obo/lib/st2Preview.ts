import { ALL_OBO_TEMPLATES } from '../templates';
import type { OboBlob } from '../types';

// Authored example scenes, not the output of a new state-transition engine. The scenes are the ST2 template's own
// default frames, so this page and the common editor start from the same playback.
export function createSt2Preview(): OboBlob {
  const template = ALL_OBO_TEMPLATES.find(t => t.id === 'ST2')!;
  return structuredClone({ nodes: template.defaultNodes, edges: template.defaultEdges, frames: template.defaultFrames ?? [] }) as OboBlob;
}
