import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load .env.local / .env
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

const uri = process.env.MONGODB_URI;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  if (!uri) {
    console.error("\x1b[31m[ERROR] MONGODB_URI is not set in environment or .env.local\x1b[0m");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const usersCol = db.collection("users");

  try {
    if (command === "remove-default") {
      const result = await usersCol.deleteOne({ email: "admin@vardsrm.local" });
      if (result.deletedCount > 0) {
        console.log("\x1b[32m[SUCCESS] Removed default demo admin (admin@vardsrm.local).\x1b[0m");
      } else {
        console.log("\x1b[33m[INFO] Default admin (admin@vardsrm.local) was not found or already deleted.\x1b[0m");
      }
    } else if (command === "create") {
      const email = args[1];
      const password = args[2];
      const username = args[3] || (email ? email.split("@")[0] : "admin");

      if (!email || !password) {
        console.error("\x1b[31m[USAGE] node scripts/admin.mjs create <email> <password> [username]\x1b[0m");
        process.exit(1);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const existing = await usersCol.findOne({ $or: [{ email }, { username }] });

      if (existing) {
        await usersCol.updateOne(
          { _id: existing._id },
          { $set: { role: "admin", passwordHash, email, username } }
        );
        console.log(`\x1b[32m[SUCCESS] Existing account for "${email}" updated to ADMIN with new password.\x1b[0m`);
      } else {
        await usersCol.insertOne({
          email,
          username,
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
        console.log(`\x1b[32m[SUCCESS] New Admin account created: "${email}" (username: "${username}").\x1b[0m`);
      }
    } else if (command === "promote") {
      const email = args[1];
      if (!email) {
        console.error("\x1b[31m[USAGE] node scripts/admin.mjs promote <email>\x1b[0m");
        process.exit(1);
      }
      const res = await usersCol.updateOne({ email }, { $set: { role: "admin" } });
      if (res.matchedCount > 0) {
        console.log(`\x1b[32m[SUCCESS] User "${email}" has been promoted to ADMIN.\x1b[0m`);
      } else {
        console.error(`\x1b[31m[ERROR] No user found with email "${email}".\x1b[0m`);
      }
    } else if (command === "list") {
      const admins = await usersCol.find({ role: "admin" }, { projection: { passwordHash: 0 } }).toArray();
      console.log("\x1b[36m--- Platform Administrators ---\x1b[0m");
      if (admins.length === 0) {
        console.log("No admins found in database.");
      } else {
        admins.forEach((a, idx) => {
          console.log(`${idx + 1}. Username: ${a.username} | Email: ${a.email} | Created: ${a.createdAt}`);
        });
      }
    } else {
      console.log("\x1b[36m=== VardStream Admin Management CLI ===\x1b[0m");
      console.log("Commands:");
      console.log("  node scripts/admin.mjs remove-default             Remove demo admin (admin@vardsrm.local)");
      console.log("  node scripts/admin.mjs create <email> <pwd> [usr] Create/update an admin account");
      console.log("  node scripts/admin.mjs promote <email>           Promote an existing user to admin");
      console.log("  node scripts/admin.mjs list                      List all current admin users");
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("\x1b[31m[Fatal Error]:\x1b[0m", err);
  process.exit(1);
});
