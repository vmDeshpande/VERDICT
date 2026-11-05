// @vitest-environment node

import { randomUUID } from 'node:crypto';
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
    const job = saved?.judgeJobs.find((entry) => entry.jobId === jobId);
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
    const afterClaim = updated?.judgeJobs.find((entry) => entry.jobId === jobId);
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
    const failedJob = afterFailure?.judgeJobs.find((entry) => entry.jobId === jobId);
    expect(failedJob?.status).toBe('RETRYABLE');

    const retry = await retryJudgeJob(trial._id.toString(), triggerEventId, taskType, 'worker-b', 30_000, new Date('2026-01-01T00:00:40.000Z'));
    expect(retry).not.toBeNull();

    const afterRetry = await Trial.findOne({ _id: trial._id }).lean();
    const retried = afterRetry?.judgeJobs.find((entry) => entry.jobId === jobId);
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
    const job = saved?.judgeJobs.find((entry) => entry.jobId === jobId);
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
});
