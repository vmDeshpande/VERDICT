import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClientKey, rateLimit } from '@/lib/auth/rate-limit';

describe('rate limiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the first forwarded IP and keeps endpoint keys separate', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.2' },
    });

    expect(getClientKey(request, 'login')).toBe('login:203.0.113.10');
    expect(getClientKey(request, 'register')).toBe('register:203.0.113.10');
    expect(getClientKey(new Request('http://localhost'))).toBe('unknown');
  });

  it('enforces a fixed-window quota and resets at the window boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T00:00:00.000Z'));

    expect(rateLimit('login:203.0.113.10', 2, 1_000)).toEqual({ allowed: true, remaining: 1 });
    expect(rateLimit('login:203.0.113.10', 2, 1_000)).toEqual({ allowed: true, remaining: 0 });
    expect(rateLimit('login:203.0.113.10', 2, 1_000)).toEqual({ allowed: false, remaining: 0 });

    vi.advanceTimersByTime(1_000);

    expect(rateLimit('login:203.0.113.10', 2, 1_000)).toEqual({ allowed: true, remaining: 1 });
  });

  it('tracks different endpoint keys independently', () => {
    expect(rateLimit('login:shared-ip', 1, 60_000).allowed).toBe(true);
    expect(rateLimit('register:shared-ip', 1, 60_000).allowed).toBe(true);
    expect(rateLimit('login:shared-ip', 1, 60_000).allowed).toBe(false);
  });
});