import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { getTrialEvents } from '@/lib/trialCommands';
import { trialApiErrorResponse } from '@/lib/trialApiResponse';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const url = new URL(request.url);
    await dbConnect();
    const result = await getTrialEvents(
      id,
      user._id.toString(),
      url.searchParams.get('afterSequence'),
      url.searchParams.get('limit')
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return trialApiErrorResponse(error);
  }
}