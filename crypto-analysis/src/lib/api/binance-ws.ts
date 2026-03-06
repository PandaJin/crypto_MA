export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
}

type TickerCallback = (data: TickerData) => void;

const WS_ENDPOINTS = [
  "wss://stream.binance.com:9443/ws",
  "wss://stream.binance.com:443/ws",
];

type ConnectionCallback = (connected: boolean) => void;

class BinanceWS {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Set<TickerCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private endpointIndex = 0;
  // Persisted across reconnects
  private onConnectionChange: ConnectionCallback | null = null;
  private lastSymbols: string[] = [];

  connect(symbols: string[], onConnectionChange?: ConnectionCallback) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (onConnectionChange) this.onConnectionChange = onConnectionChange;
    this.lastSymbols = symbols;

    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const baseUrl = WS_ENDPOINTS[this.endpointIndex % WS_ENDPOINTS.length];
    this.ws = new WebSocket(`${baseUrl}/${streams}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (!raw.s) return; // Skip non-ticker messages
        const ticker: TickerData = {
          symbol: raw.s,
          price: raw.c,
          priceChange: raw.p,
          priceChangePercent: raw.P,
          high: raw.h,
          low: raw.l,
          volume: raw.v,
          quoteVolume: raw.q,
        };
        const cbs = this.callbacks.get(ticker.symbol);
        if (cbs) cbs.forEach((cb) => cb(ticker));
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.onConnectionChange?.(false);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.endpointIndex++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(
          () => this.connect(this.lastSymbols),
          delay
        );
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(symbol: string, cb: TickerCallback) {
    if (!this.callbacks.has(symbol)) {
      this.callbacks.set(symbol, new Set());
    }
    this.callbacks.get(symbol)!.add(cb);
    return () => {
      this.callbacks.get(symbol)?.delete(cb);
    };
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton instance
let instance: BinanceWS | null = null;

export function getBinanceWS(): BinanceWS {
  if (!instance) instance = new BinanceWS();
  return instance;
}
