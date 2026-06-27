"use client";

import {
  resultToPanelMessage,
  runPhantomConnectFlow,
  shouldShowOpenInPhantom,
  type PhantomConnectResult,
} from "@/lib/solana-phantom-connect";
import {
  isAndroidMobileWalletSupported,
  SolanaMobileWalletAdapterWalletName,
} from "@/lib/mobile-wallet";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ConnectState = {
  hint: string | null;
  phantomOpenUrl: string | null;
  connecting: boolean;
};

/**
 * One-tap connect on Android (MWA). Select + connect must run across two renders — this hook handles that.
 */
export function useWalletConnect() {
  const walletCtx = useWallet();
  const { connect, connecting, connected, wallet, wallets, select } = walletCtx;
  const [state, setState] = useState<ConnectState>({
    hint: null,
    phantomOpenUrl: null,
    connecting: false,
  });
  const pendingMwaRef = useRef(false);

  useEffect(() => {
    if (!pendingMwaRef.current) return;
    if (!wallet || wallet.adapter.name !== SolanaMobileWalletAdapterWalletName) return;

    pendingMwaRef.current = false;
    setState((s) => ({ ...s, connecting: true, hint: null }));

    void (async () => {
      try {
        await connect();
        setState({ hint: null, phantomOpenUrl: null, connecting: false });
      } catch {
        const result = await runPhantomConnectFlow(walletCtx);
        applyResult(result);
      }
    })();
  }, [wallet, connect, walletCtx]);

  function applyResult(result: PhantomConnectResult) {
    if (result.kind === "connected") {
      setState({ hint: null, phantomOpenUrl: null, connecting: false });
      return;
    }
    setState({
      hint: resultToPanelMessage(result) ?? "Failed to connect wallet.",
      phantomOpenUrl: shouldShowOpenInPhantom(result),
      connecting: false,
    });
  }

  const connectWallet = useCallback(async () => {
    setState({ hint: null, phantomOpenUrl: null, connecting: true });

    if (isAndroidMobileWalletSupported()) {
      if (wallet?.adapter.name === SolanaMobileWalletAdapterWalletName && wallet.adapter.connected) {
        setState((s) => ({ ...s, connecting: false }));
        return;
      }
      if (wallet?.adapter.name !== SolanaMobileWalletAdapterWalletName) {
        pendingMwaRef.current = true;
        select(SolanaMobileWalletAdapterWalletName);
        return;
      }
    }

    const result = await runPhantomConnectFlow(walletCtx);
    applyResult(result);
  }, [wallet, select, walletCtx]);

  return {
    connectWallet,
    hint: state.hint,
    phantomOpenUrl: state.phantomOpenUrl,
    connecting: connecting || state.connecting,
    connected,
  };
}
