"use client";

import { useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import { DemoBar } from "@/components/DemoBar";
import { RiskPanel } from "@/components/RiskPanel";
import { SignalTimeline } from "@/components/SignalTimeline";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDemo } from "@/lib/use-demo";

export default function Home() {
  const { signals, riskScore, agentStatuses, isRunning, isDone, runDemo, reset } = useDemo();
  const [paused, setPaused] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <TopBar
        riskScore={riskScore?.score ?? null}
        paused={paused}
        onPausedChange={setPaused}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6 flex flex-col gap-6">
        <DemoBar isRunning={isRunning} isDone={isDone} onRun={runDemo} onReset={reset} />

        {/* Agent status row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {agentStatuses.map((agent) => (
            <AgentCard key={agent.role} agent={agent} />
          ))}
        </div>

        {/* Main content: timeline + risk panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Signals Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Live feed of Config and Anomaly agent signals
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 flex-1">
              <SignalTimeline signals={signals} />
            </CardContent>
          </Card>

          <RiskPanel riskScore={riskScore} />
        </div>
      </main>
    </div>
  );
}
