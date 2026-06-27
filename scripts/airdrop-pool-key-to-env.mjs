#!/usr/bin/env node
/**
 * Convert a Solana keypair JSON export to env values for Vercel.
 * Usage: node scripts/airdrop-pool-key-to-env.mjs path/to/keypair.json
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/airdrop-pool-key-to-env.mjs <keypair.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const bytes = Uint8Array.from(raw);
if (bytes.length !== 64 && bytes.length !== 32) {
  console.error(`Expected 64-byte keypair or 32-byte seed, got ${bytes.length} bytes.`);
  process.exit(1);
}

const b64 = Buffer.from(bytes).toString("base64");
const { Keypair } = await import("@solana/web3.js");
const pubkey =
  bytes.length === 64
    ? Keypair.fromSecretKey(bytes).publicKey.toBase58()
    : Keypair.fromSeed(bytes).publicKey.toBase58();

console.log("");
console.log("# Paste into Vercel → Environment Variables (Production). No quotes.");
console.log(`AIRDROP_DEV_WALLET_SECRET_BASE64=${b64}`);
console.log("");
console.log(`# Pool wallet public key (verify this matches your pool): ${pubkey}`);
console.log("");
