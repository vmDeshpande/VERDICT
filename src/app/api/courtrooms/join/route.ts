import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Courtroom } from '@/lib/courtrooms';
import { CourtroomMember } from '@/lib/courtroomMembers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { joinCourtroomSchema } from '@/lib/validations/courtroom';
import { normalizeInvitationCode } from '@/lib/invite';

function isValidHostRoleForCaseType(caseType: string, role: string): boolean {
  if (caseType === 'Civil') {
    return role === 'PLAINTIFF' || role === 'DEFENDANT';
  }
  if (caseType === 'Criminal') {
    return role === 'PROSECUTION' || role === 'DEFENSE';
  }
  return false;
}

function getOpposingRole(caseType: string, existingRole: string): string | null {
  if (caseType === 'Civil') {
    if (existingRole === 'PLAINTIFF') return 'DEFENDANT';
    if (existingRole === 'DEFENDANT') return 'PLAINTIFF';
  }
  if (caseType === 'Criminal') {
    if (existingRole === 'PROSECUTION') return 'DEFENSE';
    if (existingRole === 'DEFENSE') return 'PROSECUTION';
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = joinCourtroomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const invitationCode = normalizeInvitationCode(parsed.data.invitationCode);

    await dbConnect();
    const courtroom = await Courtroom.findOne({ invitationCode });
    if (!courtroom) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 });
    }

    if (!courtroom.invitationExpiresAt || courtroom.invitationExpiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    if (courtroom.status !== 'WAITING') {
      return NextResponse.json({ error: 'Courtroom is not accepting participants' }, { status: 409 });
    }

    if (courtroom.hostUserId.toString() === user._id.toString()) {
      return NextResponse.json({ error: 'Cannot join your own courtroom' }, { status: 400 });
    }

    // Check if already a member
    const existingMembership = await CourtroomMember.findOne({
      courtroomId: courtroom._id,
      userId: user._id,
    });
    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Concurrency-safe approach: count current members, assign opposing role
    const members = await CourtroomMember.find({ courtroomId: courtroom._id }).sort({ joinedAt: 1 });
    if (members.length !== 1 || members.length >= Math.min(courtroom.maxParticipants || 2, 2)) {
      return NextResponse.json({ error: 'Courtroom is full' }, { status: 409 });
    }

    const hostMember = members.find((member) => member.userId.toString() === courtroom.hostUserId.toString());
    if (!hostMember || !isValidHostRoleForCaseType(courtroom.caseType, hostMember.role)) {
      return NextResponse.json({ error: 'Courtroom host role is invalid' }, { status: 409 });
    }

    const opposingRole = getOpposingRole(courtroom.caseType, hostMember.role);
    if (!opposingRole) {
      return NextResponse.json({ error: 'Cannot determine opposing role' }, { status: 400 });
    }

    try {
      await CourtroomMember.create({
        courtroomId: courtroom._id,
        userId: user._id,
        role: opposingRole,
        joinedAt: new Date(),
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        const duplicateMembership = await CourtroomMember.exists({
          courtroomId: courtroom._id,
          userId: user._id,
        });
        return NextResponse.json(
          { error: duplicateMembership ? 'Already a member' : 'Courtroom side has already been claimed' },
          { status: 409 }
        );
      }
      throw error;
    }

    const updatedCount = await CourtroomMember.countDocuments({ courtroomId: courtroom._id });
    if (updatedCount >= 2 && courtroom.status === 'WAITING') {
      await Courtroom.updateOne({ _id: courtroom._id }, { status: 'ACTIVE' });
    }

    return NextResponse.json({ success: true, courtroomId: courtroom._id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to join courtroom' }, { status: 500 });
  }
}
