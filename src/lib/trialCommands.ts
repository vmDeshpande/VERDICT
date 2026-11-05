import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { CASE_TYPES } from '@/lib/cases';
import { Courtroom } from '@/lib/courtrooms';
import { COURTROOM_MEMBER_ROLES } from '@/lib/courtroomMembers';
import { CourtroomMember } from '@/lib/courtroomMembers';
import { Trial } from '@/lib/trials';
import { getTrialTemplate } from '@/lib/trialTemplates';
import {
  canRaiseObjection,
  replayTrialEvents,
  startTrial,
  submitArgumentTurn,
} from '@/lib/trialStateMachine';
import {
  MAX_TRIAL_COMMAND_RECEIPTS,
  MAX_TRIAL_EVENTS,
  type TrialCommandReceiptRecord,
  type TrialCommandResult,
  type TrialEventRecord,
  type TrialEventType,
  type TrialRole,
  type TrialState,
} from '@/lib/trialTypes';
import { trialCommandSchema, type TrialCommand } from '@/lib/validations/trial';

export type TrialCommandErrorCode =
  | 'COURTROOM_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_COMMAND'
  | 'INVALID_CASE_TYPE'
  | 'COURTROOM_NOT_READY'
  | 'INVALID_COURTROOM_ROLES'
  | 'TRIAL_NOT_COMPLETED'
  | 'TRIAL_ALREADY_STARTED'
  | 'TRIAL_NOT_IN_PROGRESS'
  | 'INVALID_TRIAL_STATE'
  | 'NOT_YOUR_TURN'
  | 'VERSION_CONFLICT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'TRIAL_EVENT_LIMIT_REACHED'
  | 'TRIAL_COMMAND_LIMIT_REACHED'
  | 'OBJECTION_NOT_ALLOWED'
  | 'OBJECTION_TARGET_INVALID'
  | 'OBJECTION_ALREADY_RAISED'
  | 'OBJECTION_PENDING'
  | 'NO_PENDING_OBJECTION'
  | 'NOT_OBJECTION_RESPONDENT';

const ERROR_STATUS: Record<TrialCommandErrorCode, number> = {
  COURTROOM_NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_COMMAND: 400,
  INVALID_CASE_TYPE: 409,
  COURTROOM_NOT_READY: 409,
  INVALID_COURTROOM_ROLES: 409,
  TRIAL_NOT_COMPLETED: 409,
  TRIAL_ALREADY_STARTED: 409,
  TRIAL_NOT_IN_PROGRESS: 409,
  INVALID_TRIAL_STATE: 409,
  NOT_YOUR_TURN: 409,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  TRIAL_EVENT_LIMIT_REACHED: 409,
  TRIAL_COMMAND_LIMIT_REACHED: 409,
  OBJECTION_NOT_ALLOWED: 409,
  OBJECTION_TARGET_INVALID: 409,
  OBJECTION_ALREADY_RAISED: 409,
  OBJECTION_PENDING: 409,
  NO_PENDING_OBJECTION: 409,
  NOT_OBJECTION_RESPONDENT: 403,
};

export class TrialCommandError extends Error {
  readonly status: number;

  constructor(readonly code: TrialCommandErrorCode, message: string = code) {
    super(message);
    this.name = 'TrialCommandError';
    this.status = ERROR_STATUS[code];
  }
}

export interface TrialCommandOutcome {
  result: TrialCommandResult;
  replayed: boolean;
}

interface PlannedCommand {
  state: TrialState;
  events: TrialEventRecord[];
  pendingObjection: {
    objectionEventId: Types.ObjectId;
    targetEventId: Types.ObjectId;
    objectorUserId: Types.ObjectId;
    respondentUserId: Types.ObjectId;
  } | null;
  startedAt?: Date;
  completedAt?: Date;
}

interface TrialSnapshot extends TrialState {
  _id: Types.ObjectId;
  courtroomId: Types.ObjectId;
  templateKey: string;
  templateVersion: number;
  eventSequence: number;
  version: number;
  startedAt: Date | null;
  completedAt: Date | null;
  pendingObjection: {
    objectionEventId: Types.ObjectId;
    targetEventId: Types.ObjectId;
    objectorUserId: Types.ObjectId;
    respondentUserId: Types.ObjectId;
  } | null;
  events: TrialEventRecord[];
  commandReceipts: TrialCommandReceiptRecord[];
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function commandErrorFromTransition(error: string): TrialCommandError {
  return new TrialCommandError(error as TrialCommandErrorCode);
}

function stateFromTrial(trial: {
  caseTypeSnapshot: string;
  status: TrialState['status'];
  currentPhaseKey: TrialState['currentPhaseKey'];
  currentTurnRole: TrialState['currentTurnRole'];
  phaseTurnIndex: number;
}): TrialState {
  return {
    caseTypeSnapshot: trial.caseTypeSnapshot as TrialState['caseTypeSnapshot'],
    status: trial.status,
    currentPhaseKey: trial.currentPhaseKey,
    currentTurnRole: trial.currentTurnRole,
    phaseTurnIndex: trial.phaseTurnIndex,
  };
}

async function ensureTrial(courtroom: {
  _id: Types.ObjectId;
  caseType?: string;
}): Promise<TrialSnapshot> {
  if (!CASE_TYPES.includes(courtroom.caseType as (typeof CASE_TYPES)[number])) {
    throw new TrialCommandError('INVALID_CASE_TYPE');
  }

  const courtroomId = courtroom._id;
  const caseTypeSnapshot = courtroom.caseType as (typeof CASE_TYPES)[number];
  try {
    const trial = await Trial.findOneAndUpdate(
      { courtroomId },
      {
        $setOnInsert: {
          courtroomId,
          caseTypeSnapshot,
          templateKey: 'basic-hearing',
          templateVersion: 1,
          status: 'NOT_STARTED',
          currentPhaseKey: null,
          currentTurnRole: null,
          phaseTurnIndex: 0,
          eventSequence: 0,
          version: 0,
          pendingObjection: null,
          events: [],
          commandReceipts: [],
          startedAt: null,
          completedAt: null,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    ).lean();
    if (!trial) throw new TrialCommandError('INVALID_TRIAL_STATE');
    return trial as unknown as TrialSnapshot;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await Trial.findOne({ courtroomId }).lean();
    if (!existing) throw error;
    return existing as unknown as TrialSnapshot;
  }
}

function hashCommand(
  trialId: string,
  actorUserId: string,
  command: TrialCommand
): string {
  const { commandId: _commandId, expectedVersion, type, ...normalizedPayload } = command;
  return createHash('sha256')
    .update(
      JSON.stringify({
        trialId,
        commandType: type,
        actorUserId,
        normalizedPayload,
        expectedVersion,
      })
    )
    .digest('hex');
}

function createEvent(
  sequence: number,
  commandId: string,
  actorUserId: Types.ObjectId,
  type: TrialEventType,
  payload: Record<string, unknown>,
  occurredAt: Date
): TrialEventRecord {
  return {
    _id: new Types.ObjectId(),
    sequence,
    commandId,
    actorUserId,
    type,
    payload,
    occurredAt,
  };
}

function planCommand(
  trial: TrialSnapshot,
  command: TrialCommand,
  actorUserId: Types.ObjectId,
  actorRole: TrialRole,
  hostUserId: Types.ObjectId,
  members: Array<{ userId: Types.ObjectId; role: string }>
): PlannedCommand {
  if (!trial) throw new TrialCommandError('INVALID_TRIAL_STATE');
  const state = stateFromTrial(trial);
  const occurredAt = new Date();
  const firstSequence = trial.eventSequence + 1;

  switch (command.type) {
    case 'START_TRIAL': {
      if (!actorUserId.equals(hostUserId)) throw new TrialCommandError('FORBIDDEN');
      const template = getTrialTemplate(state.caseTypeSnapshot);
      const hasBothSides =
        members.length === 2 &&
        members.some((member) => member.role === template.firstSideRole) &&
        members.some((member) => member.role === template.opposingSideRole) &&
        members.some((member) => member.userId.equals(hostUserId));
      if (!hasBothSides) throw new TrialCommandError('COURTROOM_NOT_READY');

      const transition = startTrial(state);
      if (!transition.ok) throw commandErrorFromTransition(transition.error);
      return {
        state: transition.state,
        pendingObjection: null,
        startedAt: occurredAt,
        events: [
          createEvent(firstSequence, command.commandId, actorUserId, 'TRIAL_STARTED', {
            caseTypeSnapshot: state.caseTypeSnapshot,
            templateKey: trial.templateKey,
            templateVersion: trial.templateVersion,
            phaseKey: transition.state.currentPhaseKey,
            turnRole: transition.state.currentTurnRole,
          }, occurredAt),
        ],
      };
    }
    case 'SUBMIT_ARGUMENT': {
      if (trial.pendingObjection) throw new TrialCommandError('OBJECTION_PENDING');
      const phaseKey = state.currentPhaseKey;
      const transition = submitArgumentTurn(state, actorRole);
      if (!transition.ok) throw commandErrorFromTransition(transition.error);
      return {
        state: transition.state,
        pendingObjection: null,
        completedAt: transition.state.status === 'COMPLETED' ? occurredAt : undefined,
        events: [
          createEvent(firstSequence, command.commandId, actorUserId, 'ARGUMENT_SUBMITTED', {
            phaseKey,
            speakerRole: actorRole,
            text: command.text,
            nextPhaseKey: transition.state.currentPhaseKey,
            nextTurnRole: transition.state.currentTurnRole,
            statusAfter: transition.state.status,
          }, occurredAt),
        ],
      };
    }
    case 'RAISE_OBJECTION': {
      if (!canRaiseObjection(state, actorRole)) throw new TrialCommandError('OBJECTION_NOT_ALLOWED');
      if (trial.pendingObjection) throw new TrialCommandError('OBJECTION_PENDING');

      const target = trial.events.find((event) => event._id.toString() === command.targetEventId);
      const latestArgument = [...trial.events].reverse().find((event) => event.type === 'ARGUMENT_SUBMITTED');
      if (
        !target ||
        target.type !== 'ARGUMENT_SUBMITTED' ||
        !latestArgument ||
        !latestArgument._id.equals(target._id) ||
        target.actorUserId.equals(actorUserId) ||
        target.payload.speakerRole === actorRole
      ) {
        throw new TrialCommandError('OBJECTION_TARGET_INVALID');
      }
      if (
        trial.events.some(
          (event) =>
            event.type === 'OBJECTION_RAISED' &&
            event.payload.targetEventId === command.targetEventId
        )
      ) {
        throw new TrialCommandError('OBJECTION_ALREADY_RAISED');
      }

      const objectionEvent = createEvent(
        firstSequence,
        command.commandId,
        actorUserId,
        'OBJECTION_RAISED',
        {
          targetEventId: target._id.toString(),
          category: command.category,
          reason: command.reason,
          phaseKey: state.currentPhaseKey,
        },
        occurredAt
      );
      return {
        state,
        pendingObjection: {
          objectionEventId: objectionEvent._id,
          targetEventId: target._id,
          objectorUserId: actorUserId,
          respondentUserId: target.actorUserId,
        },
        events: [objectionEvent],
      };
    }
    case 'RESPOND_TO_OBJECTION': {
      const pending = trial.pendingObjection;
      if (!pending || !pending.objectionEventId.equals(command.objectionEventId)) {
        throw new TrialCommandError('NO_PENDING_OBJECTION');
      }
      if (!pending.respondentUserId.equals(actorUserId)) {
        throw new TrialCommandError('NOT_OBJECTION_RESPONDENT');
      }

      const responseEvent = createEvent(
        firstSequence,
        command.commandId,
        actorUserId,
        'OBJECTION_RESPONSE_RECORDED',
        {
          objectionEventId: pending.objectionEventId.toString(),
          phaseKey: state.currentPhaseKey,
          decision: command.decision,
          response: command.response,
        },
        occurredAt
      );
      const disposition =
        command.decision === 'ACKNOWLEDGE' ? 'ACKNOWLEDGED' : 'DISPUTED_UNRESOLVED';
      const dispositionEvent = createEvent(
        firstSequence + 1,
        command.commandId,
        actorUserId,
        'OBJECTION_DISPOSITION_RECORDED',
        {
          objectionEventId: pending.objectionEventId.toString(),
          phaseKey: state.currentPhaseKey,
          disposition,
          basis: 'RESPONDENT_CHOICE',
          educationalSimulationOnly: true,
        },
        occurredAt
      );
      return {
        state,
        pendingObjection: null,
        events: [responseEvent, dispositionEvent],
      };
    }
  }
}

export async function executeTrialCommand(
  courtroomId: string,
  actorUserIdValue: string,
  rawCommand: unknown
): Promise<TrialCommandOutcome> {
  if (!Types.ObjectId.isValid(courtroomId) || !Types.ObjectId.isValid(actorUserIdValue)) {
    throw new TrialCommandError('FORBIDDEN');
  }

  const courtroomObjectId = new Types.ObjectId(courtroomId);
  const actorUserId = new Types.ObjectId(actorUserIdValue);
  const courtroom = await Courtroom.findById(courtroomObjectId).lean();
  if (!courtroom) throw new TrialCommandError('COURTROOM_NOT_FOUND');

  const membership = await CourtroomMember.findOne({
    courtroomId: courtroomObjectId,
    userId: actorUserId,
  }).lean();
  if (!membership) throw new TrialCommandError('FORBIDDEN');
  if (!COURTROOM_MEMBER_ROLES.includes(membership.role as TrialRole)) {
    throw new TrialCommandError('INVALID_COURTROOM_ROLES');
  }

  const parsed = trialCommandSchema.safeParse(rawCommand);
  if (!parsed.success) throw new TrialCommandError('INVALID_COMMAND', parsed.error.message);
  const command = parsed.data;
  const trial = await ensureTrial(courtroom);
  const requestHash = hashCommand(trial._id.toString(), actorUserId.toString(), command);

  const existingReceipt = trial.commandReceipts.find((receipt) => receipt.commandId === command.commandId);
  if (existingReceipt) {
    if (existingReceipt.requestHash !== requestHash) {
      throw new TrialCommandError('IDEMPOTENCY_KEY_REUSED');
    }
    return { result: existingReceipt.result as TrialCommandResult, replayed: true };
  }

  if (command.expectedVersion !== trial.version) {
    throw new TrialCommandError('VERSION_CONFLICT');
  }
  if (trial.eventSequence !== trial.events.length) {
    throw new TrialCommandError('INVALID_TRIAL_STATE');
  }

  const members = await CourtroomMember.find({ courtroomId: courtroomObjectId })
    .select({ userId: 1, role: 1 })
    .lean();
  const plan = planCommand(
    trial,
    command,
    actorUserId,
    membership.role as TrialRole,
    courtroom.hostUserId,
    members.map((member) => ({ userId: member.userId, role: member.role }))
  );

  if (trial.eventSequence + plan.events.length > MAX_TRIAL_EVENTS) {
    throw new TrialCommandError('TRIAL_EVENT_LIMIT_REACHED');
  }
  if (trial.commandReceipts.length >= MAX_TRIAL_COMMAND_RECEIPTS) {
    throw new TrialCommandError('TRIAL_COMMAND_LIMIT_REACHED');
  }

  const eventIds = plan.events.map((event) => event._id);
  const result: TrialCommandResult = {
    eventIds: eventIds.map((eventId) => eventId.toString()),
    firstSequence: plan.events[0].sequence,
    lastSequence: plan.events[plan.events.length - 1].sequence,
    version: trial.version + 1,
    status: plan.state.status,
    currentPhaseKey: plan.state.currentPhaseKey,
    currentTurnRole: plan.state.currentTurnRole,
  };
  const receipt: TrialCommandReceiptRecord = {
    commandId: command.commandId,
    requestHash,
    eventIds,
    result,
    acceptedAt: new Date(),
  };

  const updateFields: Record<string, unknown> = {
    status: plan.state.status,
    currentPhaseKey: plan.state.currentPhaseKey,
    currentTurnRole: plan.state.currentTurnRole,
    phaseTurnIndex: plan.state.phaseTurnIndex,
    pendingObjection: plan.pendingObjection,
  };
  if (plan.startedAt) updateFields.startedAt = plan.startedAt;
  if (plan.completedAt) updateFields.completedAt = plan.completedAt;

  const capacityConditions = {
    [`events.${MAX_TRIAL_EVENTS - plan.events.length}`]: { $exists: false },
    [`commandReceipts.${MAX_TRIAL_COMMAND_RECEIPTS - 1}`]: { $exists: false },
  };
  const updated = await Trial.findOneAndUpdate(
    {
      _id: trial._id,
      version: command.expectedVersion,
      eventSequence: trial.eventSequence,
      commandReceipts: { $not: { $elemMatch: { commandId: command.commandId } } },
      ...capacityConditions,
    },
    {
      $set: updateFields,
      $inc: { version: 1, eventSequence: plan.events.length },
      $push: {
        events: { $each: plan.events },
        commandReceipts: receipt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  if (updated) return { result, replayed: false };

  const latestResult = await Trial.findById(trial._id).lean();
  if (!latestResult) throw new TrialCommandError('COURTROOM_NOT_FOUND');
  const latest = latestResult as unknown as TrialSnapshot;
  const racingReceipt = latest.commandReceipts.find((entry) => entry.commandId === command.commandId);
  if (racingReceipt) {
    if (racingReceipt.requestHash !== requestHash) {
      throw new TrialCommandError('IDEMPOTENCY_KEY_REUSED');
    }
    return { result: racingReceipt.result as TrialCommandResult, replayed: true };
  }
  if (latest.eventSequence + plan.events.length > MAX_TRIAL_EVENTS) {
    throw new TrialCommandError('TRIAL_EVENT_LIMIT_REACHED');
  }
  if (latest.commandReceipts.length >= MAX_TRIAL_COMMAND_RECEIPTS) {
    throw new TrialCommandError('TRIAL_COMMAND_LIMIT_REACHED');
  }
  throw new TrialCommandError('VERSION_CONFLICT');
}

export interface TrialEventView {
  id: string;
  sequence: number;
  actorUserId: string;
  commandId: string;
  type: TrialEventType;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

async function getAuthorizedTrial(courtroomIdValue: string, actorUserIdValue: string) {
  if (!Types.ObjectId.isValid(courtroomIdValue) || !Types.ObjectId.isValid(actorUserIdValue)) {
    throw new TrialCommandError('COURTROOM_NOT_FOUND');
  }

  const courtroomId = new Types.ObjectId(courtroomIdValue);
  const actorUserId = new Types.ObjectId(actorUserIdValue);
  const courtroom = await Courtroom.findById(courtroomId).lean();
  if (!courtroom) throw new TrialCommandError('COURTROOM_NOT_FOUND');

  const membership = await CourtroomMember.findOne({ courtroomId, userId: actorUserId }).lean();
  if (!membership) throw new TrialCommandError('FORBIDDEN');

  const trial = await ensureTrial(courtroom);
  return { courtroom, membership, trial };
}

function toEventView(event: TrialEventRecord): TrialEventView {
  return {
    id: event._id.toString(),
    sequence: event.sequence,
    actorUserId: event.actorUserId.toString(),
    commandId: event.commandId,
    type: event.type,
    payload: event.payload,
    occurredAt: event.occurredAt,
  };
}

export async function getTrialSnapshot(courtroomId: string, actorUserId: string) {
  const { courtroom, membership, trial } = await getAuthorizedTrial(courtroomId, actorUserId);
  const memberCount = await CourtroomMember.countDocuments({ courtroomId: courtroom._id });
  const isHost = courtroom.hostUserId.toString() === actorUserId;
  return {
    id: trial._id.toString(),
    courtroomId: trial.courtroomId.toString(),
    myUserId: actorUserId,
    isHost,
    canStart: isHost && trial.status === 'NOT_STARTED' && memberCount === 2,
    caseType: trial.caseTypeSnapshot,
    templateKey: trial.templateKey,
    templateVersion: trial.templateVersion,
    status: trial.status,
    currentPhaseKey: trial.currentPhaseKey,
    currentTurnRole: trial.currentTurnRole,
    phaseTurnIndex: trial.phaseTurnIndex,
    eventSequence: trial.eventSequence,
    version: trial.version,
    pendingObjection: trial.pendingObjection
      ? {
          objectionEventId: trial.pendingObjection.objectionEventId.toString(),
          targetEventId: trial.pendingObjection.targetEventId.toString(),
          objectorUserId: trial.pendingObjection.objectorUserId.toString(),
          respondentUserId: trial.pendingObjection.respondentUserId.toString(),
        }
      : null,
    startedAt: trial.startedAt,
    completedAt: trial.completedAt,
    myRole: membership.role,
  };
}

export async function getTrialEvents(
  courtroomId: string,
  actorUserId: string,
  afterSequenceValue: string | null,
  limitValue: string | null
) {
  const { trial } = await getAuthorizedTrial(courtroomId, actorUserId);
  const afterSequence = z.coerce.number().int().min(0).safeParse(afterSequenceValue ?? '0');
  const limit = z.coerce.number().int().min(1).max(100).safeParse(limitValue ?? '100');
  if (!afterSequence.success || !limit.success) {
    throw new TrialCommandError('INVALID_COMMAND', 'Invalid event cursor or limit.');
  }

  const events = trial.events
    .filter((event) => event.sequence > afterSequence.data)
    .slice(0, limit.data)
    .map(toEventView);

  return {
    events,
    afterSequence: afterSequence.data,
    headSequence: trial.eventSequence,
    hasMore: events.length > 0 && events[events.length - 1].sequence < trial.eventSequence,
  };
}

export async function getTrialReplay(courtroomId: string, actorUserId: string) {
  const { trial } = await getAuthorizedTrial(courtroomId, actorUserId);
  if (trial.status !== 'COMPLETED') throw new TrialCommandError('TRIAL_NOT_COMPLETED');

  return {
    trialId: trial._id.toString(),
    eventSequence: trial.eventSequence,
    state: replayTrialEvents(trial.caseTypeSnapshot, trial.events),
    events: trial.events.map(toEventView),
  };
}