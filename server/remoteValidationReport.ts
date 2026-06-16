import { getClientState, setClientState } from "./clientState";

const REMOTE_VALIDATION_STATE_KEY = "lifeos_remote_validation_report";

type ProbeStep = {
  id: string;
  ok: boolean;
  status: number;
  url: string;
  latencyMs: number;
  error?: string;
};

export type RemoteValidationReport = {
  id: string;
  label: string;
  baseUrl: string;
  url: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  passed: number;
  total: number;
  createdAt: number;
  error?: string;
  steps: ProbeStep[];
};

function sanitizeUrl(value: string) {
  const parsed = new URL(value);
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function safeString(value: unknown, fallback: string, maxLength = 120) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, maxLength);
}

export function saveRemoteValidationReport(input: {
  label?: string;
  baseUrl: string;
  result: {
    ok: boolean;
    status: number;
    url: string;
    latencyMs: number;
    error?: string;
    steps?: ProbeStep[];
  };
}, actor?: { type: string; id: string }) {
  const steps = (input.result.steps || []).map((step) => ({
    id: safeString(step.id, "unknown", 40),
    ok: Boolean(step.ok),
    status: Number.isFinite(step.status) ? step.status : 0,
    url: sanitizeUrl(step.url),
    latencyMs: Number.isFinite(step.latencyMs) ? step.latencyMs : 0,
    error: step.error ? safeString(step.error, "Remote check failed", 240) : undefined,
  }));
  const report: RemoteValidationReport = {
    id: `remote-validation-${Date.now()}`,
    label: safeString(input.label, "Saved remote entry"),
    baseUrl: sanitizeUrl(input.baseUrl),
    url: sanitizeUrl(input.result.url),
    ok: Boolean(input.result.ok),
    status: Number.isFinite(input.result.status) ? input.result.status : 0,
    latencyMs: Number.isFinite(input.result.latencyMs) ? input.result.latencyMs : 0,
    passed: steps.filter((step) => step.ok).length,
    total: steps.length || 1,
    createdAt: Date.now(),
    error: input.result.error ? safeString(input.result.error, "Remote entry check failed", 240) : undefined,
    steps,
  };
  setClientState(REMOTE_VALIDATION_STATE_KEY, report, actor);
  return report;
}

export function getRemoteValidationReport(): RemoteValidationReport | null {
  const state = getClientState(REMOTE_VALIDATION_STATE_KEY);
  return (state?.value || null) as RemoteValidationReport | null;
}
