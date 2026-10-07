import { adminApi } from "./api";

export type ConnectionStatus = "LIVE" | "CONNECTING" | "DISCONNECTED";

export interface WSEvent<T = unknown> {
  type: string;
  data: T;
  timestamp?: string;
}

type Listener = (event: WSEvent) => void;

const DEFAULT_RAILWAY_HOST = "payernt-production.up.railway.app";

function getWebSocketUrl(token: string): string {
  let apiBase = import.meta.env.VITE_API_URL || "";
  if (typeof window !== "undefined") {
    const win = window as unknown as { PAYENT_API_URL?: string };
    if (win.PAYENT_API_URL) apiBase = win.PAYENT_API_URL;
  }

  if (apiBase) {
    const wsProtocol = apiBase.startsWith("https:") ? "wss:" : "ws:";
    const cleanBase = apiBase
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    return `${wsProtocol}//${cleanBase}/api/admin/ws?token=${encodeURIComponent(token)}`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "10.0.2.2") {
      return `ws://10.0.2.2:8001/api/admin/ws?token=${encodeURIComponent(token)}`;
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return `ws://127.0.0.1:8001/api/admin/ws?token=${encodeURIComponent(token)}`;
    }
  }

  // Direct WebSocket connection to persistent Railway ASGI backend host
  return `wss://${DEFAULT_RAILWAY_HOST}/api/admin/ws?token=${encodeURIComponent(token)}`;
}

class AdminWebSocketService {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "DISCONNECTED";
  private listeners: Map<string, Set<Listener>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.connect());
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("payent-admin-ws-status", { detail: newStatus }),
        );
      }
    }
  }

  public onStatusChange(
    callback: (status: ConnectionStatus) => void,
  ): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public connect() {
    if (typeof window === "undefined") return;

    const token =
      localStorage.getItem("payent:admin:token") ||
      localStorage.getItem("payent:token");
    if (!token) {
      this.setStatus("DISCONNECTED");
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isExplicitDisconnect = false;
    this.setStatus("CONNECTING");

    const wsUrl = getWebSocketUrl(token);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus("LIVE");
        this.reconnectAttempts = 0;
        this.stopPolling();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WSEvent = JSON.parse(event.data);
          this.emit(parsed);
        } catch {
          // Ignore non-JSON frames
        }
      };

      this.ws.onerror = () => {
        // Suppress noisy console error frames and fallback to polling
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();

        if (event.code === 4003) {
          this.setStatus("DISCONNECTED");
          return;
        }

        if (!this.isExplicitDisconnect) {
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setStatus("DISCONNECTED");
            this.startPolling();
          } else {
            this.scheduleReconnect();
          }
        } else {
          this.setStatus("DISCONNECTED");
        }
      };
    } catch {
      this.setStatus("DISCONNECTED");
      this.startPolling();
    }
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("DISCONNECTED");
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitDisconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max WebSocket reconnect attempts reached.");
      return;
    }

    const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, backoff);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (this.isExplicitDisconnect) return;
      try {
        const res = await adminApi.get("/events/poll");
        if (res.data && Array.isArray(res.data.events)) {
          res.data.events.forEach((evt: WSEvent) => this.emit(evt));
        }
      } catch {
        /* ignore polling error */
      }
    }, 15000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public subscribe(eventType: string, callback: Listener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    if (this.status === "DISCONNECTED") {
      this.connect();
    }

    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  public onEvent(callback: Listener): () => void {
    return this.subscribe("*", callback);
  }

  private emit(event: WSEvent) {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(event));
    }

    const wildcard = this.listeners.get("*");
    if (wildcard) {
      wildcard.forEach((cb) => cb(event));
    }
  }
}

export const adminWS = new AdminWebSocketService();
