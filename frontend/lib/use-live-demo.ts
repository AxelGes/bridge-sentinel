"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MOCK_AGENT_STATUSES,
  MOCK_ANOMALY_SIGNAL,
  MOCK_CONFIG_SIGNAL,
  MOCK_RISK_SCORE,
} from "./mock-data";
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

export function useLiveDemo() {
  const [state, setState] = useState<DemoState>({
    signals: [],
    riskScore: null,
    agentStatuses: MOCK_AGENT_STATUSES.map((a) => ({
      ...a,
      status: "idle",
      lastSignal: undefined,
    })),
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
          isRunning:
            hasSignals && !hasRisk ? true : hasRisk ? false : s.isRunning,
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

  // Try connecting on mount
  useEffect(() => {
    pollRiskAgent().then((live) => {
      if (live) startPolling();
    });
    return stopPolling;
  }, [pollRiskAgent, startPolling, stopPolling]);

  const runDemo = useCallback(() => {
    if (state.isRunning) return;

    // Reset state
    setState((s) => ({
      ...s,
      signals: [],
      riskScore: null,
      agentStatuses: (s.isLive ? s.agentStatuses : MOCK_AGENT_STATUSES).map(
        (a) => ({ ...a, status: "online" as const, lastSignal: undefined }),
      ),
      isRunning: true,
      isDone: false,
    }));

    // Try to trigger live demo script via Risk Agent
    if (state.isLive) {
      startPolling();
      return;
    }

    // Fall back to mock demo
    const now = Date.now();
    const configSignal = { ...MOCK_CONFIG_SIGNAL, timestamp: now };
    const anomalySignal = { ...MOCK_ANOMALY_SIGNAL, timestamp: now + 2000 };
    const riskScore = { ...MOCK_RISK_SCORE, timestamp: now + 4500 };

    setTimeout(() => {
      setState((s) => ({
        ...s,
        signals: [...s.signals, configSignal],
        agentStatuses: s.agentStatuses.map((a) =>
          a.role === "config" ? { ...a, lastSignal: configSignal } : a,
        ),
      }));
    }, 500);

    setTimeout(() => {
      setState((s) => ({
        ...s,
        signals: [...s.signals, anomalySignal],
        agentStatuses: s.agentStatuses.map((a) =>
          a.role === "anomaly" ? { ...a, lastSignal: anomalySignal } : a,
        ),
      }));
    }, 2500);

    setTimeout(() => {
      setState((s) => ({
        ...s,
        riskScore,
        isRunning: false,
        isDone: true,
      }));
    }, 5000);
  }, [state.isRunning, state.isLive, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      signals: [],
      riskScore: null,
      agentStatuses: MOCK_AGENT_STATUSES.map((a) => ({
        ...a,
        status: "idle",
        lastSignal: undefined,
      })),
      isRunning: false,
      isDone: false,
      isLive: false,
    });
    // Re-check if agents are live
    pollRiskAgent().then((live) => {
      if (live) {
        setState((s) => ({ ...s, isLive: true }));
        startPolling();
      }
    });
  }, [pollRiskAgent, startPolling, stopPolling]);

  return { ...state, runDemo, reset };
}
