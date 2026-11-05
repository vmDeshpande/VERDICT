import { z } from 'zod';

export const createCourtroomSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  hostRole: z.enum(['PLAINTIFF', 'DEFENDANT', 'PROSECUTION', 'DEFENSE']),
});

export const joinCourtroomSchema = z.object({
  invitationCode: z.string().trim().min(1, 'Invitation code is required'),
});

export type CreateCourtroomInput = z.infer<typeof createCourtroomSchema>;
export type JoinCourtroomInput = z.infer<typeof joinCourtroomSchema>;
