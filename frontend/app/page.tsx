"use client";

import { useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import { DemoBar } from "@/components/DemoBar";
import { ProtocolCard } from "@/components/ProtocolCard";
import { RiskPanel } from "@/components/RiskPanel";
import { SignalTimeline } from "@/components/SignalTimeline";
import { TopBar } from "@/components/TopBar";
import { Separator } from "@/components/ui/separator";
import { useLiveDemo } from "@/lib/use-live-demo";

export default function Home() {
  const { signals, riskScore, agentStatuses, isRunning, isDone, runDemo, reset } = useLiveDemo();
  const [paused, setPaused] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar
        riskScore={riskScore?.score ?? null}
        paused={paused}
        onPausedChange={setPaused}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 flex flex-col gap-8" aria-label="Bridge monitoring dashboard">
        <h1 className="sr-only">Bridge Sentinel — KelpDAO Monitoring Dashboard</h1>

        <DemoBar isRunning={isRunning} isDone={isDone} onRun={runDemo} onReset={reset} />

        <section aria-label="Agent statuses" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {agentStatuses.map((agent, i) => (
            <div key={agent.role} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <AgentCard agent={agent} />
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-label="Signals timeline" className="animate-fade-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold font-[family-name:var(--font-display)]">Signals Timeline</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Live feed from Config and Anomaly agents
                </p>
              </div>
            </div>
            <Separator className="mb-4" />
            <SignalTimeline signals={signals} />
          </section>

          <aside className="flex flex-col gap-6" aria-label="Risk assessment">
            <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
              <RiskPanel riskScore={riskScore} />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              <ProtocolCard />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
