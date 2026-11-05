import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Courtroom } from '@/lib/courtrooms';

export function generateInvitationCode(): string {
  // Cryptographically secure
  return crypto.randomBytes(16).toString('base64url');
}

export async function generateUniqueInvitationCode(): Promise<string> {
  await dbConnect();
  for (let i = 0; i < 10; i++) {
    const code = generateInvitationCode();
    const existing = await Courtroom.findOne({ invitationCode: code });
    if (!existing) {
      return code;
    }
  }
  // Fallback with more entropy
  return crypto.randomBytes(24).toString('base64url');
}

export function normalizeInvitationCode(code: string): string {
  return code.trim();
}
