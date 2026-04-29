import type { Signal } from "./types.js";

export interface Transport {
  send(target: string, signal: Signal): Promise<void>;
  onReceive(handler: (signal: Signal, fromPeerId?: string) => void): void;
  startReceiver(port: number): Promise<void>;
  stop(): void;
}
