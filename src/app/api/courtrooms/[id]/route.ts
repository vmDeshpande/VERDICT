import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Case } from '@/lib/cases';
import { Courtroom } from '@/lib/courtrooms';
import { CourtroomMember } from '@/lib/courtroomMembers';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;
	if (!Types.ObjectId.isValid(id)) {
		return NextResponse.json({ error: 'Courtroom not found' }, { status: 404 });
	}

	await dbConnect();
	const courtroom = await Courtroom.findById(id).lean();
	if (!courtroom) {
		return NextResponse.json({ error: 'Courtroom not found' }, { status: 404 });
	}

	const membership = await CourtroomMember.exists({ courtroomId: courtroom._id, userId: user._id });
	if (!membership) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const [caseDoc, memberDocs] = await Promise.all([
		Case.findById(courtroom.caseId).select('title description jurisdiction caseType courtType isFictional').lean(),
		CourtroomMember.find({ courtroomId: courtroom._id })
			.sort({ joinedAt: 1 })
			.populate({ path: 'userId', select: 'name' })
			.lean(),
	]);

	const hostMember = memberDocs.find((member) => member.userId?._id?.toString() === courtroom.hostUserId.toString());
	const isHost = courtroom.hostUserId.toString() === user._id.toString();
	const hasActiveInvitation = Boolean(
		isHost &&
			courtroom.status === 'WAITING' &&
			courtroom.invitationCode &&
			courtroom.invitationExpiresAt &&
			courtroom.invitationExpiresAt > new Date()
	);

	return NextResponse.json(
		{
			courtroom: {
				id: courtroom._id.toString(),
				status: courtroom.status,
				host: hostMember
					? {
							id: courtroom.hostUserId.toString(),
							name: (hostMember.userId as { name?: string }).name || 'Host',
							role: hostMember.role,
						}
					: null,
				case: caseDoc,
				members: memberDocs.map((member) => ({
					id: member._id.toString(),
					user: {
						id: member.userId?._id?.toString(),
						name: (member.userId as { name?: string } | null)?.name || 'Participant',
					},
					role: member.role,
					joinedAt: member.joinedAt,
				})),
				invitation: hasActiveInvitation
					? {
							code: courtroom.invitationCode,
							expiresAt: courtroom.invitationExpiresAt,
						}
					: null,
			},
		},
		{ status: 200 }
	);
}
