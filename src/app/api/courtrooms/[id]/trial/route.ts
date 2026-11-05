import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getTrialSnapshot } from '@/lib/trialCommands';
import { trialApiErrorResponse } from '@/lib/trialApiResponse';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await dbConnect();
    const trial = await getTrialSnapshot(id, user._id.toString());
    return NextResponse.json({ trial }, { status: 200 });
  } catch (error) {
    return trialApiErrorResponse(error);
  }
}