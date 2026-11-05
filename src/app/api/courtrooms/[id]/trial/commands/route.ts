import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { executeTrialCommand } from '@/lib/trialCommands';
import { trialApiErrorResponse } from '@/lib/trialApiResponse';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let command: unknown;
  try {
    command = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { id } = await params;
    await dbConnect();
    const outcome = await executeTrialCommand(id, user._id.toString(), command);
    return NextResponse.json(outcome.result, { status: 200 });
  } catch (error) {
    return trialApiErrorResponse(error);
  }
}