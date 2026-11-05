import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/users';
import { loginSchema } from '@/lib/validations/auth';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { rateLimit, getClientKey } from '@/lib/auth/rate-limit';

export async function POST(request: Request) {
  try {
    const rateKey = getClientKey(request, 'login');
    const rl = rateLimit(rateKey, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { email, password } = parsed.data;

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await createSession(user._id.toString());

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
}
