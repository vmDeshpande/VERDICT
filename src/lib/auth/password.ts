import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > 72) {
    throw new Error('Password exceeds bcrypt 72-byte limit');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > 72) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
