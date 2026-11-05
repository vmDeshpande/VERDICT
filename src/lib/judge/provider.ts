export type JudgeProviderType = 'gemini';

export interface JudgeProviderConfig {
  apiKey?: string;
  model?: string;
}

export interface JudgePromptContext {
  caseSummary: string;
  jurisdiction: string;
  caseType: string;
  trialPhase: string | null;
  speakingOrder: string[];
  transcript: Array<{
    sequence: number;
    source: 'PARTICIPANT' | 'JUDGE';
    actorUserId?: string | null;
    type: string;
    summary: string;
  }>;
  previousNotes: string[];
  participantArguments: Array<{
    speaker: string;
    text: string;
  }>;
  currentQuestion?: string | null;
}

export interface JudgeProviderResponse<T> {
  value: T;
  provider: JudgeProviderType;
  model: string;
}

export interface JudgeProvider {
  generateIntroduction(context: JudgePromptContext): Promise<JudgeProviderResponse<string>>;
  generateObservation(context: JudgePromptContext): Promise<JudgeProviderResponse<string>>;
  generateFinalJudgment(context: JudgePromptContext): Promise<JudgeProviderResponse<string>>;
}
