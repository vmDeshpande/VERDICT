import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/users';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { rateLimit, getClientKey } from '@/lib/auth/rate-limit';

export async function POST(request: Request) {
  try {
    const rateKey = getClientKey(request);
    const rl = rateLimit(egister:, 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    await dbConnect();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const user = await User.create({
      email,
      passwordHash,
      name: name || undefined,
    });

    await createSession(user._id.toString());

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
