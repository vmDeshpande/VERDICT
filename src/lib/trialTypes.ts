import type { Types } from 'mongoose';
import type { CaseType } from '@/lib/cases';
import type { CourtroomMemberRole } from '@/lib/courtroomMembers';

export const TRIAL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TRIAL_PHASE_KEYS = [
  'OPENING',
  'FIRST_SIDE_ARGUMENT',
  'OPPOSING_SIDE_ARGUMENT',
  'REBUTTAL',
  'CLOSING',
] as const;
export const TRIAL_EVENT_TYPES = [
  'TRIAL_STARTED',
  'ARGUMENT_SUBMITTED',
  'OBJECTION_RAISED',
  'OBJECTION_RESPONSE_RECORDED',
  'OBJECTION_DISPOSITION_RECORDED',
] as const;

export const MAX_TRIAL_EVENTS = 256;
export const MAX_TRIAL_COMMAND_RECEIPTS = 256;
export const MAX_ARGUMENT_CHARACTERS = 4_000;
export const MAX_OBJECTION_REASON_CHARACTERS = 1_000;
export const MAX_OBJECTION_RESPONSE_CHARACTERS = 1_000;

export type TrialStatus = (typeof TRIAL_STATUSES)[number];
export type TrialPhaseKey = (typeof TRIAL_PHASE_KEYS)[number];
export type TrialEventType = (typeof TRIAL_EVENT_TYPES)[number];
export type TrialCaseType = CaseType;
export type TrialRole = CourtroomMemberRole;
export const OBJECTION_CATEGORIES = ['OUT_OF_SCOPE', 'REPETITIVE', 'PERSONAL_ATTACK'] as const;
export const OBJECTION_DECISIONS = ['ACKNOWLEDGE', 'DISPUTE'] as const;
export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];
export type ObjectionDecision = (typeof OBJECTION_DECISIONS)[number];

export interface TrialState {
  caseTypeSnapshot: TrialCaseType;
  status: TrialStatus;
  currentPhaseKey: TrialPhaseKey | null;
  currentTurnRole: TrialRole | null;
  phaseTurnIndex: number;
}

export interface TrialEventRecord {
  _id: Types.ObjectId;
  sequence: number;
  commandId: string;
  actorUserId: Types.ObjectId;
  type: TrialEventType;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface TrialCommandResult {
  eventIds: string[];
  firstSequence: number;
  lastSequence: number;
  version: number;
  status: TrialStatus;
  currentPhaseKey: TrialPhaseKey | null;
  currentTurnRole: TrialRole | null;
}

export interface TrialCommandReceiptRecord {
  commandId: string;
  requestHash: string;
  eventIds: Types.ObjectId[];
  result: TrialCommandResult;
  acceptedAt: Date;
}