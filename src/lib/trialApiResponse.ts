import { NextResponse } from 'next/server';
import { TrialCommandError } from '@/lib/trialCommands';

export function trialApiErrorResponse(error: unknown) {
  if (error instanceof TrialCommandError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }

  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}