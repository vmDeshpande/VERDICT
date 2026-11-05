import { describe, expect, it } from 'vitest';
import {
  MAX_ARGUMENT_CHARACTERS,
  MAX_OBJECTION_REASON_CHARACTERS,
  MAX_OBJECTION_RESPONSE_CHARACTERS,
} from '@/lib/trialTypes';
import { trialCommandSchema } from '@/lib/validations/trial';

describe('trial command validation', () => {
  it('normalizes command IDs and argument text before the command is hashed', () => {
    const command = trialCommandSchema.parse({
      type: 'SUBMIT_ARGUMENT',
      commandId: 'A0A0A0A0-A0A0-40A0-80A0-A0A0A0A0A0A0',
      expectedVersion: 3,
      text: '  Cafe\u0301 argument  ',
    });

    expect(command.commandId).toBe('a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0');
    expect(command).toMatchObject({ type: 'SUBMIT_ARGUMENT', text: 'Café argument' });
  });

  it('rejects arguments beyond the configured maximum length', () => {
    const command = trialCommandSchema.safeParse({
      type: 'SUBMIT_ARGUMENT',
      commandId: 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
      expectedVersion: 0,
      text: 'x'.repeat(MAX_ARGUMENT_CHARACTERS + 1),
    });

    expect(command.success).toBe(false);
  });

  it('rejects objection reasons and responses beyond their limits', () => {
    const objection = trialCommandSchema.safeParse({
      type: 'RAISE_OBJECTION',
      commandId: 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
      expectedVersion: 0,
      targetEventId: '0123456789abcdef01234567',
      category: 'REPETITIVE',
      reason: 'x'.repeat(MAX_OBJECTION_REASON_CHARACTERS + 1),
    });
    const response = trialCommandSchema.safeParse({
      type: 'RESPOND_TO_OBJECTION',
      commandId: 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      expectedVersion: 0,
      objectionEventId: '0123456789abcdef01234567',
      decision: 'DISPUTE',
      response: 'x'.repeat(MAX_OBJECTION_RESPONSE_CHARACTERS + 1),
    });

    expect(objection.success).toBe(false);
    expect(response.success).toBe(false);
  });

  it('requires a valid command ID and expected version', () => {
    const command = trialCommandSchema.safeParse({
      type: 'START_TRIAL',
      commandId: 'not-a-uuid',
      expectedVersion: -1,
    });

    expect(command.success).toBe(false);
  });
});