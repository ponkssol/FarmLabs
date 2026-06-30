export const AIRDROP_POOL_REFRESH_EVENT = "farmlabs:airdrop-pool-refresh";

export type AirdropPoolRefreshDetail = {
  amountDeducted?: number;
};

export function notifyAirdropPoolRefresh(detail?: AirdropPoolRefreshDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AirdropPoolRefreshDetail>(AIRDROP_POOL_REFRESH_EVENT, { detail }));
}
