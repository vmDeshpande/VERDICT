'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewCasePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [caseType, setCaseType] = useState('Civil');
  const [courtType, setCourtType] = useState('');
  const [isFictional, setIsFictional] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, jurisdiction, caseType, courtType, isFictional }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create case');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Failed to create case');
      setLoading(false);
    }
  }

  return (
    <div className="container-default py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Case</CardTitle>
          <CardDescription>Create a new legal case</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Case Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <select
                id="jurisdiction"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="caseType">Case Type</Label>
              <select
                id="caseType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                <option value="Civil">Civil</option>
                <option value="Criminal">Criminal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courtType">Court Type (optional)</Label>
              <Input id="courtType" value={courtType} onChange={(e) => setCourtType(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="fictional"
                type="checkbox"
                checked={isFictional}
                onChange={(e) => setIsFictional(e.target.checked)}
              />
              <Label htmlFor="fictional">Fictional case</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Case'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
