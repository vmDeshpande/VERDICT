import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Case } from '@/lib/cases';
import { Courtroom } from '@/lib/courtrooms';
import { CourtroomMember } from '@/lib/courtroomMembers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createCourtroomSchema } from '@/lib/validations/courtroom';
import { generateUniqueInvitationCode } from '@/lib/invite';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isValidHostRoleForCaseType(caseType: string, hostRole: string): boolean {
  if (caseType === 'Civil') {
    return hostRole === 'PLAINTIFF' || hostRole === 'DEFENDANT';
  }
  if (caseType === 'Criminal') {
    return hostRole === 'PROSECUTION' || hostRole === 'DEFENSE';
  }
  return false;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCourtroomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { caseId, hostRole } = parsed.data;

    await dbConnect();
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseDoc.creatorId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isValidHostRoleForCaseType(caseDoc.caseType, hostRole)) {
      return NextResponse.json({ error: 'Invalid role for case type' }, { status: 400 });
    }

    const invitationCode = await generateUniqueInvitationCode();

    const courtroom = new Courtroom({
      caseId: caseDoc._id,
      title: caseDoc.title,
      jurisdiction: caseDoc.jurisdiction,
      courtType: caseDoc.courtType,
      caseType: caseDoc.caseType,
      status: 'WAITING',
      hostUserId: user._id,
      invitationCode,
      invitationExpiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      maxParticipants: 2,
    });
    try {
      await courtroom.save();

      await CourtroomMember.create({
        courtroomId: courtroom._id,
        userId: user._id,
        role: hostRole,
        joinedAt: new Date(),
      });
    } catch (error) {
      // Clean up incomplete records safely
      try {
        await CourtroomMember.deleteMany({ courtroomId: courtroom._id });
      } catch {
        // ignore
      }
      try {
        await Courtroom.deleteOne({ _id: courtroom._id });
      } catch {
        // ignore
      }
      throw error;
    }

    return NextResponse.json(
      {
        courtroom: {
          id: courtroom._id.toString(),
          title: courtroom.title,
          status: courtroom.status,
          invitationCode: courtroom.invitationCode,
          invitationExpiresAt: courtroom.invitationExpiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: 'Could not create a unique invitation. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create courtroom' }, { status: 500 });
  }
}
