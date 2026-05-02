"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentStatus, RiskScore, Signal } from "./types";

const RISK_AGENT_URL =
  process.env.NEXT_PUBLIC_RISK_AGENT_URL || "http://localhost:4000";
const POLL_MS = 2000;

interface DemoState {
  signals: Signal[];
  riskScore: RiskScore | null;
  agentStatuses: AgentStatus[];
  isRunning: boolean;
  isDone: boolean;
  isLive: boolean;
}

const EMPTY_AGENTS: AgentStatus[] = [
  { name: "Config Agent", role: "config", status: "idle", ensName: "config.bridgesentinel.eth" },
  { name: "Anomaly Agent", role: "anomaly", status: "idle", ensName: "anomaly.bridgesentinel.eth" },
  { name: "Risk Agent", role: "risk", status: "idle", ensName: "risk.bridgesentinel.eth" },
];

export function useLiveDemo() {
  const [state, setState] = useState<DemoState>({
    signals: [],
    riskScore: null,
    agentStatuses: EMPTY_AGENTS,
    isRunning: false,
    isDone: false,
    isLive: false,
  });

  const polling = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRiskAgent = useCallback(async () => {
    try {
      const res = await fetch(`${RISK_AGENT_URL}/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return false;

      const data = await res.json();
      setState((s) => {
        const hasRisk = data.riskScore && data.riskScore.score > 0;
        const hasSignals = data.signals && data.signals.length > 0;
        return {
          ...s,
          signals: data.signals ?? s.signals,
          riskScore: data.riskScore ?? s.riskScore,
          agentStatuses: data.agents ?? s.agentStatuses,
          isLive: true,
          isDone: hasRisk && hasSignals ? true : s.isDone,
          isRunning: hasSignals && !hasRisk ? true : hasRisk ? false : s.isRunning,
        };
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (polling.current) return;
    polling.current = true;
    intervalRef.current = setInterval(pollRiskAgent, POLL_MS);
    pollRiskAgent();
  }, [pollRiskAgent]);

  const stopPolling = useCallback(() => {
    polling.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Always poll on mount — no mock fallback
  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  // Run button resets the UI and keeps polling live data
  const runDemo = useCallback(() => {
    if (state.isRunning) return;
    setState((s) => ({
      ...s,
      signals: [],
      riskScore: null,
      agentStatuses: s.agentStatuses.map((a) => ({
        ...a,
        status: "online" as const,
        lastSignal: undefined,
      })),
      isRunning: true,
      isDone: false,
    }));
    startPolling();
  }, [state.isRunning, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      signals: [],
      riskScore: null,
      agentStatuses: EMPTY_AGENTS,
      isRunning: false,
      isDone: false,
      isLive: false,
    });
    startPolling();
  }, [startPolling, stopPolling]);

  return { ...state, runDemo, reset };
}
