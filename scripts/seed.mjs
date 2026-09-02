import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local or .env if present
const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

const DEFAULT_PROVIDERS = [
  {
    name: "VidSrc",
    slug: "vidsrc",
    baseUrl: "https://vidsrc.to/embed",
    urlPatterns: {
      movie: "/movie/{tmdbId}",
      tv: "/tv/{tmdbId}/{season}/{episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p", "1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en", "es", "fr", "de"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 1,
    healthScore: 98,
    failureCount24h: 0,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "SuperEmbed",
    slug: "superembed",
    baseUrl: "https://superembed.stream/e",
    urlPatterns: {
      movie: "?tmdb={tmdbId}",
      tv: "?tmdb={tmdbId}&sea={season}&epi={episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p", "1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en", "es"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 2,
    healthScore: 89,
    failureCount24h: 0,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "AutoEmbed",
    slug: "autoembed",
    baseUrl: "https://player.autoembed.cc/embed",
    urlPatterns: {
      movie: "/movie/{tmdbId}",
      tv: "/tv/{tmdbId}/{season}/{episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 3,
    healthScore: 82,
    failureCount24h: 0,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "2Embed",
    slug: "2embed",
    baseUrl: "https://www.2embed.cc/embed",
    urlPatterns: {
      movie: "/{tmdbId}",
      tv: "/{tmdbId}/{season}/{episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p"],
    supportsSubtitles: false,
    subtitleLangs: [],
    geoRestrictions: [],
    isEnabled: true,
    priority: 4,
    healthScore: 78,
    failureCount24h: 0,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("\x1b[33m[WARN] No MONGODB_URI found in environment or .env.local.\x1b[0m");
    console.log("Local in-memory fallback will be used during dev server runs.");
    console.log("To seed remote MongoDB Atlas, set MONGODB_URI in .env.local and run `npm run seed` again.");
    process.exit(0);
  }

  console.log("\x1b[36m[MongoDB Seeder] Connecting to MongoDB Atlas...\x1b[0m");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log(`\x1b[32m[MongoDB Seeder] Connected to database: "${db.databaseName}"\x1b[0m\n`);

  // 1. Initialize Indexes
  console.log("\x1b[34m[1/4] Applying collection indexes...\x1b[0m");
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("invite_codes").createIndex({ code: 1 }, { unique: true });
  await db.collection("invite_codes").createIndex({ status: 1 });
  await db.collection("user_activities").createIndex(
    { userId: 1, mediaId: 1, mediaType: 1 },
    { unique: true }
  );
  await db.collection("user_activities").createIndex({ userId: 1, status: 1 });
  await db.collection("user_activities").createIndex({ userId: 1, updatedAt: -1 });
  await db.collection("providers").createIndex({ slug: 1 }, { unique: true });
  await db.collection("providers").createIndex({ isEnabled: 1, healthScore: -1 });
  await db.collection("telemetry_logs").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 172800 }
  );
  await db.collection("telemetry_logs").createIndex({ providerSlug: 1, createdAt: -1 });
  console.log(" -> All 11 collection & TTL indexes verified.");

  // 2. Admin User
  console.log("\x1b[34m[2/4] Verifying Admin account...\x1b[0m");
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@vardsrm.local";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin12345";
  const existingAdmin = await db.collection("users").findOne({ role: "admin" });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.collection("users").insertOne({
      email: adminEmail,
      username: "admin",
      passwordHash,
      role: "admin",
      preferences: {
        defaultSubtitleLang: "en",
        autoPlayNext: true,
        theme: "dark",
      },
      isDisabled: false,
      createdAt: new Date().toISOString(),
    });
    console.log(` -> Admin account created: \x1b[32m${adminEmail}\x1b[0m (password: \x1b[33m${adminPassword}\x1b[0m)`);
  } else {
    console.log(` -> Admin account exists: \x1b[32m${existingAdmin.email}\x1b[0m`);
  }

  // 3. Embed Providers
  console.log("\x1b[34m[3/4] Verifying Embed Providers...\x1b[0m");
  for (const prov of DEFAULT_PROVIDERS) {
    await db.collection("providers").updateOne(
      { slug: prov.slug },
      { $setOnInsert: prov },
      { upsert: true }
    );
  }
  console.log(` -> Verified ${DEFAULT_PROVIDERS.length} embed providers.`);

  // 4. Starter Invite Codes
  console.log("\x1b[34m[4/4] Verifying Starter Invite Codes...\x1b[0m");
  const defaultCodes = ["VIP-ALPHA-2026", "STREAM-FREE-01", "CINEMA-PASS-99"];
  for (const code of defaultCodes) {
    await db.collection("invite_codes").updateOne(
      { code },
      {
        $setOnInsert: {
          code,
          createdBy: "system",
          status: "active",
          expiresAt: null,
          createdAt: new Date().toISOString(),
          usedBy: null,
          usedAt: null,
        },
      },
      { upsert: true }
    );
  }
  console.log(` -> Verified starter invite codes: ${defaultCodes.join(", ")}`);

  console.log("\n\x1b[32m=================================================");
  console.log(" DATABASE INITIALIZATION & SEEDING COMPLETE!");
  console.log("=================================================\x1b[0m");
  await client.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\x1b[31m[Seed Error]:\x1b[0m", err);
  process.exit(1);
});
