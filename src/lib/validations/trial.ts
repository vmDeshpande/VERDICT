import { z } from 'zod';
import {
  MAX_ARGUMENT_CHARACTERS,
  MAX_OBJECTION_REASON_CHARACTERS,
  MAX_OBJECTION_RESPONSE_CHARACTERS,
  OBJECTION_CATEGORIES,
  OBJECTION_DECISIONS,
} from '@/lib/trialTypes';

const commandMetadataSchema = z.object({
  commandId: z.string().uuid().transform((commandId) => commandId.toLowerCase()),
  expectedVersion: z.number().int().min(0),
});

const normalizedText = (maxCharacters: number) =>
  z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(z.string().min(1).max(maxCharacters));

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i).transform((id) => id.toLowerCase());

export const trialCommandSchema = z.discriminatedUnion('type', [
  commandMetadataSchema.extend({ type: z.literal('START_TRIAL') }),
  commandMetadataSchema.extend({
    type: z.literal('SUBMIT_ARGUMENT'),
    text: normalizedText(MAX_ARGUMENT_CHARACTERS),
  }),
  commandMetadataSchema.extend({
    type: z.literal('RAISE_OBJECTION'),
    targetEventId: objectIdSchema,
    category: z.enum(OBJECTION_CATEGORIES),
    reason: normalizedText(MAX_OBJECTION_REASON_CHARACTERS),
  }),
  commandMetadataSchema.extend({
    type: z.literal('RESPOND_TO_OBJECTION'),
    objectionEventId: objectIdSchema,
    decision: z.enum(OBJECTION_DECISIONS),
    response: normalizedText(MAX_OBJECTION_RESPONSE_CHARACTERS),
  }),
]);

export type TrialCommand = z.infer<typeof trialCommandSchema>;