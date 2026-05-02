import http from "node:http";
import type { Signal } from "./types.js";
import type { Transport } from "./transport.js";

export class AxlTransport implements Transport {
  private axlApiPort: number;
  private handlers: Array<(signal: Signal, fromPeerId?: string) => void> = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private knownPubkeys: string[];

  constructor(opts: { axlApiPort: number; knownPubkeys?: string[] }) {
    this.axlApiPort = opts.axlApiPort;
    this.knownPubkeys = (opts.knownPubkeys ?? []).map((k) => k.toLowerCase());
  }

  // AXL's X-From-Peer-Id is a Yggdrasil-derived address that shares a
  // long prefix with the real ed25519 pubkey but diverges after ~28 hex
  // chars. We match on the first 24 chars which is unique enough for a
  // 3-agent swarm while tolerating the Yggdrasil transform.
  private isKnownPeer(fromPeerId: string): boolean {
    if (this.knownPubkeys.length === 0) return true;
    const PREFIX_LEN = 24;
    const from = fromPeerId.toLowerCase().slice(0, PREFIX_LEN);
    return this.knownPubkeys.some((pk) => pk.slice(0, PREFIX_LEN) === from);
  }

  async send(destinationPubkey: string, signal: Signal): Promise<void> {
    const body = JSON.stringify(signal);

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: this.axlApiPort,
          path: "/send",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            "X-Destination-Peer-Id": destinationPubkey,
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`AXL /send returned ${res.statusCode}`));
            } else {
              resolve();
            }
          });
        },
      );
      req.on("error", reject);
      req.end(body);
    });
  }

  onReceive(handler: (signal: Signal, fromPeerId?: string) => void): void {
    this.handlers.push(handler);
  }

  async startReceiver(_port?: number): Promise<void> {
    this.pollInterval = setInterval(() => this.poll(), 500);
  }

  private async poll(): Promise<void> {
    try {
      const { statusCode, body, fromPeerId } = await new Promise<{
        statusCode: number;
        body: string;
        fromPeerId?: string;
      }>((resolve, reject) => {
        const req = http.get(
          { hostname: "127.0.0.1", port: this.axlApiPort, path: "/recv" },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () =>
              resolve({
                statusCode: res.statusCode ?? 0,
                body: Buffer.concat(chunks).toString("utf-8"),
                fromPeerId: res.headers["x-from-peer-id"] as string | undefined,
              }),
            );
          },
        );
        req.on("error", reject);
      });

      if (statusCode === 204 || !body || body.trim() === "") return;

      if (fromPeerId && !this.isKnownPeer(fromPeerId)) {
        console.warn(`[axl] rejected message from unknown peer: ${fromPeerId}`);
        return;
      }

      const signal = JSON.parse(body) as Signal;
      for (const h of this.handlers) h(signal, fromPeerId);
    } catch {
      // AXL sidecar not ready or no messages — expected during startup
    }
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
