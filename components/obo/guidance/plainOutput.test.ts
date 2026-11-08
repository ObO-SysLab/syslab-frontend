import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProblemOboData } from '../types';
import { CodingRules } from '../simulation/CodingRules';
import { describeCodingContract, describeOutputFormat, outputSkeleton, sameJudgedOutput, starterCode } from './codingContract';

// Same document as the backend OboPublicContractTest.plainOutputPublishesOnlyTheLineShape (2026-11-08).
const document = {
  mode: 'coding_diff',
  codingDiff: {
    nodes: [
      { id: 'memory', type: 'slot-grid', position: { x: 1, y: 2 }, data: { label: 'SECRET_LABEL', slotCount: 3, slots: [77, null, null] } },
      { id: 'queue1', type: 'queue-strip', position: { x: 0, y: 0 }, data: { label: 'SECRET_Q', items: ['SECRET_VALUE'], capacity: 43 } },
    ],
    edges: [{ id: 'e1', source: 'memory', target: 'queue1' }], referenceTrace: [],
    frames: [{ id: 'f1', label: 'SECRET_CAPTION', highlightNodes: [], highlightEdges: [] }],
    outputFormat: { kind: 'lines-v1', target: 'memory', blank: '-', markChanged: true },
  },
} as unknown as ProblemOboData;

describe('plain (Baekjoon-style) output guidance', () => {
  it('publishes the same line shape as the server and nothing authored', () => {
    const contract = describeCodingContract(document)!;
    expect(contract).toEqual({ kind: 'diagram', modelVersion: 1, outputFormat: { kind: 'lines-v1', targetType: 'slot-grid', blank: '-', cells: 3 } });
    const text = JSON.stringify(contract) + renderToStaticMarkup(createElement(CodingRules, { contract }));
    for (const secret of ['SECRET', 'memory', '77', '43']) expect(text).not.toContain(secret);
  });

  it('explains the line in words, with placeholders instead of answers', () => {
    const contract = describeCodingContract(document)!;
    expect(describeOutputFormat(contract.outputFormat!)).toContain('칸 3개');
    expect(outputSkeleton(contract)).toBe('값 값 값\n값 값 값\n…');
    for (const language of ['python', 'c', 'cpp']) {
      const code = starterCode(language, contract);
      expect(code).not.toContain('json');
      expect(code).toContain('칸 3개');
    }
    const html = renderToStaticMarkup(createElement(CodingRules, { contract }));
    expect(html).toContain('출력 줄 형식');
    expect(html).not.toContain('JSONL');
  });

  it('compares outputs the way the grader does', () => {
    expect(sameJudgedOutput('7 - -\n7 0 -\n', '7 - - \n7 0 -')).toBe(true);
    expect(sameJudgedOutput('7  - -', '7 - -')).toBe(false);
    expect(sameJudgedOutput('7 - -\r\n7 0 -', '7 - -\n7 0 -')).toBe(true);
  });
});
