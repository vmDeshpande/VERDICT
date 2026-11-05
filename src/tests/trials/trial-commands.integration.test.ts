// @vitest-environment node

import { randomUUID, createHash } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import mongoose, { Types } from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Courtroom } from '@/lib/courtrooms';
import { COURTROOM_MEMBER_ROLES, CourtroomMember } from '@/lib/courtroomMembers';
import { Trial } from '@/lib/trials';
import { executeTrialCommand, TrialCommandError } from '@/lib/trialCommands';
import { getTemplateTurns, getTrialTemplate } from '@/lib/trialTemplates';
import { replayTrialEvents } from '@/lib/trialStateMachine';
import { requireTestDatabaseConfiguration } from '@/lib/testing/test-database-config';
import {
  MAX_TRIAL_COMMAND_RECEIPTS,
  MAX_TRIAL_EVENTS,
  type TrialCaseType,
  type TrialEventRecord,
  type TrialRole,
} from '@/lib/trialTypes';
import { trialCommandSchema, type TrialCommand } from '@/lib/validations/trial';

loadEnvConfig(process.cwd());
const testDatabase = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);

type TestRoom = {
  id: Types.ObjectId;
  hostUserId: Types.ObjectId;
  opponentUserId: Types.ObjectId;
  firstSideRole: TrialRole;
  opposingSideRole: TrialRole;
};

const createdCourtroomIds: Types.ObjectId[] = [];

function makeCommand(value: unknown): TrialCommand {
  return trialCommandSchema.parse(value);
}

function commandId(): string {
  return randomUUID();
}

async function createRoom(caseType: TrialCaseType = 'Civil'): Promise<TestRoom> {
  const template = getTrialTemplate(caseType);
  const hostUserId = new Types.ObjectId();
  const opponentUserId = new Types.ObjectId();
  const courtroom = await Courtroom.create({
    caseId: new Types.ObjectId(),
    title: `Trial integration ${randomUUID()}`,
    jurisdiction: 'India',
    caseType,
    status: 'ACTIVE',
    hostUserId,
    maxParticipants: 2,
    invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  createdCourtroomIds.push(courtroom._id);
  await CourtroomMember.create([
    {
      courtroomId: courtroom._id,
      userId: hostUserId,
      role: template.firstSideRole,
    },
    {
      courtroomId: courtroom._id,
      userId: opponentUserId,
      role: template.opposingSideRole,
    },
  ]);

  return {
    id: courtroom._id,
    hostUserId,
    opponentUserId,
    firstSideRole: template.firstSideRole,
    opposingSideRole: template.opposingSideRole,
  };
}

function startCommand(expectedVersion: number, id = commandId()): TrialCommand {
  return makeCommand({ type: 'START_TRIAL', expectedVersion, commandId: id });
}

function argumentCommand(expectedVersion: number, text: string, id = commandId()): TrialCommand {
  return makeCommand({ type: 'SUBMIT_ARGUMENT', expectedVersion, commandId: id, text });
}

async function startRoom(room: TestRoom) {
  return executeTrialCommand(room.id.toString(), room.hostUserId.toString(), startCommand(0));
}

async function expectCommandError(
  promise: Promise<unknown>,
  code: TrialCommandError['code']
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('trial command persistence', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabase.uri);
    if (mongoose.connection.name !== testDatabase.databaseName) {
      throw new Error('Connected database does not match the validated test database name.');
    }
    await Promise.all([Courtroom.init(), CourtroomMember.init(), Trial.init()]);
  }, 30_000);

  afterEach(async () => {
    if (createdCourtroomIds.length === 0) return;
    const courtroomIds = createdCourtroomIds.splice(0);
    await Trial.deleteMany({ courtroomId: { $in: courtroomIds } });
    await CourtroomMember.deleteMany({ courtroomId: { $in: courtroomIds } });
    await Courtroom.deleteMany({ _id: { $in: courtroomIds } });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  });

  it('creates a single receipt and event for concurrent duplicate commands', async () => {
    const room = await createRoom();
    const duplicateCommand = startCommand(0);

    const outcomes = await Promise.all([
      executeTrialCommand(room.id.toString(), room.hostUserId.toString(), duplicateCommand),
      executeTrialCommand(room.id.toString(), room.hostUserId.toString(), duplicateCommand),
    ]);

    expect(outcomes.map((outcome) => outcome.replayed).sort()).toEqual([false, true]);
    expect(outcomes[0].result).toEqual(outcomes[1].result);

    const trial = await Trial.findOne({ courtroomId: room.id }).lean();
    expect(trial?.events).toHaveLength(1);
    expect(trial?.commandReceipts).toHaveLength(1);
    expect(trial?.eventSequence).toBe(1);
    expect(trial?.version).toBe(1);

    await expectCommandError(
      executeTrialCommand(
        room.id.toString(),
        room.opponentUserId.toString(),
        duplicateCommand
      ),
      'IDEMPOTENCY_KEY_REUSED'
    );
  });

  it('allows only one of two different commands racing on the same version', async () => {
    const room = await createRoom();
    await startRoom(room);
    const versionOneCommand = (text: string) =>
      argumentCommand(1, text);

    const outcomes = await Promise.allSettled([
      executeTrialCommand(room.id.toString(), room.hostUserId.toString(), versionOneCommand('Opening A')),
      executeTrialCommand(room.id.toString(), room.hostUserId.toString(), versionOneCommand('Opening B')),
    ]);

    const accepted = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'VERSION_CONFLICT' });

    const trial = await Trial.findOne({ courtroomId: room.id }).lean();
    expect(trial?.events).toHaveLength(2);
    expect(trial?.commandReceipts).toHaveLength(2);
    expect(trial?.eventSequence).toBe(2);
    expect(trial?.version).toBe(2);
  });

  it('returns a stored result when retrying after later phase advancement', async () => {
    const room = await createRoom();
    await startRoom(room);
    const opening = argumentCommand(1, 'Opening submission');

    const original = await executeTrialCommand(
      room.id.toString(),
      room.hostUserId.toString(),
      opening
    );
    await executeTrialCommand(
      room.id.toString(),
      room.opponentUserId.toString(),
      argumentCommand(2, 'Response opening')
    );

    const retried = await executeTrialCommand(
      room.id.toString(),
      room.hostUserId.toString(),
      opening
    );
    expect(retried.replayed).toBe(true);
    expect(retried.result).toEqual(original.result);

    const changedPayload = argumentCommand(1, 'Changed opening', opening.commandId);
    await expectCommandError(
      executeTrialCommand(room.id.toString(), room.hostUserId.toString(), changedPayload),
      'IDEMPOTENCY_KEY_REUSED'
    );
  });

  it('rejects stale versions without appending events or receipts', async () => {
    const room = await createRoom();
    await startRoom(room);

    await expectCommandError(
      executeTrialCommand(
        room.id.toString(),
        room.hostUserId.toString(),
        argumentCommand(0, 'Stale opening')
      ),
      'VERSION_CONFLICT'
    );

    const trial = await Trial.findOne({ courtroomId: room.id }).lean();
    expect(trial?.events).toHaveLength(1);
    expect(trial?.commandReceipts).toHaveLength(1);
  });

  it('allows only the targeted participant to respond and records a non-legal disposition separately', async () => {
    const room = await createRoom();
    await startRoom(room);

    await expectCommandError(
      executeTrialCommand(
        room.id.toString(),
        room.hostUserId.toString(),
        makeCommand({
          type: 'RAISE_OBJECTION',
          commandId: commandId(),
          expectedVersion: 1,
          targetEventId: new Types.ObjectId().toString(),
          category: 'OUT_OF_SCOPE',
          reason: 'Opening-stage objections are not enabled.',
        })
      ),
      'OBJECTION_NOT_ALLOWED'
    );

    await executeTrialCommand(room.id.toString(), room.hostUserId.toString(), argumentCommand(1, 'Opening'));
    await executeTrialCommand(room.id.toString(), room.opponentUserId.toString(), argumentCommand(2, 'Response'));
    const argument = argumentCommand(3, 'First-side argument');
    await executeTrialCommand(room.id.toString(), room.hostUserId.toString(), argument);

    const trialAfterArgument = await Trial.findOne({ courtroomId: room.id }).lean();
    const argumentEvent = trialAfterArgument?.events.find(
      (event: TrialEventRecord) => event.commandId === argument.commandId
    );
    expect(argumentEvent).toBeTruthy();

    const objection = makeCommand({
      type: 'RAISE_OBJECTION',
      commandId: commandId(),
      expectedVersion: 4,
      targetEventId: argumentEvent?._id.toString(),
      category: 'OUT_OF_SCOPE',
      reason: 'Please address the stated issue.',
    });
    const raised = await executeTrialCommand(
      room.id.toString(),
      room.opponentUserId.toString(),
      objection
    );

    const response = makeCommand({
      type: 'RESPOND_TO_OBJECTION',
      commandId: commandId(),
      expectedVersion: 5,
      objectionEventId: raised.result.eventIds[0],
      decision: 'ACKNOWLEDGE',
      response: 'Acknowledged for this simulation.',
    });
    await expectCommandError(
      executeTrialCommand(room.id.toString(), room.opponentUserId.toString(), response),
      'NOT_OBJECTION_RESPONDENT'
    );

    const resolved = await executeTrialCommand(
      room.id.toString(),
      room.hostUserId.toString(),
      response
    );
    expect(resolved.result.eventIds).toHaveLength(2);

    const finalTrial = await Trial.findOne({ courtroomId: room.id }).lean();
    const responseEvents = finalTrial?.events.slice(-2);
    expect(responseEvents?.map((event: TrialEventRecord) => event.type)).toEqual([
      'OBJECTION_RESPONSE_RECORDED',
      'OBJECTION_DISPOSITION_RECORDED',
    ]);
    expect(responseEvents?.[1].payload.disposition).toBe('ACKNOWLEDGED');
    expect(responseEvents?.[1].payload.educationalSimulationOnly).toBe(true);
    expect(finalTrial?.pendingObjection).toBeNull();
  });

  it('enforces event and receipt capacity without partially accepting a command', async () => {
    const eventLimitedRoom = await createRoom();
    const eventRecords = Array.from({ length: MAX_TRIAL_EVENTS }, (_, index) => ({
      sequence: index + 1,
      commandId: commandId(),
      actorUserId: eventLimitedRoom.hostUserId,
      type: 'TRIAL_STARTED' as const,
      payload: {},
      occurredAt: new Date(),
    }));
    await Trial.create({
      courtroomId: eventLimitedRoom.id,
      status: 'IN_PROGRESS',
      caseTypeSnapshot: 'Civil',
      templateKey: 'basic-hearing',
      templateVersion: 1,
      currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
      currentTurnRole: 'PLAINTIFF',
      phaseTurnIndex: 0,
      eventSequence: MAX_TRIAL_EVENTS,
      version: 1,
      events: eventRecords,
    });

    await expectCommandError(
      executeTrialCommand(
        eventLimitedRoom.id.toString(),
        eventLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'At capacity')
      ),
      'TRIAL_EVENT_LIMIT_REACHED'
    );
    const eventLimitedTrial = await Trial.findOne({ courtroomId: eventLimitedRoom.id }).lean();
    expect(eventLimitedTrial?.eventSequence).toBe(MAX_TRIAL_EVENTS);
    expect(eventLimitedTrial?.version).toBe(1);
    expect(eventLimitedTrial?.events).toHaveLength(MAX_TRIAL_EVENTS);

    const receiptLimitedRoom = await createRoom();
    const receiptEvents = Array.from({ length: MAX_TRIAL_COMMAND_RECEIPTS - 1 }, (_, index) => ({
      sequence: index + 1,
      commandId: commandId(),
      actorUserId: receiptLimitedRoom.hostUserId,
      type: 'TRIAL_STARTED' as const,
      payload: {},
      occurredAt: new Date(),
    }));
    const commandReceipts = Array.from({ length: MAX_TRIAL_COMMAND_RECEIPTS }, () => {
      const id = commandId();
      return {
        commandId: id,
        requestHash: createHash('sha256').update(id).digest('hex'),
        eventIds: [],
        result: {
          eventIds: [],
          firstSequence: 1,
          lastSequence: 1,
          version: 1,
          status: 'IN_PROGRESS',
          currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
          currentTurnRole: 'PLAINTIFF',
        },
        acceptedAt: new Date(),
      };
    });
    await Trial.create({
      courtroomId: receiptLimitedRoom.id,
      status: 'IN_PROGRESS',
      caseTypeSnapshot: 'Civil',
      templateKey: 'basic-hearing',
      templateVersion: 1,
      currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
      currentTurnRole: 'PLAINTIFF',
      phaseTurnIndex: 0,
      eventSequence: receiptEvents.length,
      version: 1,
      events: receiptEvents,
      commandReceipts,
    });

    await expectCommandError(
      executeTrialCommand(
        receiptLimitedRoom.id.toString(),
        receiptLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'At receipt capacity')
      ),
      'TRIAL_COMMAND_LIMIT_REACHED'
    );
    const receiptLimitedTrial = await Trial.findOne({ courtroomId: receiptLimitedRoom.id }).lean();
    expect(receiptLimitedTrial?.eventSequence).toBe(receiptEvents.length);
    expect(receiptLimitedTrial?.version).toBe(1);
    expect(receiptLimitedTrial?.events).toHaveLength(receiptEvents.length);
    expect(receiptLimitedTrial?.commandReceipts).toHaveLength(MAX_TRIAL_COMMAND_RECEIPTS);
  });

  it('does not exceed either embedded array limit when commands race at capacity', async () => {
    const eventLimitedRoom = await createRoom();
    const nearlyFullEvents = Array.from({ length: MAX_TRIAL_EVENTS - 1 }, (_, index) => ({
      sequence: index + 1,
      commandId: commandId(),
      actorUserId: eventLimitedRoom.hostUserId,
      type: 'TRIAL_STARTED' as const,
      payload: {},
      occurredAt: new Date(),
    }));
    await Trial.create({
      courtroomId: eventLimitedRoom.id,
      status: 'IN_PROGRESS',
      caseTypeSnapshot: 'Civil',
      templateKey: 'basic-hearing',
      templateVersion: 1,
      currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
      currentTurnRole: 'PLAINTIFF',
      phaseTurnIndex: 0,
      eventSequence: nearlyFullEvents.length,
      version: 1,
      events: nearlyFullEvents,
    });

    const eventRace = await Promise.allSettled([
      executeTrialCommand(
        eventLimitedRoom.id.toString(),
        eventLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'Capacity race A')
      ),
      executeTrialCommand(
        eventLimitedRoom.id.toString(),
        eventLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'Capacity race B')
      ),
    ]);
    expect(eventRace.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(eventRace.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const fullTrial = await Trial.findOne({ courtroomId: eventLimitedRoom.id }).lean();
    expect(fullTrial?.events).toHaveLength(MAX_TRIAL_EVENTS);
    expect(fullTrial?.eventSequence).toBe(MAX_TRIAL_EVENTS);

    const receiptLimitedRoom = await createRoom();
    const receiptEvents = Array.from({ length: MAX_TRIAL_COMMAND_RECEIPTS - 2 }, (_, index) => ({
      sequence: index + 1,
      commandId: commandId(),
      actorUserId: receiptLimitedRoom.hostUserId,
      type: 'TRIAL_STARTED' as const,
      payload: {},
      occurredAt: new Date(),
    }));
    const almostFullReceipts = Array.from({ length: MAX_TRIAL_COMMAND_RECEIPTS - 1 }, () => {
      const id = commandId();
      return {
        commandId: id,
        requestHash: createHash('sha256').update(id).digest('hex'),
        eventIds: [],
        result: {
          eventIds: [],
          firstSequence: 1,
          lastSequence: 1,
          version: 1,
          status: 'IN_PROGRESS',
          currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
          currentTurnRole: 'PLAINTIFF',
        },
        acceptedAt: new Date(),
      };
    });
    await Trial.create({
      courtroomId: receiptLimitedRoom.id,
      status: 'IN_PROGRESS',
      caseTypeSnapshot: 'Civil',
      templateKey: 'basic-hearing',
      templateVersion: 1,
      currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
      currentTurnRole: 'PLAINTIFF',
      phaseTurnIndex: 0,
      eventSequence: receiptEvents.length,
      version: 1,
      events: receiptEvents,
      commandReceipts: almostFullReceipts,
    });

    const receiptRace = await Promise.allSettled([
      executeTrialCommand(
        receiptLimitedRoom.id.toString(),
        receiptLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'Receipt race A')
      ),
      executeTrialCommand(
        receiptLimitedRoom.id.toString(),
        receiptLimitedRoom.hostUserId.toString(),
        argumentCommand(1, 'Receipt race B')
      ),
    ]);
    expect(receiptRace.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(receiptRace.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const receiptFullTrial = await Trial.findOne({ courtroomId: receiptLimitedRoom.id }).lean();
    expect(receiptFullTrial?.commandReceipts).toHaveLength(MAX_TRIAL_COMMAND_RECEIPTS);
  });

  it('replays the completed trial from the ordered immutable event history', async () => {
    const room = await createRoom('Criminal');
    let version = (await startRoom(room)).result.version;
    const templateTurns = getTemplateTurns(getTrialTemplate('Criminal'));

    for (const [index, turn] of templateTurns.entries()) {
      const actorUserId =
        turn.role === room.firstSideRole ? room.hostUserId : room.opponentUserId;
      const outcome = await executeTrialCommand(
        room.id.toString(),
        actorUserId.toString(),
        argumentCommand(version, `Argument ${index + 1}`)
      );
      version = outcome.result.version;
    }

    const trial = await Trial.findOne({ courtroomId: room.id }).lean();
    expect(trial).toBeTruthy();
    const replayed = replayTrialEvents('Criminal', trial!.events);
    expect(replayed).toMatchObject({
      status: trial?.status,
      currentPhaseKey: trial?.currentPhaseKey,
      currentTurnRole: trial?.currentTurnRole,
      phaseTurnIndex: trial?.phaseTurnIndex,
    });
    expect(trial?.events.map((event: TrialEventRecord) => event.sequence)).toEqual(
      Array.from({ length: 9 }, (_, index) => index + 1)
    );
    expect(trial?.status).toBe('COMPLETED');
    expect(COURTROOM_MEMBER_ROLES).toContain(room.firstSideRole);
  });
});