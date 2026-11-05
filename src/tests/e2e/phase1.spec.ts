import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import { Case } from '../../lib/cases';
import { Courtroom } from '../../lib/courtrooms';
import { CourtroomMember } from '../../lib/courtroomMembers';
import { Session } from '../../lib/sessions';
import { requireTestDatabaseConfiguration } from '../../lib/testing/test-database-config';
import { User } from '../../lib/users';

const testDatabase = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);
const runId = `phase1-${randomUUID()}`;
const password = 'Verdict-test-password-2026';
const clients: APIRequestContext[] = [];
let clientIp = 10;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await mongoose.connect(testDatabase.uri);
  if (mongoose.connection.name !== testDatabase.databaseName) {
    throw new Error('Connected database does not match the validated test database name.');
  }
  await Promise.all([User.init(), Session.init(), Case.init(), Courtroom.init(), CourtroomMember.init()]);
});

test.afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const users = await User.find({ email: { $regex: `^${runId}-` } }).select('_id').lean();
    const userIds = users.map((user) => user._id);
    if (userIds.length > 0) {
      const courtrooms = await Courtroom.find({ hostUserId: { $in: userIds } }).select('_id').lean();
      const courtroomIds = courtrooms.map((courtroom) => courtroom._id);
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
    extraHTTPHeaders: { 'x-forwarded-for': `192.0.2.${clientIp++}` },
  });
  clients.push(client);
  return client;
}

async function createUser(label: string): Promise<{ client: APIRequestContext; email: string }> {
  const client = await createClient();
  const email = `${runId}-${label}@example.test`;
  const response = await client.post('/api/auth/register', {
    data: { email, password, name: label },
  });
  expect(response.status()).toBe(201);
  return { client, email };
}

async function createCase(client: APIRequestContext, title: string) {
  const response = await client.post('/api/cases', {
    data: {
      title,
      description: 'A fictional dispute prepared for integration testing.',
      jurisdiction: 'India',
      caseType: 'Civil',
      isFictional: true,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).case;
}

async function createCourtroom(client: APIRequestContext, caseId: string, hostRole = 'PLAINTIFF') {
  const response = await client.post('/api/courtrooms', { data: { caseId, hostRole } });
  expect(response.status()).toBe(201);
  return (await response.json()).courtroom as {
    id: string;
    invitationCode: string;
    invitationExpiresAt: string;
  };
}

test('registration, duplicate email, login, and logout invalidate the session', async () => {
  const registrationClient = await createClient();
  const email = `${runId}-auth@example.test`;

  const registration = await registrationClient.post('/api/auth/register', {
    data: { email: email.toUpperCase(), password, name: '' },
  });
  expect(registration.status()).toBe(201);
  expect((await registration.json()).user.email).toBe(email);

  const storedUser = await User.findOne({ email }).lean();
  expect(storedUser?.passwordHash).toBeTruthy();
  expect(storedUser?.passwordHash).not.toBe(password);
  expect(await registrationClient.get('/api/auth/me').then((response) => response.status())).toBe(200);

  const duplicate = await registrationClient.post('/api/auth/register', {
    data: { email, password, name: 'Duplicate' },
  });
  expect(duplicate.status()).toBe(409);

  const loginClient = await createClient();
  const invalidLogin = await loginClient.post('/api/auth/login', {
    data: { email, password: 'wrong-password' },
  });
  expect(invalidLogin.status()).toBe(401);
  expect((await invalidLogin.json()).error).toBe('Invalid email or password');

  const login = await loginClient.post('/api/auth/login', { data: { email, password } });
  expect(login.status()).toBe(200);
  const loginData = await login.json();
  expect(JSON.stringify(loginData)).not.toContain('passwordHash');
  expect(await loginClient.get('/api/auth/me').then((response) => response.status())).toBe(200);
  expect(await Session.countDocuments({ userId: loginData.user.id })).toBe(2);

  expect((await loginClient.post('/api/auth/logout')).status()).toBe(200);
  expect(await loginClient.get('/api/auth/me').then((response) => response.status())).toBe(401);
  expect(await Session.countDocuments({ userId: loginData.user.id })).toBe(1);
});

test('protected pages and case APIs enforce creator ownership', async () => {
  const unauthenticated = await createClient();
  const protectedDashboard = await unauthenticated.get('/dashboard', { maxRedirects: 0 });
  expect(protectedDashboard.status()).toBe(307);
  expect(protectedDashboard.headers().location).toContain('/auth/login');
  expect((await unauthenticated.get('/api/cases')).status()).toBe(401);

  const owner = await createUser('case-owner');
  const otherUser = await createUser('case-other');
  const createdCase = await createCase(owner.client, `${runId} case`);

  const ownerCases = await owner.client.get('/api/cases').then((response) => response.json());
  const otherCases = await otherUser.client.get('/api/cases').then((response) => response.json());
  expect(ownerCases.cases.some((item: { _id: string }) => item._id === createdCase._id)).toBe(true);
  expect(otherCases.cases).toHaveLength(0);
  expect((await unauthenticated.post('/api/cases', { data: createdCase })).status()).toBe(401);

  const forbiddenRoom = await otherUser.client.post('/api/courtrooms', {
    data: { caseId: createdCase._id, hostRole: 'PLAINTIFF' },
  });
  expect(forbiddenRoom.status()).toBe(403);
});

test('expired invites, membership roles, duplicate joins, room access, and concurrent claims are enforced', async () => {
  const host = await createUser('room-host');
  const opponent = await createUser('room-opponent');
  const observer = await createUser('room-observer');
  const competingHost = await createUser('competing-host');
  const contenderOne = await createUser('contender-one');
  const contenderTwo = await createUser('contender-two');

  const caseDoc = await createCase(host.client, `${runId} courtroom case`);
  const invalidRole = await host.client.post('/api/courtrooms', {
    data: { caseId: caseDoc._id, hostRole: 'PROSECUTION' },
  });
  expect(invalidRole.status()).toBe(400);

  const courtroom = await createCourtroom(host.client, caseDoc._id);
  const expiry = new Date(courtroom.invitationExpiresAt).getTime();
  expect(expiry).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  expect(expiry).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000);

  const selfJoin = await host.client.post('/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(selfJoin.status()).toBe(400);

  await Courtroom.updateOne(
    { _id: courtroom.id },
    { $set: { invitationExpiresAt: new Date(Date.now() - 1_000) } }
  );
  const expiredJoin = await opponent.client.post('/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(expiredJoin.status()).toBe(410);

  await Courtroom.updateOne(
    { _id: courtroom.id },
    { $set: { invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
  );
  const joined = await opponent.client.post('/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(joined.status()).toBe(200);

  const membersAfterJoin = await CourtroomMember.find({ courtroomId: courtroom.id }).lean();
  expect(membersAfterJoin).toHaveLength(2);

  const duplicateJoin = await opponent.client.post('/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(duplicateJoin.status()).toBe(409);
  const thirdJoin = await observer.client.post('/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(thirdJoin.status()).toBe(409);

  const hostDetail = await host.client.get(`/api/courtrooms/${courtroom.id}`);
  const detail = (await hostDetail.json()).courtroom;
  expect(detail.status).toBe('ACTIVE');
  expect(detail.invitation).toBeNull();
  expect(detail.members.map((member: { role: string }) => member.role).sort()).toEqual(['DEFENDANT', 'PLAINTIFF']);
  expect((await observer.client.get(`/api/courtrooms/${courtroom.id}`)).status()).toBe(403);

  const competingCase = await createCase(competingHost.client, `${runId} concurrency case`);
  const competingRoom = await createCourtroom(competingHost.client, competingCase._id, 'DEFENDANT');
  const concurrentResults = await Promise.all([
    contenderOne.client.post('/api/courtrooms/join', { data: { invitationCode: competingRoom.invitationCode } }),
    contenderTwo.client.post('/api/courtrooms/join', { data: { invitationCode: competingRoom.invitationCode } }),
  ]);
  expect(concurrentResults.map((response) => response.status()).sort()).toEqual([200, 409]);

  const competingMembers = await CourtroomMember.find({ courtroomId: competingRoom.id }).lean();
  expect(competingMembers).toHaveLength(2);
  expect(new Set(competingMembers.map((member) => member.role)).size).toBe(2);
});