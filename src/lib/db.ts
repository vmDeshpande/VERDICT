import mongoose from "mongoose";

declare global {
  var mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
}

const opts = {
  bufferCommands: false,
} as mongoose.ConnectOptions;

let cached = globalThis.mongooseConn;

if (!cached) {
  cached = { conn: null, promise: null };
  globalThis.mongooseConn = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (cached!.promise) {
    cached!.conn = await cached!.promise;
    return cached!.conn;
  }

  cached!.promise = mongoose.connect(MONGODB_URI, opts);

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default dbConnect;