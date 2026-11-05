'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewCourtroomPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [caseId, setCaseId] = useState('');
  const [hostRole, setHostRole] = useState('');
  const [caseType, setCaseType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/cases')
      .then((res) => res.json())
      .then((data) => setCases(data.cases || []));
  }, []);

  useEffect(() => {
    const c = cases.find((x) => x._id === caseId);
    if (c) {
      setCaseType(c.caseType);
      setHostRole('');
    }
  }, [caseId, cases]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/courtrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, hostRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create courtroom');
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(/courtrooms/);
    } catch (err) {
      setError('Failed to create courtroom');
      setLoading(false);
    }
  }

  return (
    <div className="container-default py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Courtroom</CardTitle>
          <CardDescription>Create a courtroom for your case</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="case">Case</Label>
              <select
                id="case"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
              >
                <option value="">Select a case</option>
                {cases.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} ({c.caseType})
                  </option>
                ))}
              </select>
            </div>
            {caseType && (
              <div className="space-y-2">
                <Label htmlFor="hostRole">Your Role (Side)</Label>
                <select
                  id="hostRole"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value)}
                  required
                >
                  <option value="">Select your role</option>
                  {caseType === 'Civil' && (
                    <>
                      <option value="PLAINTIFF">Plaintiff</option>
                      <option value="DEFENDANT">Defendant</option>
                    </>
                  )}
                  {caseType === 'Criminal' && (
                    <>
                      <option value="PROSECUTION">Prosecution</option>
                      <option value="DEFENSE">Defense</option>
                    </>
                  )}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !caseId || !hostRole}>
              {loading ? 'Creating...' : 'Create Courtroom'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
