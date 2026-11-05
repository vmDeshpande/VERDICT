import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Case } from '@/lib/cases';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createCaseSchema } from '@/lib/validations/case';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const cases = await Case.find({ creatorId: user._id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ cases }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { title, description, jurisdiction, caseType, courtType, isFictional } = parsed.data;

    await dbConnect();
    const newCase = await Case.create({
      title,
      description,
      jurisdiction,
      caseType,
      courtType: courtType || undefined,
      isFictional: isFictional || false,
      creatorId: user._id,
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }
}
