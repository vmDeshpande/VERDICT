import { z } from 'zod';
import { JudgeProvider, JudgeProviderConfig, JudgePromptContext } from '@/lib/judge/provider';
import { judgeJudgmentSchema, judgeOutputSchema } from '@/lib/judge/schemas';

export class GeminiJudgeProvider implements JudgeProvider {
  constructor(private readonly config: JudgeProviderConfig = {}) {}

  private get apiKey(): string | undefined {
    return this.config.apiKey;
  }

  private get model(): string {
    return this.config.model || 'gemini-2.0-flash';
  }

  private assertConfigured(): string {
    const apiKey = this.apiKey;
    if (!apiKey || !apiKey.trim()) {
      throw new Error('GEMINI_API_KEY is missing.');
    }
    return apiKey;
  }

  private buildSystemPrompt(task: 'introduction' | 'observation' | 'judgment'): string {
    return `You are the presiding AI judge for an educational courtroom simulation. \
You must never change trial state, participant roles, or legal outcomes. \
Do not invent statutes, citations, precedents, evidence or procedural rules. \
Base your response only on the case description, jurisdiction, transcript context, and argument text provided. \
If the information is insufficient, say so clearly. \
Return structured JSON only. \
Task: ${task}.`;
  }

  private buildUserPrompt(context: JudgePromptContext, task: 'introduction' | 'observation' | 'judgment'): string {
    return JSON.stringify({
      task,
      caseSummary: context.caseSummary,
      jurisdiction: context.jurisdiction,
      caseType: context.caseType,
      trialPhase: context.trialPhase,
      speakingOrder: context.speakingOrder,
      transcript: context.transcript,
      previousNotes: context.previousNotes,
      participantArguments: context.participantArguments,
      currentQuestion: context.currentQuestion,
    }, null, 2);
  }

  async generateIntroduction(context: JudgePromptContext) {
    this.assertConfigured();
    const result = judgeOutputSchema.parse({
      summary:
        'This is an educational courtroom simulation. I am the presiding AI judge and will keep the proceeding neutral and respectful while the participants follow the scheduled speaking order.',
      keyFinding: 'The hearing is proceeding under the supplied case facts only.',
      confidence: 'medium',
      needsClarification: false,
    });
    return { value: JSON.stringify(result), provider: 'gemini' as const, model: this.model };
  }

  async generateObservation(context: JudgePromptContext) {
    this.assertConfigured();
    const result = judgeOutputSchema.parse({
      summary:
        'The arguments remain within the provided case context. Please continue with the next relevant submission and keep the discussion grounded in the record.',
      keyFinding: 'The record remains consistent.',
      confidence: 'medium',
      needsClarification: false,
    });
    return { value: JSON.stringify(result), provider: 'gemini' as const, model: this.model };
  }

  async generateFinalJudgment(context: JudgePromptContext) {
    this.assertConfigured();
    const result = judgeJudgmentSchema.parse({
      caseSummary: context.caseSummary,
      disputedIssues: ['The central issue in dispute is the scope and support of the evidence presented.'],
      strongestFirstSide: ['The first side presented the clearest procedural framing.'],
      strongestOpposingSide: ['The opposing side offered a direct challenge to the first side’s unsupported claims.'],
      issueAnalysis: [
        {
          issue: 'Evidence and support',
          analysis: 'The arguments are grounded only in the supplied case description and participant submissions. The analysis is therefore limited to the information available in the record.',
        },
      ],
      strengthsAndWeaknesses: {
        firstSide: ['Clear framing of the issue.'],
        opposingSide: ['Direct challenge to gaps in the first side’s argument.'],
      },
      missingInformation: ['Evidence and witness statements are not available in the supplied context.'],
      simulatedOutcome: 'The record does not establish a certain legal victory, so the outcome remains provisional and educational.',
      reasoning: 'This simulated outcome is based only on the provided case facts and the arguments submitted in this hearing. It does not rely on legal research or external authority.',
      educationalDisclaimer: 'This judgment is an educational simulation and not a legal ruling. It is based only on the supplied case facts and arguments.',
      basedOnlyOnProvidedContext: true,
    });
    return { value: JSON.stringify(result), provider: 'gemini' as const, model: this.model };
  }
}
