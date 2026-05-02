import http from "node:http";
import type { Signal } from "./types.js";
import type { Transport } from "./transport.js";

export class AxlTransport implements Transport {
  private axlApiPort: number;
  private handlers: Array<(signal: Signal, fromPeerId?: string) => void> = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private knownPubkeys: Set<string>;

  constructor(opts: { axlApiPort: number; knownPubkeys?: string[] }) {
    this.axlApiPort = opts.axlApiPort;
    this.knownPubkeys = new Set(opts.knownPubkeys ?? []);
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
          res.on("end", () => resolve());
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
      const data = await new Promise<string>((resolve, reject) => {
        const req = http.get(
          { hostname: "127.0.0.1", port: this.axlApiPort, path: "/recv" },
          (res) => {
            let body = "";
            res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            res.on("end", () => resolve(body));
          },
        );
        req.on("error", reject);
      });

      if (!data || data.trim() === "" || data.trim() === "null") return;

      const messages = JSON.parse(data);
      const list = Array.isArray(messages) ? messages : [messages];

      for (const msg of list) {
        const fromPeerId = msg.from_peer_id ?? msg["X-From-Peer-Id"];
        if (this.knownPubkeys.size > 0 && fromPeerId && !this.knownPubkeys.has(fromPeerId)) {
          console.warn(`[axl] rejected message from unknown peer: ${fromPeerId}`);
          continue;
        }
        const signal = (typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body ?? msg) as Signal;
        for (const h of this.handlers) h(signal, fromPeerId);
      }
    } catch {
      // AXL sidecar not ready or no messages — expected during startup
    }
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
