"use client";

import { useCallback, useState } from "react";
import {
  MOCK_AGENT_STATUSES,
  MOCK_ANOMALY_SIGNAL,
  MOCK_CONFIG_SIGNAL,
  MOCK_RISK_SCORE,
} from "./mock-data";
import type { AgentStatus, RiskScore, Signal } from "./types";

interface DemoState {
  signals: Signal[];
  riskScore: RiskScore | null;
  agentStatuses: AgentStatus[];
  isRunning: boolean;
  isDone: boolean;
}

export function useDemo() {
  const [state, setState] = useState<DemoState>({
    signals: [],
    riskScore: null,
    agentStatuses: MOCK_AGENT_STATUSES.map((a) => ({ ...a, status: "idle", lastSignal: undefined })),
    isRunning: false,
    isDone: false,
  });

  const runDemo = useCallback(() => {
    if (state.isRunning) return;

    setState((s) => ({
      ...s,
      signals: [],
      riskScore: null,
      agentStatuses: MOCK_AGENT_STATUSES.map((a) => ({ ...a, status: "online", lastSignal: undefined })),
      isRunning: true,
      isDone: false,
    }));

    const now = Date.now();
    const configSignal = { ...MOCK_CONFIG_SIGNAL, timestamp: now };
    const anomalySignal = { ...MOCK_ANOMALY_SIGNAL, timestamp: now + 2000 };
    const riskScore = { ...MOCK_RISK_SCORE, timestamp: now + 4500 };

    // t=0: Config signal arrives
    setTimeout(() => {
      setState((s) => ({
        ...s,
        signals: [...s.signals, configSignal],
        agentStatuses: s.agentStatuses.map((a) =>
          a.role === "config" ? { ...a, lastSignal: configSignal } : a
        ),
      }));
    }, 500);

    // t=2s: Anomaly signal arrives
    setTimeout(() => {
      setState((s) => ({
        ...s,
        signals: [...s.signals, anomalySignal],
        agentStatuses: s.agentStatuses.map((a) =>
          a.role === "anomaly" ? { ...a, lastSignal: anomalySignal } : a
        ),
      }));
    }, 2500);

    // t=4.5s: Risk score arrives from 0G Compute
    setTimeout(() => {
      setState((s) => ({
        ...s,
        riskScore,
        isRunning: false,
        isDone: true,
      }));
    }, 5000);
  }, [state.isRunning]);

  const reset = useCallback(() => {
    setState({
      signals: [],
      riskScore: null,
      agentStatuses: MOCK_AGENT_STATUSES.map((a) => ({ ...a, status: "idle", lastSignal: undefined })),
      isRunning: false,
      isDone: false,
    });
  }, []);

  return { ...state, runDemo, reset };
}
