'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      router.replace('/auth/login');
      router.refresh();
    } catch {
      setError('Unable to log out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <Button type="button" variant="outline" onClick={logout} disabled={loading}>
        <LogOut aria-hidden="true" />
        {loading ? 'Logging out...' : 'Log out'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}