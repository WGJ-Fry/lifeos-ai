import fs from "fs";
import path from "path";

const VAULT_DIR = path.resolve(process.env.LIFEOS_VAULT_DIR || "/app/vault");
const CALENDAR_ICS_DIR = path.resolve(process.env.LIFEOS_CALENDAR_ICS_DIR || path.join(VAULT_DIR, "calendar"));
const MAX_PREVIEW_ICS_FILES = Number(process.env.LIFEOS_CALENDAR_PREVIEW_MAX_FILES || 10);
const MAX_PREVIEW_ITEMS = Number(process.env.LIFEOS_CALENDAR_PREVIEW_MAX_ITEMS || 30);
const MAX_PROPOSED_ITEMS = 20;

export type CalendarSyncProviderId = "ics-local" | "apple-calendar" | "google-calendar" | "system-reminders";
export type CalendarSyncItemKind = "event" | "task";
export type CalendarSyncOperationAction = "read-only-import" | "create" | "update" | "complete" | "delete";
export type CalendarSyncOperationStatus = "ready" | "blocked" | "needs-review";

export type CalendarSyncProposedItem = {
  providerId?: CalendarSyncProviderId;
  kind?: CalendarSyncItemKind;
  action?: Exclude<CalendarSyncOperationAction, "read-only-import">;
  title?: string;
  startsAt?: string;
  dueAt?: string;
  source?: string;
};

export type CalendarSyncPreviewOperation = {
  id: string;
  providerId: CalendarSyncProviderId;
  providerLabel: string;
  kind: CalendarSyncItemKind;
  action: CalendarSyncOperationAction;
  status: CalendarSyncOperationStatus;
  title: string;
  scheduledAt?: string;
  source: string;
  writesExternalSystem: false;
  risk: "low" | "medium" | "high";
  reason: string;
};

export type CalendarSyncPreview = {
  generatedAt: string;
  mode: "preview-only";
  externalWritesEnabled: false;
  writeBackSupported: false;
  providers: Array<{
    id: CalendarSyncProviderId;
    label: string;
    configured: boolean;
    readSupported: boolean;
    writeSupported: boolean;
    requiresPermission: boolean;
    status: "ready-readonly" | "not-configured" | "future-connector";
    recommendations: string[];
  }>;
  operations: CalendarSyncPreviewOperation[];
  safety: {
    dryRunOnly: true;
    requiresExplicitConsentBeforeWrite: true;
    requiresConnectorAuthBeforeWrite: true;
    requiresAuditLogBeforeWrite: true;
    requiresRollbackPlanBeforeWrite: true;
  };
  summary: {
    readOnlyItems: number;
    blockedWrites: number;
    providersReadyForRead: number;
    providersReadyForWrite: 0;
    warnings: string[];
  };
  recommendations: string[];
};

type IcsItem = {
  kind: CalendarSyncItemKind;
  title: string;
  scheduledAt?: string;
  relativePath: string;
};

function compact(value: unknown, fallback = "") {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function isInsidePath(root: string, target: string) {
  const relative = path.relative(root, target);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function collectIcsFiles(dir = CALENDAR_ICS_DIR, acc: string[] = []): string[] {
  if (acc.length >= MAX_PREVIEW_ICS_FILES) return acc;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (acc.length >= MAX_PREVIEW_ICS_FILES) break;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = path.resolve(dir, entry.name);
    if (!isInsidePath(CALENDAR_ICS_DIR, fullPath)) continue;
    if (entry.isDirectory()) collectIcsFiles(fullPath, acc);
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".ics")) acc.push(fullPath);
  }
  return acc;
}

function unfoldIcs(raw: string) {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function readIcsProperty(lines: string[], name: string) {
  const upperName = name.toUpperCase();
  const line = lines.find((candidate) => {
    const upper = candidate.toUpperCase();
    return upper.startsWith(`${upperName}:`) || upper.startsWith(`${upperName};`);
  });
  if (!line) return "";
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return "";
  return line.slice(colonIndex + 1)
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsDate(value: string) {
  const clean = value.trim();
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return "";
  const [, year, month, day, hour = "00", minute = "00", second = "00", zone] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const timestamp = zone === "Z"
    ? Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5])
    : new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]).getTime();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function parseIcsItems(filePath: string, raw: string): IcsItem[] {
  const unfolded = unfoldIcs(raw);
  const items: IcsItem[] = [];
  const relativePath = path.relative(CALENDAR_ICS_DIR, filePath);
  const parseBlock = (kind: CalendarSyncItemKind, pattern: RegExp) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(unfolded)) && items.length < MAX_PREVIEW_ITEMS) {
      const lines = match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const status = readIcsProperty(lines, "STATUS").toUpperCase();
      if (kind === "task" && ["COMPLETED", "CANCELLED"].includes(status)) continue;
      const title = compact(readIcsProperty(lines, "SUMMARY"), kind === "task" ? "Untitled task" : "Untitled event");
      const scheduledAt = parseIcsDate(readIcsProperty(lines, kind === "task" ? "DUE" : "DTSTART") || readIcsProperty(lines, "DTSTART"));
      items.push({ kind, title, scheduledAt: scheduledAt || undefined, relativePath });
    }
  };
  parseBlock("event", /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g);
  parseBlock("task", /BEGIN:VTODO([\s\S]*?)END:VTODO/g);
  return items;
}

function loadIcsItems() {
  const items: IcsItem[] = [];
  for (const filePath of collectIcsFiles()) {
    if (items.length >= MAX_PREVIEW_ITEMS) break;
    try {
      items.push(...parseIcsItems(filePath, fs.readFileSync(filePath, "utf8")));
    } catch {
      continue;
    }
  }
  return items.slice(0, MAX_PREVIEW_ITEMS);
}

function providerLabel(providerId: CalendarSyncProviderId) {
  return {
    "ics-local": "Local ICS files",
    "apple-calendar": "Apple Calendar",
    "google-calendar": "Google Calendar",
    "system-reminders": "System Reminders",
  }[providerId];
}

function providerStatuses(hasIcsDirectory: boolean): CalendarSyncPreview["providers"] {
  return [
    {
      id: "ics-local",
      label: providerLabel("ics-local"),
      configured: hasIcsDirectory,
      readSupported: hasIcsDirectory,
      writeSupported: false,
      requiresPermission: false,
      status: hasIcsDirectory ? "ready-readonly" : "not-configured",
      recommendations: hasIcsDirectory
        ? ["Local .ics files are used as read-only memory. Write-back is intentionally blocked."]
        : ["Set LIFEOS_CALENDAR_ICS_DIR or place .ics files under the vault calendar folder to enable read-only calendar memory."],
    },
    {
      id: "apple-calendar",
      label: providerLabel("apple-calendar"),
      configured: false,
      readSupported: false,
      writeSupported: false,
      requiresPermission: true,
      status: "future-connector",
      recommendations: ["Future connector must request macOS Calendar permission, generate a dry-run preview, then write an audit log before any external change."],
    },
    {
      id: "google-calendar",
      label: providerLabel("google-calendar"),
      configured: false,
      readSupported: false,
      writeSupported: false,
      requiresPermission: true,
      status: "future-connector",
      recommendations: ["Future connector must use OAuth scopes narrowly and show every create/update/delete operation before syncing."],
    },
    {
      id: "system-reminders",
      label: providerLabel("system-reminders"),
      configured: false,
      readSupported: false,
      writeSupported: false,
      requiresPermission: true,
      status: "future-connector",
      recommendations: ["Future connector must separate reminder completion from deletion and keep a rollback/audit trail."],
    },
  ];
}

function operationId(index: number, providerId: CalendarSyncProviderId, action: CalendarSyncOperationAction) {
  return `${providerId}:${action}:${index + 1}`;
}

function normalizeProposedItems(items: unknown): CalendarSyncProposedItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_PROPOSED_ITEMS).map((item) => item && typeof item === "object" ? item as CalendarSyncProposedItem : {});
}

export function buildCalendarSyncPreview(input: { proposedItems?: unknown } = {}): CalendarSyncPreview {
  const hasIcsDirectory = fs.existsSync(CALENDAR_ICS_DIR);
  const providers = providerStatuses(hasIcsDirectory);
  const operations: CalendarSyncPreviewOperation[] = [];
  const icsItems = hasIcsDirectory ? loadIcsItems() : [];

  icsItems.forEach((item, index) => {
    operations.push({
      id: operationId(index, "ics-local", "read-only-import"),
      providerId: "ics-local",
      providerLabel: providerLabel("ics-local"),
      kind: item.kind,
      action: "read-only-import",
      status: "ready",
      title: item.title,
      scheduledAt: item.scheduledAt,
      source: `ics:${item.relativePath}`,
      writesExternalSystem: false,
      risk: "low",
      reason: "Read-only local .ics memory item. LifeOS will not modify this file.",
    });
  });

  normalizeProposedItems(input.proposedItems).forEach((item, index) => {
    const providerId = item.providerId && providerStatuses(true).some((provider) => provider.id === item.providerId)
      ? item.providerId
      : "apple-calendar";
    const action = item.action && ["create", "update", "complete", "delete"].includes(item.action) ? item.action : "create";
    const kind = item.kind === "task" ? "task" : "event";
    const scheduledAt = compact(item.startsAt || item.dueAt);
    operations.push({
      id: operationId(icsItems.length + index, providerId, action),
      providerId,
      providerLabel: providerLabel(providerId),
      kind,
      action,
      status: "blocked",
      title: compact(item.title, kind === "task" ? "Untitled proposed task" : "Untitled proposed event"),
      scheduledAt: scheduledAt || undefined,
      source: compact(item.source, "admin-sync-preview"),
      writesExternalSystem: false,
      risk: action === "delete" || action === "complete" ? "high" : "medium",
      reason: "External write-back is not shipped yet. This operation is preview-only and must wait for connector auth, explicit consent, audit logging, and rollback planning.",
    });
  });

  const readOnlyItems = operations.filter((operation) => operation.action === "read-only-import").length;
  const blockedWrites = operations.filter((operation) => operation.status === "blocked").length;
  const warnings = [
    "No Apple Calendar, Google Calendar, or system reminders write-back will run in this alpha.",
    "Any future connector must use this dry-run preview before changing external calendars or tasks.",
  ];
  if (!hasIcsDirectory) warnings.unshift("No local .ics directory was found, so calendar memory is not active.");

  return {
    generatedAt: new Date().toISOString(),
    mode: "preview-only",
    externalWritesEnabled: false,
    writeBackSupported: false,
    providers,
    operations,
    safety: {
      dryRunOnly: true,
      requiresExplicitConsentBeforeWrite: true,
      requiresConnectorAuthBeforeWrite: true,
      requiresAuditLogBeforeWrite: true,
      requiresRollbackPlanBeforeWrite: true,
    },
    summary: {
      readOnlyItems,
      blockedWrites,
      providersReadyForRead: providers.filter((provider) => provider.readSupported).length,
      providersReadyForWrite: 0,
      warnings,
    },
    recommendations: [
      "Keep .ics ingestion read-only until a connector can prove authorization, dry-run preview, audit logging, and rollback behavior.",
      "Use proposedItems to preview future create/update/complete/delete operations without writing to external systems.",
      "Do not advertise two-way calendar/task sync until Apple, Google, or reminders connectors pass real account tests.",
    ],
  };
}
