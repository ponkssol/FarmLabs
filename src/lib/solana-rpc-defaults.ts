/**
 * Public mainnet endpoint that accepts unauthenticated JSON-RPC from browsers and Node.
 * The official `https://api.mainnet-beta.solana.com` often returns HTTP 403 to client-side calls.
 * Override with `NEXT_PUBLIC_SOLANA_RPC` / `SOLANA_RPC_URL` (must match for escrow).
 */
export const DEFAULT_MAINNET_HTTP_RPC = "https://rpc.ankr.com/solana";
