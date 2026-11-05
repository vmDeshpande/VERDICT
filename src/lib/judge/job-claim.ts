import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { Trial } from '@/lib/trials';

export type JudgeJobTaskType = 'INTRODUCTION' | 'OBSERVATION' | 'FINAL_JUDGMENT';
export type JudgeJobStatus = 'CLAIMED' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'RETRYABLE' | 'EXPIRED';

export interface JudgeJobClaim {
  jobId: string;
  trialId: string;
  triggerEventId: string;
  taskType: JudgeJobTaskType;
  claimedBy: string;
  leaseToken: string;
  leaseExpiresAt: Date;
  status: 'CLAIMED';
}

export interface JudgeJobRecord {
  jobId: string;
  trialId: string;
  triggerEventId: string;
  taskType: JudgeJobTaskType;
  status: JudgeJobStatus;
  claimedBy: string;
  leaseToken: string;
  leaseExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  modelOutput: unknown | null;
  error: unknown | null;
}

export function buildJudgeJobIdentity(trialId: string, triggerEventId: string, taskType: JudgeJobTaskType): string {
  return `${trialId}:${triggerEventId}:${taskType}`;
}

export function decodeJudgeJobIdentity(jobId: string): { trialId: string; triggerEventId: string; taskType: JudgeJobTaskType } {
  const [trialId, triggerEventId, taskType] = jobId.split(':');
  if (!trialId || !triggerEventId || !taskType) {
    throw new Error('Invalid judge job identity.');
  }
  return { trialId, triggerEventId, taskType: taskType as JudgeJobTaskType };
}

export async function createJudgeJobClaim(
  trialId: string,
  triggerEventId: string,
  taskType: JudgeJobTaskType,
  claimedBy: string,
  leaseMs: number,
  now = new Date()
): Promise<JudgeJobClaim | null> {
  const jobId = buildJudgeJobIdentity(trialId, triggerEventId, taskType);
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  const insertResult = await Trial.updateOne(
    {
      _id: new Types.ObjectId(trialId),
      judgeJobs: { $not: { $elemMatch: { jobId } } },
    },
    {
      $push: {
        judgeJobs: {
          jobId,
          trialId,
          triggerEventId,
          taskType,
          status: 'CLAIMED',
          claimedBy,
          leaseToken,
          leaseExpiresAt,
          createdAt: now,
          updatedAt: now,
          modelOutput: null,
          error: null,
        },
      },
    }
  );

  if (insertResult.matchedCount === 1 || insertResult.modifiedCount === 1) {
    return {
      jobId,
      trialId,
      triggerEventId,
      taskType,
      claimedBy,
      leaseToken,
      leaseExpiresAt,
      status: 'CLAIMED',
    };
  }

  return claimJudgeJob(trialId, triggerEventId, taskType, claimedBy, leaseMs, now);
}

export async function claimJudgeJob(
  trialId: string,
  triggerEventId: string,
  taskType: JudgeJobTaskType,
  claimedBy: string,
  leaseMs: number,
  now = new Date()
): Promise<JudgeJobClaim | null> {
  const jobId = buildJudgeJobIdentity(trialId, triggerEventId, taskType);
  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  const existing = await Trial.findOne({ _id: new Types.ObjectId(trialId), 'judgeJobs.jobId': jobId }).lean();
  const currentJob = existing?.judgeJobs?.find((job: JudgeJobRecord) => job.jobId === jobId) as JudgeJobRecord | undefined;

  if (!currentJob) {
    return createJudgeJobClaim(trialId, triggerEventId, taskType, claimedBy, leaseMs, now);
  }

  if (currentJob.status === 'SUCCEEDED') {
    return null;
  }

  if (currentJob.status === 'FAILED') {
    return null;
  }

  if (currentJob.status === 'CLAIMED' && currentJob.leaseExpiresAt > now) {
    return null;
  }

  const result = await Trial.findOneAndUpdate(
    {
      _id: new Types.ObjectId(trialId),
      judgeJobs: {
        $elemMatch: {
          jobId,
          $or: [
            { status: 'RETRYABLE' },
            { status: 'EXPIRED' },
            { status: 'CLAIMED', leaseExpiresAt: { $lte: now } },
          ],
        },
      },
    },
    {
      $set: {
        'judgeJobs.$[job].status': 'CLAIMED',
        'judgeJobs.$[job].claimedBy': claimedBy,
        'judgeJobs.$[job].leaseToken': leaseToken,
        'judgeJobs.$[job].leaseExpiresAt': leaseExpiresAt,
        'judgeJobs.$[job].updatedAt': now,
      },
    },
    {
      returnDocument: 'after',
      arrayFilters: [
        {
          'job.jobId': jobId,
          'job.status': { $in: ['RETRYABLE', 'EXPIRED', 'CLAIMED'] },
          'job.leaseExpiresAt': { $lte: now },
        },
      ],
    }
  ).lean();

  if (!result) {
    return null;
  }

  const job = result.judgeJobs?.find((candidate: JudgeJobRecord) => candidate.jobId === jobId) as JudgeJobRecord | undefined;
  if (!job || job.status !== 'CLAIMED') {
    return null;
  }

  return {
    jobId,
    trialId,
    triggerEventId,
    taskType,
    claimedBy,
    leaseToken,
    leaseExpiresAt,
    status: 'CLAIMED',
  };
}

export async function renewJudgeJobLease(
  trialId: string,
  jobId: string,
  leaseToken: string,
  leaseMs: number,
  now = new Date()
): Promise<boolean> {
  const nextLeaseExpiresAt = new Date(now.getTime() + leaseMs);
  const result = await Trial.updateOne(
    {
      _id: new Types.ObjectId(trialId),
      judgeJobs: {
        $elemMatch: {
          jobId,
          status: 'CLAIMED',
          leaseToken,
          leaseExpiresAt: { $gt: now },
        },
      },
    },
    {
      $set: {
        'judgeJobs.$[job].leaseExpiresAt': nextLeaseExpiresAt,
        'judgeJobs.$[job].updatedAt': now,
      },
    },
    {
      arrayFilters: [
        {
          'job.jobId': jobId,
          'job.status': 'CLAIMED',
          'job.leaseToken': leaseToken,
          'job.leaseExpiresAt': { $gt: now },
        },
      ],
    }
  );

  return result.modifiedCount === 1;
}

export async function completeJudgeJob(
  trialId: string,
  jobId: string,
  leaseToken: string,
  payload: unknown,
  now = new Date()
): Promise<boolean> {
  const result = await Trial.updateOne(
    {
      _id: new Types.ObjectId(trialId),
      judgeJobs: {
        $elemMatch: {
          jobId,
          status: 'CLAIMED',
          leaseToken,
          leaseExpiresAt: { $gt: now },
        },
      },
    },
    {
      $set: {
        'judgeJobs.$[job].status': 'SUCCEEDED',
        'judgeJobs.$[job].leaseExpiresAt': now,
        'judgeJobs.$[job].updatedAt': now,
        'judgeJobs.$[job].modelOutput': payload,
        'judgeJobs.$[job].error': null,
      },
    },
    {
      arrayFilters: [
        {
          'job.jobId': jobId,
          'job.status': 'CLAIMED',
          'job.leaseToken': leaseToken,
          'job.leaseExpiresAt': { $gt: now },
        },
      ],
    }
  );

  return result.modifiedCount === 1;
}

export async function failJudgeJob(
  trialId: string,
  jobId: string,
  leaseToken: string,
  error: unknown,
  retryable = true,
  now = new Date()
): Promise<boolean> {
  const result = await Trial.updateOne(
    {
      _id: new Types.ObjectId(trialId),
      judgeJobs: {
        $elemMatch: {
          jobId,
          status: 'CLAIMED',
          leaseToken,
          leaseExpiresAt: { $gt: now },
        },
      },
    },
    {
      $set: {
        'judgeJobs.$[job].status': retryable ? 'RETRYABLE' : 'FAILED',
        'judgeJobs.$[job].updatedAt': now,
        'judgeJobs.$[job].error': error,
        'judgeJobs.$[job].leaseExpiresAt': now,
      },
    },
    {
      arrayFilters: [
        {
          'job.jobId': jobId,
          'job.status': 'CLAIMED',
          'job.leaseToken': leaseToken,
          'job.leaseExpiresAt': { $gt: now },
        },
      ],
    }
  );

  return result.modifiedCount === 1;
}

export async function retryJudgeJob(
  trialId: string,
  triggerEventId: string,
  taskType: JudgeJobTaskType,
  claimedBy: string,
  leaseMs: number,
  now = new Date()
): Promise<JudgeJobClaim | null> {
  const jobId = buildJudgeJobIdentity(trialId, triggerEventId, taskType);
  const existing = await Trial.findOne({ _id: new Types.ObjectId(trialId), 'judgeJobs.jobId': jobId }).lean();
  const job = existing?.judgeJobs?.find((candidate: JudgeJobRecord) => candidate.jobId === jobId) as JudgeJobRecord | undefined;

  if (!job || job.status === 'SUCCEEDED') {
    return null;
  }

  if (job.status === 'FAILED' || job.status === 'RETRYABLE') {
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    const update = await Trial.updateOne(
      {
        _id: new Types.ObjectId(trialId),
        judgeJobs: {
          $elemMatch: {
            jobId,
            status: { $in: ['FAILED', 'RETRYABLE'] },
          },
        },
      },
      {
        $set: {
          'judgeJobs.$[job].status': 'CLAIMED',
          'judgeJobs.$[job].claimedBy': claimedBy,
          'judgeJobs.$[job].leaseToken': leaseToken,
          'judgeJobs.$[job].leaseExpiresAt': leaseExpiresAt,
          'judgeJobs.$[job].updatedAt': now,
        },
      },
      {
        arrayFilters: [
          {
            'job.jobId': jobId,
            'job.status': { $in: ['FAILED', 'RETRYABLE'] },
          },
        ],
      }
    );

    if (update.modifiedCount !== 1) {
      return null;
    }

    return {
      jobId,
      trialId,
      triggerEventId,
      taskType,
      claimedBy,
      leaseToken,
      leaseExpiresAt,
      status: 'CLAIMED',
    };
  }

  return claimJudgeJob(trialId, triggerEventId, taskType, claimedBy, leaseMs, now);
}
