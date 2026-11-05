import { z } from 'zod';

export const judgeOutputSchema = z.object({
  summary: z.string().min(1).max(2000).describe('Short neutral summary of the current situation.'),
  keyFinding: z.string().min(1).max(400).optional(),
  question: z.string().min(1).max(500).optional(),
  needsClarification: z.boolean().default(false),
  unsupportedAssertion: z.string().min(1).max(400).optional(),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const judgeJudgmentSchema = z.object({
  caseSummary: z.string().min(1).max(2000),
  disputedIssues: z.array(z.string().min(1).max(300)).min(1).max(6),
  strongestFirstSide: z.array(z.string().min(1).max(300)).min(1).max(4),
  strongestOpposingSide: z.array(z.string().min(1).max(300)).min(1).max(4),
  issueAnalysis: z.array(
    z.object({
      issue: z.string().min(1).max(200),
      analysis: z.string().min(1).max(1200),
    })
  ).min(1).max(6),
  strengthsAndWeaknesses: z.object({
    firstSide: z.array(z.string().min(1).max(200)).min(1).max(3),
    opposingSide: z.array(z.string().min(1).max(200)).min(1).max(3),
  }),
  missingInformation: z.array(z.string().min(1).max(300)).min(1).max(4),
  simulatedOutcome: z.string().min(1).max(600),
  reasoning: z.string().min(1).max(1800),
  educationalDisclaimer: z.string().min(1).max(500),
  basedOnlyOnProvidedContext: z.boolean().default(true),
});

export const judgeJobStateSchema = z.object({
  jobId: z.string().min(1).max(128),
  trialId: z.string().min(1).max(128),
  triggerEventId: z.string().min(1).max(128),
  taskType: z.enum(['INTRODUCTION', 'OBSERVATION', 'FINAL_JUDGMENT']),
  status: z.enum(['CLAIMED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'RETRYABLE', 'EXPIRED']),
  leaseExpiresAt: z.string().datetime({ offset: true }),
  claimedBy: z.string().min(1).max(128),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  modelOutput: z.any().optional(),
});

export type JudgeOutput = z.infer<typeof judgeOutputSchema>;
export type JudgeJudgment = z.infer<typeof judgeJudgmentSchema>;
export type JudgeJobState = z.infer<typeof judgeJobStateSchema>;
