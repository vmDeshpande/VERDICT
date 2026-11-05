'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clipboard, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CourtroomMember = {
  id: string;
  role: string;
  user: { id: string; name: string };
};

type CourtroomView = {
  id: string;
  status: string;
  host: { id: string; name: string; role: string } | null;
  case: {
    title: string;
    description: string;
    jurisdiction: string;
    caseType: string;
    courtType?: string;
    isFictional: boolean;
  } | null;
  members: CourtroomMember[];
  invitation: { code: string; expiresAt: string } | null;
};

export default function CourtroomPreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [courtroom, setCourtroom] = useState<CourtroomView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourtroom() {
      try {
        const response = await fetch(`/api/courtrooms/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Unable to load courtroom');
          return;
        }
        setCourtroom(data.courtroom);
      } catch {
        if (!controller.signal.aborted) setError('Unable to load courtroom');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCourtroom();
    return () => controller.abort();
  }, [id]);

  const invitationUrl = courtroom?.invitation
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/courtrooms/join?code=${encodeURIComponent(courtroom.invitation.code)}`
    : '';

  async function copyInvitation() {
    if (!invitationUrl) return;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setCopyError('');
    } catch {
      setCopied(false);
      setCopyError('Copy was unavailable. Select the invitation link to copy it manually.');
    }
  }

  return (
    <main className="container-default py-8 sm:py-12">
      <Link href="/dashboard" className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground">
        Back to dashboard
      </Link>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" role="status">
          <LoaderCircle className="size-5 animate-spin" />
          Loading courtroom
        </div>
      ) : error ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Unable to open courtroom</CardTitle>
            <CardDescription role="alert">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : courtroom ? (
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Courtroom preparation</p>
              <h1 className="mt-2 text-3xl font-semibold">{courtroom.case?.title || 'Courtroom'}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {courtroom.case?.jurisdiction} · {courtroom.case?.caseType}
                {courtroom.case?.courtType ? ` · ${courtroom.case.courtType}` : ''}
                {courtroom.case?.isFictional ? ' · Fictional case' : ''}
              </p>
            </div>
            <span className="rounded-sm border px-3 py-1.5 text-sm font-medium">{courtroom.status}</span>
          </header>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Case brief</CardTitle>
                <CardDescription>Review the shared case before the simulation begins.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {courtroom.case?.description || 'No case description is available.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>Each side is assigned by the server.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courtroom.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.user.name}</p>
                      {member.user.id === courtroom.host?.id && (
                        <p className="text-xs text-muted-foreground">Host</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-sm bg-secondary px-2.5 py-1 text-xs font-medium">
                      {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
                {courtroom.members.length < 2 && (
                  <p className="pt-1 text-sm text-muted-foreground">Waiting for the opposing participant.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {courtroom.invitation && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Invite the opposing participant</CardTitle>
                <CardDescription>
                  Invitation expires {new Date(courtroom.invitation.expiresAt).toLocaleString()}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <input
                  aria-label="Invitation link"
                  readOnly
                  value={invitationUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button type="button" variant="outline" onClick={copyInvitation}>
                  {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
                <span className="sr-only" aria-live="polite">{copied ? 'Invitation link copied.' : copyError}</span>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </main>
  );
}