// @vitest-environment node

import { loadEnvConfig } from '@next/env';
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Trial } from '@/lib/trials';
import {
  buildJudgeJobIdentity,
  claimJudgeJob,
  completeJudgeJob,
  createJudgeJobClaim,
  failJudgeJob,
  retryJudgeJob,
} from '@/lib/judge/job-claim';
import { MAX_TRIAL_EVENTS } from '@/lib/trialTypes';
import { requireTestDatabaseConfiguration } from '@/lib/testing/test-database-config';

loadEnvConfig(process.cwd());
const testDatabase = requireTestDatabaseConfiguration(process.env.TEST_MONGODB_URI);

const createdTrialIds: Types.ObjectId[] = [];

async function createTrialWithJudgeJobs() {
  const trial = await Trial.create({
    courtroomId: new Types.ObjectId(),
    caseTypeSnapshot: 'Civil',
    templateKey: 'basic-hearing',
    templateVersion: 1,
    status: 'IN_PROGRESS',
    currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
    currentTurnRole: 'PLAINTIFF',
    phaseTurnIndex: 0,
    eventSequence: 0,
    version: 2,
    judgeJobs: [],
    startedAt: new Date(),
    completedAt: null,
    events: [],
    commandReceipts: [],
  });
  createdTrialIds.push(trial._id);
  return trial;
}

describe('judge job claim persistence', () => {
  beforeAll(async () => {
    await mongoose.connect(testDatabase.uri);
    if (mongoose.connection.name !== testDatabase.databaseName) {
      throw new Error('Connected database does not match the validated test database name.');
    }
    await Trial.init();
  }, 30_000);

  afterAll(async () => {
    if (createdTrialIds.length > 0) {
      await Trial.deleteMany({ _id: { $in: createdTrialIds } });
    }
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  });

  it('only one claim wins for the same stable judge job identity', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const first = await claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000);
    const second = await claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000);

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    const saved = await Trial.findById(trial._id).lean();
    const job = saved?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(job?.status).toBe('CLAIMED');
    expect(job?.claimedBy).toBe('worker-a');
  });

  it('reclaims expired claims but never succeeds against a newer lease token', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'INTRODUCTION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const firstClaim = await claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-a', 10, new Date('2026-01-01T00:00:00.000Z'));
    expect(firstClaim).not.toBeNull();

    const secondClaim = await claimJudgeJob(
      trial._id.toString(),
      triggerEventId,
      taskType,
      'worker-b',
      30_000,
      new Date('2026-01-01T00:00:20.000Z')
    );
    expect(secondClaim).not.toBeNull();
    const updated = await Trial.findOne({ _id: trial._id }).lean();
    const afterClaim = updated?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(afterClaim?.claimedBy).toBe('worker-b');
    expect(afterClaim?.leaseToken).not.toBe(firstClaim?.leaseToken);
  });

  it('fails without overwriting a newer lease token and keeps FAILED non-reclaimable until explicit retry', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'FINAL_JUDGMENT' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const firstClaim = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(firstClaim).not.toBeNull();

    const staleFailure = await failJudgeJob(
      trial._id.toString(),
      jobId,
      firstClaim!.leaseToken,
      { code: 'provider' },
      true,
      new Date('2026-01-01T00:00:20.000Z')
    );
    expect(staleFailure).toBe(true);

    const afterFailure = await Trial.findOne({ _id: trial._id }).lean();
    const failedJob = afterFailure?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(failedJob?.status).toBe('RETRYABLE');

    const retry = await retryJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:40.000Z'));
    expect(retry).not.toBeNull();

    const afterRetry = await Trial.findOne({ _id: trial._id }).lean();
    const retried = afterRetry?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(retried?.status).toBe('CLAIMED');
    expect(retried?.claimedBy).toBe('worker-b');
  });

  it('creates the first job in CLAIMED state and insertion losers do not call Gemini', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const claimed = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 60_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(claimed).not.toBeNull();

    const insertAgain = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-b', 60_000, new Date('2026-01-01T00:00:05.000Z'));
    expect(insertAgain).toBeNull();

    const saved = await Trial.findOne({ _id: trial._id }).lean();
    const job = saved?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(job?.status).toBe('CLAIMED');
    expect(job?.claimedBy).toBe('worker-a');
  });

  it('completion and failure require the matching lease token and unexpired lease', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const claim = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(claim).not.toBeNull();

    const completed = await completeJudgeJob(trial._id.toString(), jobId, claim!.leaseToken, { ok: true }, new Date('2026-01-01T00:00:10.000Z'));
    expect(completed).toBe(true);

    const staleComplete = await completeJudgeJob(
      trial._id.toString(),
      jobId,
      claim!.leaseToken,
      { ok: false },
      new Date('2026-01-01T00:00:20.000Z')
    );
    expect(staleComplete).toBe(false);

    const failed = await failJudgeJob(
      trial._id.toString(),
      jobId,
      claim!.leaseToken,
      { code: 'provider', message: 'still stale' },
      false,
      new Date('2026-01-01T00:00:25.000Z')
    );
    expect(failed).toBe(false);
  });

  it('returns null without recursion when the trial does not exist', async () => {
    const trialId = new Types.ObjectId().toHexString();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;

    await expect(createJudgeJobClaim(trialId, triggerEventId, taskType, 'worker-a', 30_000)).resolves.toBeNull();
    await expect(claimJudgeJob(trialId, triggerEventId, taskType, 'worker-b', 30_000)).resolves.toBeNull();
  });

  it('fails to complete a judge job when the trial event limit is reached', async () => {
    const trial = await Trial.create({
      courtroomId: new Types.ObjectId(),
      caseTypeSnapshot: 'Civil',
      templateKey: 'basic-hearing',
      templateVersion: 1,
      status: 'IN_PROGRESS',
      currentPhaseKey: 'FIRST_SIDE_ARGUMENT',
      currentTurnRole: 'PLAINTIFF',
      phaseTurnIndex: 0,
      eventSequence: MAX_TRIAL_EVENTS,
      version: 7,
      judgeJobs: [
        {
          jobId: 'trial-job-limit:trigger:OBSERVATION',
          trialId: 'trial-job-limit',
          triggerEventId: 'trigger',
          taskType: 'OBSERVATION',
          status: 'CLAIMED',
          claimedBy: 'worker-a',
          leaseToken: 'lease-limit',
          leaseExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          modelOutput: null,
          error: null,
        },
      ],
      startedAt: new Date(),
      completedAt: null,
      events: Array.from({ length: MAX_TRIAL_EVENTS }, (_, index) => ({
        _id: new Types.ObjectId(),
        sequence: index + 1,
        commandId: `event-${index}`,
        source: 'PARTICIPANT',
        actorUserId: new Types.ObjectId(),
        type: 'ARGUMENT_SUBMITTED',
        payload: { index },
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
      commandReceipts: [],
    });
    createdTrialIds.push(trial._id);

    const completed = await completeJudgeJob(
      trial._id.toString(),
      'trial-job-limit:trigger:OBSERVATION',
      'lease-limit',
      { ok: true },
      new Date('2026-01-01T00:00:10.000Z')
    );

    expect(completed).toBe(false);

    const saved = await Trial.findById(trial._id).lean();
    expect(saved?.judgeJobs[0]?.status).toBe('CLAIMED');
    expect(saved?.events).toHaveLength(MAX_TRIAL_EVENTS);
    expect(saved?.eventSequence).toBe(MAX_TRIAL_EVENTS);
    expect(saved?.version).toBe(7);
  });

  it('simultaneous first-time claims produce exactly one winner and one stored job', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;

    const results = await Promise.all([
      createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z')),
      createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:00.000Z')),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const winner = results.find((result) => result !== null);
    const saved = await Trial.findById(trial._id).lean();
    const jobs = saved?.judgeJobs.filter((entry: { jobId: string }) => entry.jobId === buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType));
    expect(jobs).toHaveLength(1);
    expect(saved?.judgeJobs).toHaveLength(1);
    expect(jobs?.[0]?.leaseToken).toBe(winner?.leaseToken);
  });

  it('simultaneous expired-lease recovery produces exactly one winner and a valid new lease token', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'INTRODUCTION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const initialClaim = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(initialClaim).not.toBeNull();

    await Trial.updateOne(
      { _id: trial._id, 'judgeJobs.jobId': jobId },
      {
        $set: {
          'judgeJobs.$[job].leaseExpiresAt': new Date('2026-01-01T00:00:00.000Z'),
          'judgeJobs.$[job].leaseToken': 'expired-token',
          'judgeJobs.$[job].updatedAt': new Date('2026-01-01T00:00:00.000Z'),
        },
      },
      { arrayFilters: [{ 'job.jobId': jobId }] }
    );

    const results = await Promise.all([
      claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:10.000Z')),
      claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-c', 30_000, new Date('2026-01-01T00:00:10.000Z')),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const winner = results.find((result) => result !== null);
    const saved = await Trial.findById(trial._id).lean();
    const job = saved?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(job?.claimedBy).toBe(winner?.claimedBy);
    expect(job?.leaseToken).toBe(winner?.leaseToken);
    expect(await completeJudgeJob(trial._id.toString(), jobId, 'expired-token', { ok: false }, new Date('2026-01-01T00:00:20.000Z'))).toBe(false);
    expect(await failJudgeJob(trial._id.toString(), jobId, 'expired-token', { code: 'stale' }, true, new Date('2026-01-01T00:00:20.000Z'))).toBe(false);
  });

  it('simultaneous explicit retries produce exactly one winner and invalidate the previous lease', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'FINAL_JUDGMENT' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const initial = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(initial).not.toBeNull();

    await Trial.updateOne(
      { _id: trial._id, 'judgeJobs.jobId': jobId },
      {
        $set: {
          'judgeJobs.$[job].status': 'FAILED',
          'judgeJobs.$[job].error': { code: 'provider' },
          'judgeJobs.$[job].leaseToken': 'failed-token',
          'judgeJobs.$[job].leaseExpiresAt': new Date('2026-01-01T00:00:20.000Z'),
          'judgeJobs.$[job].updatedAt': new Date('2026-01-01T00:00:20.000Z'),
        },
      },
      { arrayFilters: [{ 'job.jobId': jobId }] }
    );

    const results = await Promise.all([
      retryJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:30.000Z')),
      retryJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-c', 30_000, new Date('2026-01-01T00:00:30.000Z')),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const winner = results.find((result) => result !== null);
    const saved = await Trial.findById(trial._id).lean();
    const job = saved?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(job?.status).toBe('CLAIMED');
    expect(job?.claimedBy).toBe(winner?.claimedBy);
    expect(job?.leaseToken).toBe(winner?.leaseToken);
    expect(await completeJudgeJob(trial._id.toString(), jobId, 'failed-token', { ok: false }, new Date('2026-01-01T00:00:40.000Z'))).toBe(false);
  });

  it('stale worker takeover is rejected after a newer lease is claimed', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'OBSERVATION' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const original = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 10_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(original).not.toBeNull();

    const reclaimed = await claimJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:20.000Z'));
    expect(reclaimed).not.toBeNull();

    expect(await completeJudgeJob(trial._id.toString(), jobId, original!.leaseToken, { stale: true }, new Date('2026-01-01T00:00:25.000Z'))).toBe(false);
    expect(await failJudgeJob(trial._id.toString(), jobId, original!.leaseToken, { stale: true }, true, new Date('2026-01-01T00:00:25.000Z'))).toBe(false);

    const completed = await completeJudgeJob(trial._id.toString(), jobId, reclaimed!.leaseToken, { ok: true }, new Date('2026-01-01T00:00:30.000Z'));
    expect(completed).toBe(true);
  });

  it('appends a judge event and advances the trial sequence when a judge job succeeds', async () => {
    const trial = await createTrialWithJudgeJobs();
    const triggerEventId = new Types.ObjectId().toHexString();
    const taskType = 'FINAL_JUDGMENT' as const;
    const jobId = buildJudgeJobIdentity(trial._id.toString(), triggerEventId, taskType);

    const claim = await createJudgeJobClaim(trial._id.toString(), triggerEventId, taskType, 'worker-a', 30_000, new Date('2026-01-01T00:00:00.000Z'));
    expect(claim).not.toBeNull();

    const completed = await completeJudgeJob(
      trial._id.toString(),
      jobId,
      claim!.leaseToken,
      { summary: 'guilty verdict' },
      new Date('2026-01-01T00:00:10.000Z')
    );

    expect(completed).toBe(true);

    const saved = await Trial.findById(trial._id).lean();
    const job = saved?.judgeJobs.find((entry: { jobId: string }) => entry.jobId === jobId);
    expect(job?.status).toBe('SUCCEEDED');
    expect(job?.modelOutput).toEqual({ summary: 'guilty verdict' });
    expect(saved?.eventSequence).toBe(1);
    expect(saved?.version).toBe(3);
    expect(saved?.events).toHaveLength(1);
    expect(saved?.events[0]).toMatchObject({
      type: 'JUDGE_JUDGMENT',
      source: 'JUDGE',
      actorUserId: null,
      payload: {
        jobId,
        taskType,
        triggerEventId,
      },
    });
  });
});
