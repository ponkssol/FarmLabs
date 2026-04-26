/**
 * Force-delete generated Prisma client, then `prisma generate`.
 * Use when `prisma generate` errors with EPERM (often on Windows: stop `npm run dev` first).
 */
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { platform } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(root, "node_modules", ".prisma", "client");

function epermHelp() {
  if (platform() !== "win32") {
    console.error(
      "\nEPERM: another process is using the Prisma engine. Stop `next dev` and other Node using this project, then retry.\n",
    );
    return;
  }
  console.error(`
EPERM (Windows) — the engine file is locked, usually by Node / Next / Cursor:

  1. Stop   npm run dev   in every terminal (Ctrl+C) for this project.
  2. In Cursor: if the dev server runs in the background, taskbar → stop, or use Task Manager.
  3. Open Task Manager → "Node.js JavaScript Runtime" (or "node") → only end tasks you know
     are for this app (e.g. port 3000) — or close all Node if nothing else needs it.
  4. Wait 3–5 seconds, then:   npx prisma generate
     or:   npm run db:regen
  5. If it still fails: close Cursor, reopen, run   npx prisma generate   before starting dev.
  6. As last resort: PC restart, then generate first, then   npm run dev
  7. Optional: add the project folder to Windows Defender "Exclusions" to reduce file locks.
`);
}

if (existsSync(clientDir)) {
  try {
    rmSync(clientDir, { recursive: true, force: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Could not remove node_modules/.prisma/client.\n" + msg);
    epermHelp();
    process.exit(1);
  }
}

try {
  execSync("npx prisma generate", { stdio: "inherit", cwd: root, env: process.env, shell: true });
} catch {
  epermHelp();
  process.exit(1);
}
