import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import { Case } from '../../lib/cases';
import { Courtroom } from '../../lib/courtrooms';
import { CourtroomMember } from '../../lib/courtroomMembers';
import { Session } from '../../lib/sessions';
import { Trial } from '../../lib/trials';
import { User } from '../../lib/users';
import { requireTestDatabaseConfiguration } from '../../lib/testing/test-database-config';

loadEnvConfig(process.cwd());
const testDatabase = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);
const runId = `phase2-api-${randomUUID()}`;
const password = 'Verdict-test-password-2026';
const clients: APIRequestContext[] = [];
let clientIp = 10;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await mongoose.connect(testDatabase.uri);
  if (mongoose.connection.name !== testDatabase.databaseName) {
    throw new Error('Connected database does not match the validated test database name.');
  }
  await Promise.all([User.init(), Session.init(), Case.init(), Courtroom.init(), CourtroomMember.init(), Trial.init()]);
});

test.afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const users = await User.find({ email: { $regex: `^${runId}-` } }).select('_id').lean();
    const userIds = users.map((user) => user._id);
    if (userIds.length > 0) {
      const courtrooms = await Courtroom.find({ hostUserId: { $in: userIds } }).select('_id').lean();
      const courtroomIds = courtrooms.map((courtroom) => courtroom._id);
      await Trial.deleteMany({ courtroomId: { $in: courtroomIds } });
      await CourtroomMember.deleteMany({
        $or: [{ courtroomId: { $in: courtroomIds } }, { userId: { $in: userIds } }],
      });
      await Courtroom.deleteMany({ _id: { $in: courtroomIds } });
      await Case.deleteMany({ creatorId: { $in: userIds } });
      await Session.deleteMany({ userId: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }
    await mongoose.disconnect();
  }
  await Promise.all(clients.map((client) => client.dispose()));
});

async function createClient(): Promise<APIRequestContext> {
  const client = await playwrightRequest.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${clientIp++}` },
  });
  clients.push(client);
  return client;
}

async function createUser(label: string): Promise<APIRequestContext> {
  const client = await createClient();
  const response = await client.post('/api/auth/register', {
    data: { email: `${runId}-${label}@example.test`, password, name: label },
  });
  expect(response.status()).toBe(201);
  return client;
}

test('trial APIs enforce membership, start explicitly, enforce turns, and serve event cursors', async () => {
  const host = await createUser('host');
  const opponent = await createUser('opponent');
  const outsider = await createUser('outsider');

  const caseResponse = await host.post('/api/cases', {
    data: {
      title: `${runId} case`,
      description: 'A fictional civil case for trial API testing.',
      jurisdiction: 'India',
      caseType: 'Civil',
      isFictional: true,
    },
  });
  expect(caseResponse.status()).toBe(201);
  const { case: caseDoc } = await caseResponse.json();

  const courtroomResponse = await host.post('/api/courtrooms', {
    data: { caseId: caseDoc._id, hostRole: 'PLAINTIFF' },
  });
  expect(courtroomResponse.status()).toBe(201);
  const { courtroom } = await courtroomResponse.json();

  expect(
    (await opponent.post('/api/courtrooms/join', {
      data: { invitationCode: courtroom.invitationCode },
    })).status()
  ).toBe(200);

  const trialPath = `/api/courtrooms/${courtroom.id}/trial`;
  const initialSnapshotResponse = await host.get(trialPath);
  expect(initialSnapshotResponse.status()).toBe(200);
  const initialSnapshot = (await initialSnapshotResponse.json()).trial;
  expect(initialSnapshot.status).toBe('NOT_STARTED');
  expect(initialSnapshot.currentPhaseKey).toBeNull();
  expect(initialSnapshot.currentTurnRole).toBeNull();
  expect(initialSnapshot.myRole).toBe('PLAINTIFF');
  expect(JSON.stringify(initialSnapshot)).not.toContain('commandReceipts');

  expect((await outsider.get(trialPath)).status()).toBe(403);
  expect((await outsider.get(`${trialPath}/events?afterSequence=invalid`)).status()).toBe(403);

  const startCommand = {
    type: 'START_TRIAL',
    commandId: randomUUID(),
    expectedVersion: 0,
  };
  const startResponse = await host.post(`${trialPath}/commands`, { data: startCommand });
  expect(startResponse.status()).toBe(200);
  const startResult = await startResponse.json();
  expect(startResult).toMatchObject({
    firstSequence: 1,
    lastSequence: 1,
    version: 1,
    status: 'IN_PROGRESS',
    currentPhaseKey: 'OPENING',
    currentTurnRole: 'PLAINTIFF',
  });

  const startRetry = await host.post(`${trialPath}/commands`, { data: startCommand });
  expect(startRetry.status()).toBe(200);
  expect(await startRetry.json()).toEqual(startResult);

  const wrongTurn = await opponent.post(`${trialPath}/commands`, {
    data: {
      type: 'SUBMIT_ARGUMENT',
      commandId: randomUUID(),
      expectedVersion: 1,
      text: 'Attempt to speak out of turn.',
    },
  });
  expect(wrongTurn.status()).toBe(409);
  expect((await wrongTurn.json()).error).toBe('NOT_YOUR_TURN');

  const argumentResponse = await host.post(`${trialPath}/commands`, {
    data: {
      type: 'SUBMIT_ARGUMENT',
      commandId: randomUUID(),
      expectedVersion: 1,
      text: 'The claimant presents the opening argument.',
    },
  });
  expect(argumentResponse.status()).toBe(200);
  const argumentResult = await argumentResponse.json();
  expect(argumentResult).toMatchObject({
    firstSequence: 2,
    lastSequence: 2,
    version: 2,
    currentPhaseKey: 'OPENING',
    currentTurnRole: 'DEFENDANT',
  });

  const firstPage = await host.get(`${trialPath}/events?afterSequence=0&limit=1`);
  expect(firstPage.status()).toBe(200);
  expect(await firstPage.json()).toMatchObject({
    afterSequence: 0,
    headSequence: 2,
    hasMore: true,
    events: [{ sequence: 1, type: 'TRIAL_STARTED' }],
  });

  const nextPage = await opponent.get(`${trialPath}/events?afterSequence=1`);
  expect(nextPage.status()).toBe(200);
  expect((await nextPage.json()).events).toMatchObject([
    { sequence: 2, type: 'ARGUMENT_SUBMITTED', actorUserId: (await User.findOne({ email: `${runId}-host@example.test` }).lean())?._id.toString() },
  ]);

  const replayBeforeCompletion = await host.get(`${trialPath}/replay`);
  expect(replayBeforeCompletion.status()).toBe(409);
  expect((await replayBeforeCompletion.json()).error).toBe('TRIAL_NOT_COMPLETED');
});
