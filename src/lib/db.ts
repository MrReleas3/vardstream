import { MongoClient, Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _memoryDb: Map<string, any[]> | undefined;
}

const uri = process.env.MONGODB_URI;
let clientPromise: Promise<MongoClient> | null = null;

// Fallback in-memory DB for local dev before user configures MongoDB Atlas URI
if (!global._memoryDb) {
  global._memoryDb = new Map<string, any[]>();
}

export function getMemoryCollection<T = any>(collectionName: string): any[] {
  if (!global._memoryDb!.has(collectionName)) {
    global._memoryDb!.set(collectionName, []);
  }
  return global._memoryDb!.get(collectionName)!;
}

if (uri) {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

let indexesInitialized = false;

export async function initDbIndexes(db: Db): Promise<void> {
  if (indexesInitialized) return;
  try {
    // 1. users
    await db.collection("users").createIndex({ email: 1 }, { unique: true, background: true });
    await db.collection("users").createIndex({ username: 1 }, { unique: true, background: true });

    // 2. invite_codes
    await db.collection("invite_codes").createIndex({ code: 1 }, { unique: true, background: true });
    await db.collection("invite_codes").createIndex({ status: 1 }, { background: true });

    // 3. user_activities
    await db.collection("user_activities").createIndex(
      { userId: 1, mediaId: 1, mediaType: 1 },
      { unique: true, background: true }
    );
    await db.collection("user_activities").createIndex({ userId: 1, status: 1 }, { background: true });
    await db.collection("user_activities").createIndex({ userId: 1, updatedAt: -1 }, { background: true });

    // 4. providers
    await db.collection("providers").createIndex({ slug: 1 }, { unique: true, background: true });
    await db.collection("providers").createIndex({ isEnabled: 1, healthScore: -1 }, { background: true });

    // 5. telemetry_logs
    await db.collection("telemetry_logs").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 172800, background: true }
    );
    await db.collection("telemetry_logs").createIndex({ providerSlug: 1, createdAt: -1 }, { background: true });

    // 6. password_resets
    await db.collection("password_resets").createIndex({ token: 1 }, { unique: true, background: true });
    await db.collection("password_resets").createIndex({ email: 1 }, { background: true });

    indexesInitialized = true;
    console.log("[MongoDB] All collections and database indexes initialized successfully.");
  } catch (err) {
    console.warn("[MongoDB] Index initialization warning (non-fatal):", err);
  }
}

export async function getDb(): Promise<Db | null> {
  if (!clientPromise) {
    return null;
  }
  const client = await clientPromise;
  const db = client.db();
  if (!indexesInitialized) {
    initDbIndexes(db).catch(() => {});
  }
  return db;
}

export async function getCollection<T extends Record<string, any>>(collectionName: string) {
  const db = await getDb();
  if (db) {
    return db.collection<T>(collectionName);
  }
  return null;
}

export const isDbConnected = () => !!uri;

