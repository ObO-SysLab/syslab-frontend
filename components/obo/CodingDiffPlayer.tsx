'use client';

import { useMemo } from 'react';
import type { OboCodingSchema, OboTraceStep } from './types';
import { buildCodingDiffPlan } from './lib/codingDiff';
import { OboPlayer } from './OboPlayer';

interface CodingDiffPlayerProps {
  schema: OboCodingSchema;
  submittedTrace: OboTraceStep[];
  resubmitKey: string | number;
}

export function CodingDiffPlayer({ schema, submittedTrace, resubmitKey }: CodingDiffPlayerProps) {
  const plan = useMemo(
    () => buildCodingDiffPlan(schema, submittedTrace),
    [schema, submittedTrace]
  );

  return (
    <OboPlayer
      key={resubmitKey}
      blob={plan.blob}
      maxFrameIndex={plan.stopAtFrameIndex}
      checkpointStatusByFrame={plan.statusByFrameId}
      autoPlay
    />
  );
}
