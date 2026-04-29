import http from "node:http";
import type { Signal } from "./types.js";
import type { Transport } from "./transport.js";

export class LocalTransport implements Transport {
  private server: http.Server | null = null;
  private handlers: Array<(signal: Signal, fromPeerId?: string) => void> = [];

  async send(targetUrl: string, signal: Signal): Promise<void> {
    const body = JSON.stringify(signal);
    const url = new URL(targetUrl);

    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
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

  async startReceiver(port: number): Promise<void> {
    this.server = http.createServer((req, res) => {
      if (req.method === "POST" && req.url === "/signal") {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          try {
            const signal = JSON.parse(body) as Signal;
            for (const h of this.handlers) h(signal);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.writeHead(400);
            res.end("invalid json");
          }
        });
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });

    return new Promise((resolve) => {
      this.server!.listen(port, () => resolve());
    });
  }

  stop(): void {
    this.server?.close();
  }
}
