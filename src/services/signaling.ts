import { SignalMessage } from "../types";

// Helper to normalize the signaling base URL safely
export function normalizeSignalingUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // If protocol is missing, add https:// (or http:// for localhost)
  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith("/")) {
      // Relative path like "/api/signal"
    } else {
      const isLocal =
        trimmed.startsWith("localhost") ||
        trimmed.startsWith("127.0.0.1") ||
        trimmed.startsWith("0.0.0.0");
      trimmed = (isLocal ? "http://" : "https://") + trimmed;
    }
  }

  // Remove trailing slashes
  trimmed = trimmed.replace(/\/+$/, "");

  // If the URL ends with /api/signal, strip it because endpoints append /api/signal/...
  if (trimmed.endsWith("/api/signal")) {
    trimmed = trimmed.substring(0, trimmed.length - "/api/signal".length);
  }

  return trimmed.replace(/\/+$/, "");
}

// Safely parse JSON from fetch responses without throwing "Unexpected end of JSON input"
async function parseResponseJson<T = any>(
  res: Response
): Promise<{ ok: boolean; data: T | null; errorText: string }> {
  let text = "";
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      errorText: err?.message || "Failed to read response body",
    };
  }

  if (!text || text.trim() === "") {
    return {
      ok: res.ok,
      data: null,
      errorText: res.ok
        ? ""
        : `Server returned status ${res.status} with empty response`,
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return {
      ok: res.ok,
      data,
      errorText:
        (data as any)?.error ||
        (res.ok ? "" : `Request failed with status ${res.status}`),
    };
  } catch {
    const snippet = text.length > 100 ? text.slice(0, 100) + "..." : text;
    return {
      ok: false,
      data: null,
      errorText: res.ok
        ? "Received non-JSON response from signaling server"
        : `Server returned status ${res.status}: ${snippet}`,
    };
  }
}

export class SignalingClient {
  private deviceId: string;
  private deviceName: string;
  private baseUrl: string;
  private configuredUrl: string;
  private pollIntervalId: any = null;
  private heartbeatIntervalId: any = null;
  private onSignalReceivedCallback?: (signal: SignalMessage) => void;
  private onErrorCallback?: (err: Error) => void;
  private isPolling = false;
  private eventSource: EventSource | null = null;
  private fastPollCount = 0;

  constructor(deviceId: string, deviceName: string) {
    this.deviceId = deviceId;
    this.deviceName = deviceName;

    // Determine base URL: uses VITE_SIGNALING_URL if present, normalized safely
    const customUrl = (import.meta as any).env?.VITE_SIGNALING_URL;
    this.baseUrl = normalizeSignalingUrl(customUrl);
    this.configuredUrl = this.baseUrl;
  }

  public triggerFastPolling(durationMs = 6000) {
    this.fastPollCount = Math.ceil(durationMs / 400);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async fetchIceServers(): Promise<RTCIceServer[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/signal/ice-servers`);
      const { ok, data } = await parseResponseJson<{ iceServers?: RTCIceServer[] }>(res);
      if (ok && data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return data.iceServers;
      }
    } catch {
      // Non-blocking fallback to local STUN configuration
    }
    return [];
  }

  public updateDeviceName(name: string) {
    this.deviceName = name;
  }

  public async register(
    code: string
  ): Promise<{ success: boolean; codeTaken?: boolean; error?: string }> {
    const payload = {
      deviceId: this.deviceId,
      code,
      deviceName: this.deviceName,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "browser",
    };

    // Attempt registration with current base URL
    try {
      const res = await fetch(`${this.baseUrl}/api/signal/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { ok, data, errorText } = await parseResponseJson<{
        success?: boolean;
        codeTaken?: boolean;
        error?: string;
      }>(res);

      if (ok) {
        return { success: true };
      }

      if (data?.codeTaken) {
        return { success: false, codeTaken: true, error: data.error || "Code already taken" };
      }

      // If configured custom URL failed and is not local, fallback to local built-in server
      if (this.baseUrl !== "") {
        console.warn(
          `[SignalingClient] Remote signaling (${this.baseUrl}) returned error: "${errorText}". Falling back to built-in signaling server.`
        );
        const fallbackRes = await this.tryLocalRegister(payload);
        if (fallbackRes.success || fallbackRes.codeTaken) {
          this.baseUrl = ""; // Adopt local built-in signaling for this session
          return fallbackRes;
        }
      }

      return {
        success: false,
        codeTaken: data?.codeTaken,
        error: errorText || "Failed to register code on signaling server",
      };
    } catch (err: any) {
      console.warn(
        `[SignalingClient] Network error connecting to ${this.baseUrl || "built-in server"}:`,
        err
      );

      // Attempt fallback to local built-in signaling if custom URL had a network error
      if (this.baseUrl !== "") {
        console.warn("[SignalingClient] Attempting fallback to local built-in signaling server...");
        const fallbackRes = await this.tryLocalRegister(payload);
        if (fallbackRes.success || fallbackRes.codeTaken) {
          this.baseUrl = "";
          return fallbackRes;
        }
      }

      return {
        success: false,
        error: err.message || "Network error connecting to signaling server",
      };
    }
  }

  private async tryLocalRegister(payload: any): Promise<{ success: boolean; codeTaken?: boolean; error?: string }> {
    try {
      const res = await fetch("/api/signal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { ok, data, errorText } = await parseResponseJson<{
        success?: boolean;
        codeTaken?: boolean;
        error?: string;
      }>(res);

      if (ok) return { success: true };
      return {
        success: false,
        codeTaken: data?.codeTaken,
        error: errorText || "Local signaling registration failed",
      };
    } catch (e: any) {
      return { success: false, error: e.message || "Local signaling server unreachable" };
    }
  }

  public async sendHeartbeat(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/signal/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: this.deviceId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async lookupCode(code: string): Promise<{
    success: boolean;
    target?: { deviceId: string; deviceName: string; code: string };
    error?: string;
  }> {
    const payload = {
      code: code.trim().toUpperCase(),
      requesterDeviceId: this.deviceId,
    };

    try {
      const res = await fetch(`${this.baseUrl}/api/signal/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { ok, data, errorText } = await parseResponseJson<{
        success?: boolean;
        target?: { deviceId: string; deviceName: string; code: string };
        error?: string;
      }>(res);

      if (ok && data?.target) {
        return { success: true, target: data.target };
      }

      // If remote failed and we have custom baseUrl, attempt local fallback
      if (!ok && this.baseUrl !== "") {
        const localRes = await fetch("/api/signal/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const localParsed = await parseResponseJson<{
          success?: boolean;
          target?: { deviceId: string; deviceName: string; code: string };
          error?: string;
        }>(localRes);
        if (localParsed.ok && localParsed.data?.target) {
          return { success: true, target: localParsed.data.target };
        }
      }

      return { success: false, error: errorText || "Device not found" };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error looking up code" };
    }
  }

  public async sendSignal(
    toDeviceId: string,
    type: SignalMessage["type"],
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.triggerFastPolling();
      const payload = {
        fromDeviceId: this.deviceId,
        fromDeviceName: this.deviceName,
        toDeviceId,
        type,
        data,
      };

      const res = await fetch(`${this.baseUrl}/api/signal/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { ok, errorText } = await parseResponseJson(res);
      if (!ok) {
        // Fallback to local if remote failed
        if (this.baseUrl !== "") {
          const fallbackRes = await fetch("/api/signal/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const fbParsed = await parseResponseJson(fallbackRes);
          if (fbParsed.ok) {
            return { success: true };
          }
        }
        return { success: false, error: errorText || "Failed to deliver signal" };
      }
      return { success: true };
    } catch (err: any) {
      console.warn(`Signaling send error for type ${type}:`, err);
      return { success: false, error: err.message || "Network error sending signal" };
    }
  }

  public start(
    onSignal: (signal: SignalMessage) => void,
    onError?: (err: Error) => void
  ) {
    this.onSignalReceivedCallback = onSignal;
    this.onErrorCallback = onError;

    // Start Server-Sent Events for zero-latency signal reception
    this.startSSE();

    if (this.isPolling) return;
    this.isPolling = true;

    // Adaptive polling loop (350ms during active handshake, 1200ms when idle)
    const poll = async () => {
      if (!this.isPolling) return;
      try {
        const res = await fetch(
          `${this.baseUrl}/api/signal/poll?deviceId=${encodeURIComponent(this.deviceId)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.ok) {
          const { data } = await parseResponseJson<{ signals?: SignalMessage[] }>(res);
          if (data && Array.isArray(data.signals) && data.signals.length > 0) {
            for (const sig of data.signals) {
              if (this.onSignalReceivedCallback) {
                this.onSignalReceivedCallback(sig);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.onErrorCallback) {
          this.onErrorCallback(err);
        }
      } finally {
        if (this.isPolling) {
          const nextInterval = this.fastPollCount > 0 ? 350 : 1200;
          if (this.fastPollCount > 0) this.fastPollCount--;
          this.pollIntervalId = setTimeout(poll, nextInterval);
        }
      }
    };

    poll();

    // Heartbeat every 20 seconds
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat();
    }, 20000);
  }

  private startSSE() {
    if (typeof window === "undefined" || !("EventSource" in window)) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Only attempt SSE if same-origin or explicit http/https URL
      const sseUrl = `${this.baseUrl}/api/signal/events?deviceId=${encodeURIComponent(this.deviceId)}`;
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === "") return;
          const signal: SignalMessage = JSON.parse(event.data);
          if (signal && signal.type && this.onSignalReceivedCallback) {
            this.onSignalReceivedCallback(signal);
          }
        } catch (e) {
          console.warn("SSE parse signal error:", e);
        }
      };

      es.onerror = () => {
        // SSE dropped; polling loop continues seamlessly
      };
    } catch (e) {
      console.warn("SSE initialization error:", e);
    }
  }

  public stop() {
    this.isPolling = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollIntervalId) {
      clearTimeout(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
}

