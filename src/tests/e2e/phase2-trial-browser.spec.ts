import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { Case } from '../../lib/cases';
import { Courtroom } from '../../lib/courtrooms';
import { CourtroomMember } from '../../lib/courtroomMembers';
import { Session } from '../../lib/sessions';
import { Trial } from '../../lib/trials';
import { User } from '../../lib/users';
import { requireTestDatabaseConfiguration } from '../../lib/testing/test-database-config';

loadEnvConfig(process.cwd());
const testDatabase = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);
const runId = `phase2-browser-${randomUUID()}`;
const password = 'Verdict-test-password-2026';
const contexts: BrowserContext[] = [];

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
  await Promise.all(contexts.map((context) => context.close()));
});

async function createBrowserUser(browser: Browser, label: string, ip: string) {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': ip },
  });
  contexts.push(context);
  const response = await context.request.post('http://localhost:3000/api/auth/register', {
    data: {
      email: `${runId}-${label}@example.test`,
      password,
      name: label,
    },
  });
  expect(response.status()).toBe(201);
  return { context, page: await context.newPage() };
}

test('two participants complete and replay the same ordered hearing', async ({ browser }) => {
  test.setTimeout(90_000);
  const host = await createBrowserUser(browser, 'host', '203.0.113.40');
  const opponent = await createBrowserUser(browser, 'opponent', '203.0.113.41');

  const caseResponse = await host.context.request.post('http://localhost:3000/api/cases', {
    data: {
      title: `${runId} case`,
      description: 'A fictional civil case used for the two-client trial test.',
      jurisdiction: 'India',
      caseType: 'Civil',
      isFictional: true,
    },
  });
  expect(caseResponse.status()).toBe(201);
  const { case: caseDoc } = await caseResponse.json();

  const courtroomResponse = await host.context.request.post('http://localhost:3000/api/courtrooms', {
    data: { caseId: caseDoc._id, hostRole: 'PLAINTIFF' },
  });
  expect(courtroomResponse.status()).toBe(201);
  const { courtroom } = await courtroomResponse.json();

  const courtroomUrl = `http://localhost:3000/courtrooms/${courtroom.id}`;
  await host.page.goto(courtroomUrl);
  await expect(host.page.getByText('Waiting for the opposing participant')).toBeVisible();

  const joinResponse = await opponent.context.request.post('http://localhost:3000/api/courtrooms/join', {
    data: { invitationCode: courtroom.invitationCode },
  });
  expect(joinResponse.status()).toBe(200);

  await opponent.page.goto(courtroomUrl);
  await expect(host.page.getByText('opponent', { exact: true })).toBeVisible();
  await expect(host.page.getByRole('heading', { name: 'Hearing' })).toBeVisible();
  await expect(host.page.getByRole('button', { name: 'Start hearing' })).toBeVisible();
  await expect(opponent.page.getByText('Waiting for the host to start')).toBeVisible();

  await host.page.getByRole('button', { name: 'Start hearing' }).click();
  await expect(host.page.getByText('Your turn')).toBeVisible();
  await expect(opponent.page.getByText('Plaintiff to speak')).toBeVisible();

  const firstArgument = 'The claimant presents the opening submission for the shared transcript.';
  await host.page.getByLabel('Your written argument').fill(firstArgument);
  await host.page.getByRole('button', { name: 'Submit argument' }).click();

  await expect(opponent.page.getByText(firstArgument, { exact: true })).toBeVisible();
  await expect(host.page.getByText('Defendant to speak')).toBeVisible();
  await expect(opponent.page.getByText('Defendant to speak')).toBeVisible();
  await expect(host.page.getByText('#2 argument submitted')).toBeVisible();
  await expect(opponent.page.getByText('#2 argument submitted')).toBeVisible();

  await opponent.page.reload();
  await expect(opponent.page.getByText(firstArgument, { exact: true })).toBeVisible();
  await expect(opponent.page.locator('section[aria-labelledby="trial-transcript-title"] li')).toHaveCount(2);

  const remainingTurns = [
    { page: opponent.page, otherPage: host.page, role: 'Defendant' },
    { page: host.page, otherPage: opponent.page, role: 'Plaintiff' },
    { page: opponent.page, otherPage: host.page, role: 'Defendant' },
    { page: host.page, otherPage: opponent.page, role: 'Plaintiff' },
    { page: opponent.page, otherPage: host.page, role: 'Defendant' },
    { page: opponent.page, otherPage: host.page, role: 'Defendant' },
    { page: host.page, otherPage: opponent.page, role: 'Plaintiff' },
  ];

  for (const [index, turn] of remainingTurns.entries()) {
    await expect(turn.page.getByText('Your turn')).toBeVisible();
    await turn.page.getByLabel('Your written argument').fill(`Hearing submission ${index + 2}.`);
    await turn.page.getByRole('button', { name: 'Submit argument' }).click();

    if (index === 4) {
      await expect(host.page.getByText('Closing statements')).toBeVisible();
      await expect(opponent.page.getByText('Closing statements')).toBeVisible();
    } else if (index < remainingTurns.length - 1) {
      const nextTurn = remainingTurns[index + 1];
      await expect(nextTurn.page.getByText('Your turn')).toBeVisible();
      await expect(nextTurn.otherPage.getByText(`${nextTurn.role} to speak`)).toBeVisible();
    }
  }

  await expect(host.page.getByText('Hearing completed')).toBeVisible();
  await expect(opponent.page.getByText('Hearing completed')).toBeVisible();

  const hostTranscript = host.page.locator('section[aria-labelledby="trial-transcript-title"] li');
  const opponentTranscript = opponent.page.locator('section[aria-labelledby="trial-transcript-title"] li');
  await expect(hostTranscript).toHaveCount(9);
  await expect(opponentTranscript).toHaveCount(9);
  for (let index = 0; index < 9; index++) {
    await expect(hostTranscript.nth(index)).toContainText(`#${index + 1}`);
    await expect(opponentTranscript.nth(index)).toContainText(`#${index + 1}`);
  }

  await host.page.getByRole('button', { name: 'Replay hearing' }).click();
  await expect(host.page.getByText('Replay event 0 of 9')).toBeVisible();
  const replayTranscript = host.page.locator('section[aria-labelledby="trial-transcript-title"] li');
  await expect(replayTranscript).toHaveCount(0);
  await host.page.getByRole('button', { name: 'Next replay event' }).click();
  await expect(replayTranscript).toHaveCount(1);
  await expect(replayTranscript.first()).toContainText('#1');
});