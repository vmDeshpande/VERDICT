import { Schema, model, models } from 'mongoose';
import { CASE_TYPES } from '@/lib/cases';
import { COURTROOM_MEMBER_ROLES } from '@/lib/courtroomMembers';
import {
  MAX_TRIAL_COMMAND_RECEIPTS,
  MAX_TRIAL_EVENTS,
  TRIAL_EVENT_TYPES,
  TRIAL_PHASE_KEYS,
  TRIAL_STATUSES,
} from '@/lib/trialTypes';

const trialEventSchema = new Schema(
  {
    sequence: { type: Number, required: true, min: 1 },
    commandId: { type: String, required: true, trim: true, maxlength: 64 },
    source: { type: String, required: true, enum: ['PARTICIPANT', 'JUDGE'], default: 'PARTICIPANT' },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator: function (this: { source?: string }, value: unknown) {
          if (this.source === 'JUDGE') return value === null || value === undefined;
          return value !== null && value !== undefined;
        },
        message: 'actorUserId is required for participant events and must be null for judge events.',
      },
    },
    type: { type: String, required: true, enum: TRIAL_EVENT_TYPES },
    payload: { type: Schema.Types.Mixed, required: true },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: false }
);

const commandReceiptSchema = new Schema(
  {
    commandId: { type: String, required: true, trim: true, maxlength: 64 },
    requestHash: { type: String, required: true, match: /^[a-f\d]{64}$/i },
    eventIds: [{ type: Schema.Types.ObjectId, required: true }],
    result: { type: Schema.Types.Mixed, required: true },
    acceptedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

const pendingObjectionSchema = new Schema(
  {
    objectionEventId: { type: Schema.Types.ObjectId, required: true },
    targetEventId: { type: Schema.Types.ObjectId, required: true },
    objectorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const judgeJobSchema = new Schema(
  {
    jobId: { type: String, required: true, trim: true, maxlength: 256 },
    trialId: { type: String, required: true, trim: true, maxlength: 128 },
    triggerEventId: { type: String, required: true, trim: true, maxlength: 128 },
    taskType: {
      type: String,
      required: true,
      enum: ['INTRODUCTION', 'OBSERVATION', 'FINAL_JUDGMENT'],
    },
    status: {
      type: String,
      required: true,
      enum: ['CLAIMED', 'SUCCEEDED', 'FAILED', 'RETRYABLE', 'EXPIRED'],
    },
    claimedBy: { type: String, required: true, trim: true, maxlength: 128 },
    leaseToken: { type: String, required: true, trim: true, maxlength: 128 },
    leaseExpiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    modelOutput: { type: Schema.Types.Mixed, default: null },
    error: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const trialSchema = new Schema(
  {
    courtroomId: {
      type: Schema.Types.ObjectId,
      ref: 'Courtroom',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: TRIAL_STATUSES,
      default: 'NOT_STARTED',
    },
    caseTypeSnapshot: {
      type: String,
      required: true,
      enum: CASE_TYPES,
    },
    templateKey: {
      type: String,
      required: true,
      enum: ['basic-hearing'],
      default: 'basic-hearing',
    },
    templateVersion: {
      type: Number,
      required: true,
      enum: [1],
      default: 1,
    },
    currentPhaseKey: {
      type: String,
      enum: TRIAL_PHASE_KEYS,
      default: null,
    },
    currentTurnRole: {
      type: String,
      enum: COURTROOM_MEMBER_ROLES,
      default: null,
    },
    phaseTurnIndex: { type: Number, required: true, min: 0, default: 0 },
    eventSequence: { type: Number, required: true, min: 0, default: 0 },
    version: { type: Number, required: true, min: 0, default: 0 },
    pendingObjection: { type: pendingObjectionSchema, default: null },
    judgeJobs: {
      type: [judgeJobSchema],
      default: [],
    },
    events: {
      type: [trialEventSchema],
      default: [],
      validate: {
        validator: (events: unknown[]) => events.length <= MAX_TRIAL_EVENTS,
        message: `A trial cannot contain more than ${MAX_TRIAL_EVENTS} events.`,
      },
    },
    commandReceipts: {
      type: [commandReceiptSchema],
      default: [],
      validate: {
        validator: (receipts: unknown[]) => receipts.length <= MAX_TRIAL_COMMAND_RECEIPTS,
        message: `A trial cannot contain more than ${MAX_TRIAL_COMMAND_RECEIPTS} command receipts.`,
      },
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

trialSchema.index({ courtroomId: 1 }, { unique: true });

export const Trial = models.Trial || model('Trial', trialSchema);
export type TrialDocument = InstanceType<typeof Trial>;