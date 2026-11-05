import dbConnect from '@/lib/db';
import { Session } from '@/lib/sessions';
import { User } from '@/lib/users';
import { getSessionTokenFromCookie, hashSessionToken } from './session';

export async function getCurrentUser() {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return null;
  }

  await dbConnect();
  const tokenHash = hashSessionToken(token);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const user = await User.findById(session.userId).select('-passwordHash').lean();
  if (!user) {
    return null;
  }

  return user;
}
