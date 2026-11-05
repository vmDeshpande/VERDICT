import { JoinCourtroomForm } from '@/components/courtrooms/JoinCourtroomForm';

export default async function JoinCourtroomPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  const invitationCode = Array.isArray(code) ? code[0] || '' : code || '';

  return <JoinCourtroomForm initialInvitationCode={invitationCode} />;
}
