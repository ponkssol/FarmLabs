/**
 * Force-delete generated Prisma client, then `prisma generate`.
 * Use when `prisma generate` errors with EPERM (often on Windows: stop `npm run dev` first).
 */
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "node_modules", ".prisma", "client");

if (existsSync(clientDir)) {
  try {
    rmSync(clientDir, { recursive: true, force: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Could not remove node_modules/.prisma/client. Stop the dev server (Next.js) and retry.\n" + msg);
    process.exit(1);
  }
}

execSync("npx prisma generate", { stdio: "inherit", cwd: root, env: process.env, shell: true });
