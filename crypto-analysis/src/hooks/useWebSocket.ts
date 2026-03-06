"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getBinanceWS, type TickerData } from "@/lib/api/binance-ws";

const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT",
  "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT",
];

/** How long to wait before declaring WebSocket "unreachable" and starting REST fallback */
const WS_CONNECT_TIMEOUT_MS = 8_000;
/** REST polling interval when WebSocket is unavailable */
const REST_POLL_INTERVAL_MS = 10_000;

export function useWebSocket(symbols: string[] = DEFAULT_SYMBOLS) {
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  // Start as null (unknown), so UI can show "连接中" before we know the outcome
  const [connected, setConnected] = useState<boolean>(false);

  // Track whether WS ever connected, so we can start REST fallback after timeout
  const wsEverConnected = useRef(false);
  const restFallbackActive = useRef(false);

  // ── WebSocket setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const ws = getBinanceWS();

    ws.connect(symbols, (isConnected) => {
      setConnected(isConnected);
      if (isConnected) wsEverConnected.current = true;
    });

    const unsubs = symbols.map((symbol) =>
      ws.subscribe(symbol, (data) => {
        setTickers((prev) => {
          const next = new Map(prev);
          next.set(data.symbol, data);
          return next;
        });
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [symbols]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── REST fallback: activates when WS stays disconnected for 8s ──────────
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startFallback = async () => {
      if (restFallbackActive.current) return;
      restFallbackActive.current = true;

      const poll = async () => {
        try {
          const res = await fetch("/api/tickers");
          if (!res.ok) return;
          const data: TickerData[] = await res.json();
          setTickers((prev) => {
            const next = new Map(prev);
            for (const t of data) next.set(t.symbol, t);
            return next;
          });
        } catch {
          // silent — network may be unavailable
        }
      };

      await poll(); // immediate first fetch
      pollTimer = setInterval(poll, REST_POLL_INTERVAL_MS);
    };

    // If WS connected, clear any REST polling
    if (connected) {
      restFallbackActive.current = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }

    // WS not connected — wait a bit before starting REST fallback
    const timeout = setTimeout(startFallback, WS_CONNECT_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      if (pollTimer) clearInterval(pollTimer);
      restFallbackActive.current = false;
    };
  }, [connected]);

  const getTicker = useCallback(
    (symbol: string) => tickers.get(symbol),
    [tickers]
  );

  return { tickers, getTicker, connected };
}

export { DEFAULT_SYMBOLS };
