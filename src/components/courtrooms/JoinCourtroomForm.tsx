'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function JoinCourtroomForm({ initialInvitationCode }: { initialInvitationCode: string }) {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/courtrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to join courtroom');
        return;
      }

      router.push(`/courtrooms/${data.courtroomId}`);
    } catch {
      setError('Failed to join courtroom');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-default py-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Join Courtroom</CardTitle>
          <CardDescription>Enter an invitation code to join</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invitation Code</Label>
              <Input
                id="code"
                value={invitationCode}
                onChange={(event) => setInvitationCode(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" disabled={loading || !invitationCode.trim()}>
              {loading ? 'Joining...' : 'Join Courtroom'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}