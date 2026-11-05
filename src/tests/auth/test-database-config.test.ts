import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireTestDatabaseConfiguration } from '@/lib/testing/test-database-config';

describe('Playwright test database configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([undefined, ''])('rejects a missing URI before connecting or cleaning data', (uri) => {
    const connect = vi.spyOn(mongoose, 'connect');

    expect(() => requireTestDatabaseConfiguration(uri)).toThrow(/TEST_MONGODB_URI is required/);
    expect(connect).not.toHaveBeenCalled();
    expect(mongoose.connection.readyState).toBe(0);
  });

  it('rejects a non-test database name before connecting or cleaning data', () => {
    const connect = vi.spyOn(mongoose, 'connect');

    expect(() => requireTestDatabaseConfiguration('mongodb://localhost:27017/verdict')).toThrow(
      /database name must explicitly contain a test segment/
    );
    expect(connect).not.toHaveBeenCalled();
    expect(mongoose.connection.readyState).toBe(0);
  });

  it('accepts and reports only a marked test database name', () => {
    const config = requireTestDatabaseConfiguration(
      'mongodb://user:secret@localhost:27017/verdict_test?authSource=admin'
    );

    expect(config.databaseName).toBe('verdict_test');
    expect(config.uri).toContain('secret');
  });
});