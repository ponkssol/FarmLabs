"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { solListingToLamports } from "@/lib/escrow-lamports";

type PriceTier = { id: string; label: string; priceAmount: number };

type Props = {
  projectId: string;
  /** e.g. "12.50 USDC" or "0.5 SOL" — label on the first button (single price or min tier). */
  amountLabel?: string;
  /** If set, buyer must pick a tier; server charges that tier’s amount. */
  priceOptions?: PriceTier[];
  /** Listing currency (tiers share this). */
  priceCurrency?: string | null;
};

type BuyOk = {
  orderId: string;
  depositAddress: string;
  /** Listing price in SOL — must match server for lamports. */
  amount: number;
  amountLabel: string;
};

export function EscrowBuyButton({
  projectId,
  amountLabel,
  priceOptions = [],
  priceCurrency = null,
}: Props) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"start" | "pay" | "done">("start");
  const [order, setOrder] = useState<BuyOk | null>(null);
  const [txSig, setTxSig] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sendingWallet, setSendingWallet] = useState(false);
  const [settlementTx, setSettlementTx] = useState<string | null>(null);
  const [buyerTx, setBuyerTx] = useState<string | null>(null);
  const [grantedAfterPay, setGrantedAfterPay] = useState<{
    telegram: string | null;
    discord: string | null;
  } | null>(null);
  const [selectedTierId, setSelectedTierId] = useState(() => priceOptions[0]?.id ?? "");
  const cur = resolvePriceCurrency(priceCurrency);
  const hasTiers = priceOptions.length > 0;

  const selectedTier = hasTiers ? priceOptions.find((o) => o.id === selectedTierId) : null;
  const ctaLabel =
    hasTiers && selectedTier
      ? `Join · ${selectedTier.label} — ${formatEscrowAmountLabel(selectedTier.priceAmount, cur)}`
      : amountLabel
        ? `Join · ${amountLabel}`
        : "Join";

  async function buy() {
    setLoading(true);
    setMessage(null);
    try {
      if (hasTiers && !selectedTierId) {
        throw new Error("Choose a tier.");
      }
      const res = await fetch("/api/escrow/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          priceOptionId: hasTiers ? selectedTierId : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as BuyOk & { error?: string };
      if (!res.ok) {
        const msg = data.error || "Couldn't start. Try again.";
        if (res.status === 403 && /connect your wallet|wallet first/i.test(msg)) {
          throw new Error("Connect and save your wallet on your profile first.");
        }
        throw new Error(msg);
      }
      if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
        throw new Error("Invalid amount from server.");
      }
      setOrder({
        orderId: data.orderId,
        depositAddress: data.depositAddress,
        amount: data.amount,
        amountLabel: data.amountLabel,
      });
      setStep("pay");
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function confirmWithSignature(s: string) {
    if (!order) return;
    const sig = s.trim();
    if (sig.length < 32) {
      setMessage("Paste a valid Solana transaction signature.");
      return;
    }
    setConfirming(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/escrow/orders/${order.orderId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: sig }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        settlementTx?: string;
        buyerTx?: string;
        code?: string;
        grantedTelegramUrl?: string | null;
        grantedDiscordUrl?: string | null;
      };
      if (!res.ok) {
        const combined = [data.error, data.details].filter(Boolean).join(" — ");
        throw new Error(combined || "Confirmation failed");
      }
      setBuyerTx(data.buyerTx ?? sig);
      setSettlementTx(data.settlementTx ?? null);
      setGrantedAfterPay({
        telegram: data.grantedTelegramUrl?.trim() || null,
        discord: data.grantedDiscordUrl?.trim() || null,
      });
      setStep("done");
      setMessage(
        data.grantedTelegramUrl?.trim() || data.grantedDiscordUrl?.trim()
          ? "You’re in — open your invites below."
          : "You’re in — the page will show invites if the host set them on the listing.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setConfirming(false);
    }
  }

  function confirm() {
    void confirmWithSignature(txSig);
  }

  /** Build SystemProgram transfer → Phantom signs → auto confirm. */
  async function payWithWallet() {
    if (!order) return;
    if (!connected || !publicKey || !sendTransaction) {
      setMessage("Connect your wallet first.");
      return;
    }
    const lamports = solListingToLamports(order.amount);
    if (lamports <= BigInt(0)) {
      setMessage("Invalid amount.");
      return;
    }
    setSendingWallet(true);
    setMessage(null);
    try {
      const to = new PublicKey(order.depositAddress);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: to,
          lamports: lamports,
        }),
      );
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      setTxSig(signature);
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );
      setSendingWallet(false);
      await confirmWithSignature(signature);
    } catch (e) {
      setSendingWallet(false);
      const msg = e instanceof Error ? e.message : "Transaction failed or was cancelled.";
      if (/User rejected|cancel|denied/i.test(msg)) {
        setMessage("Transaction cancelled.");
      } else if (/403|Access forbidden|forbidden/i.test(msg)) {
        setMessage("Network error (RPC). Check wallet network / env RPC settings, then try again.");
      } else {
        setMessage(msg);
      }
    }
  }

  if (step === "done") {
    const t = grantedAfterPay?.telegram;
    const d = grantedAfterPay?.discord;
    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-emerald-200/90">
          {message || "You’re in."}
        </p>
        {(t || d) && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
            {t ? (
              <a
                href={t}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm font-medium text-white sm:w-auto"
              >
                Open Telegram
              </a>
            ) : null}
            {d ? (
              <a
                href={d}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-2 text-sm font-medium text-indigo-100 sm:w-auto"
              >
                Open Discord
              </a>
            ) : null}
          </div>
        )}
        <div className="flex flex-col gap-1">
          {buyerTx && (
            <a
              href={`https://solscan.io/tx/${buyerTx}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-sky-400/90 underline"
            >
              View payment on Solscan
            </a>
          )}
          {settlementTx && (
            <a
              href={`https://solscan.io/tx/${settlementTx}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-sky-400/90 underline"
            >
              View on Solscan
            </a>
          )}
        </div>
      </div>
    );
  }

  if (step === "pay" && order) {
    return (
      <div className="space-y-2.5 text-left">
        <button
          type="button"
          onClick={() => void payWithWallet()}
          disabled={sendingWallet || confirming}
          className="w-full rounded-md bg-emerald-600/90 px-2.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500/90 disabled:opacity-60"
        >
          {sendingWallet || confirming
            ? sendingWallet
              ? "Open wallet…"
              : "Finishing up…"
            : `Pay ${order.amountLabel} with wallet`}
        </button>
        <details className="rounded border border-white/8 bg-zinc-950/40 p-1.5">
          <summary className="cursor-pointer text-xs text-zinc-500">I sent manually</summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Deposit address</span>
              <code className="break-all rounded border border-white/10 bg-zinc-900/80 p-1.5 text-xs text-zinc-200">
                {order.depositAddress}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(order.depositAddress);
                }}
                className="self-start rounded border border-white/12 px-2 py-0.5 text-xs text-zinc-300 hover:border-white/25"
              >
                Copy address
              </button>
            </div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Payment tx signature</label>
            <input
              value={txSig}
              onChange={(e) => setTxSig(e.target.value)}
              placeholder="Transaction signature"
              className="w-full rounded border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={confirming}
              className="w-full rounded-md border border-white/20 bg-zinc-100/10 px-2.5 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {confirming ? "Verifying…" : "Confirm & settle"}
            </button>
          </div>
        </details>
        {message && <p className="text-sm text-amber-200/90">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasTiers && (
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase text-zinc-500">Tier</label>
          <select
            value={selectedTierId}
            onChange={(e) => setSelectedTierId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
          >
            {priceOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} — {formatEscrowAmountLabel(o.priceAmount, cur)}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className="w-full rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Preparing…" : ctaLabel}
      </button>
      {message && <p className="text-sm text-zinc-500">{message}</p>}
    </div>
  );
}
