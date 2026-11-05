// scripts/db-sync.mjs
// Runs during the Vercel build. Brings the database schema up to date with
// prisma/schema.prisma using additive changes only (e.g. creating the SyncVault
// table). Without --accept-data-loss Prisma refuses anything destructive.
// It never fails the build: without a database the app still runs fully,
// just without chat persistence and cross-device sync.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[db-sync] No DATABASE_URL — skipping schema sync.");
  process.exit(0);
}

const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) {
  console.warn("[db-sync] Schema sync failed or needs manual review — continuing the build. Sync will report 'unavailable' until the SyncVault table exists.");
}
process.exit(0);
