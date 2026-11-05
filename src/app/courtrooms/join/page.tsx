'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function JoinCourtroomPage() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/courtrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to join');
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(/courtrooms/);
    } catch (err) {
      setError('Failed to join');
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
                onChange={(e) => setInvitationCode(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join Courtroom'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
