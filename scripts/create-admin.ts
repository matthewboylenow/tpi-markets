import "./load-env";
import bcrypt from "bcrypt";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "matthew@adventii.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("Set ADMIN_PASSWORD in .env.local before running this script.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await db
    .insert(users)
    .values({ email, passwordHash: hash, role: "admin" })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash: hash },
    });

  console.log(`✅ Admin user ready: ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
