export type TestDatabaseConfiguration = {
  uri: string;
  databaseName: string;
};

export function requireTestDatabaseConfiguration(
  uri: string | undefined
): TestDatabaseConfiguration {
  if (!uri?.trim()) {
    throw new Error('TEST_MONGODB_URI is required for Playwright integration tests.');
  }

  let parsedUri: URL;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error('TEST_MONGODB_URI must be a valid MongoDB URI.');
  }

  if (parsedUri.protocol !== 'mongodb:' && parsedUri.protocol !== 'mongodb+srv:') {
    throw new Error('TEST_MONGODB_URI must use the mongodb or mongodb+srv protocol.');
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('TEST_MONGODB_URI must contain a valid database name.');
  }

  if (!databaseName) {
    throw new Error('TEST_MONGODB_URI must identify a database name.');
  }

  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error('TEST_MONGODB_URI database name must explicitly contain a test segment, such as verdict_test.');
  }

  return { uri, databaseName };
}