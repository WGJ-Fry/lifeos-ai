import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

async function withCalendarPreview(testName, files, run) {
  const root = await mkdtemp(path.join(tmpdir(), `lifeos-calendar-preview-${testName}-`));
  const calendarDir = path.join(root, "calendar");
  const previousVaultDir = process.env.LIFEOS_VAULT_DIR;
  const previousCalendarDir = process.env.LIFEOS_CALENDAR_ICS_DIR;
  process.env.LIFEOS_VAULT_DIR = root;
  process.env.LIFEOS_CALENDAR_ICS_DIR = calendarDir;

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(calendarDir, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    }
    const module = await import(`../server/calendarSyncPreview.ts?case=${testName}-${Date.now()}`);
    await run(module, root);
  } finally {
    if (previousVaultDir === undefined) delete process.env.LIFEOS_VAULT_DIR;
    else process.env.LIFEOS_VAULT_DIR = previousVaultDir;
    if (previousCalendarDir === undefined) delete process.env.LIFEOS_CALENDAR_ICS_DIR;
    else process.env.LIFEOS_CALENDAR_ICS_DIR = previousCalendarDir;
    await rm(root, { recursive: true, force: true });
  }
}

test("calendar sync preview imports local ICS items as read-only operations", async () => {
  await withCalendarPreview("readonly", {
    "personal.ics": [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART:20260701T090000Z",
      "SUMMARY:Strategy review",
      "END:VEVENT",
      "BEGIN:VTODO",
      "DUE:20260702T120000Z",
      "SUMMARY:Renew contract",
      "STATUS:NEEDS-ACTION",
      "END:VTODO",
      "BEGIN:VTODO",
      "DUE:20260702T120000Z",
      "SUMMARY:Completed task should stay out",
      "STATUS:COMPLETED",
      "END:VTODO",
      "END:VCALENDAR",
    ].join("\n"),
  }, async ({ buildCalendarSyncPreview }, root) => {
    const preview = buildCalendarSyncPreview();
    assert.equal(preview.mode, "preview-only");
    assert.equal(preview.externalWritesEnabled, false);
    assert.equal(preview.writeBackSupported, false);
    assert.equal(preview.summary.readOnlyItems, 2);
    assert.equal(preview.summary.providersReadyForRead, 1);
    assert.equal(preview.summary.providersReadyForWrite, 0);
    assert.equal(preview.providers.find((provider) => provider.id === "ics-local")?.status, "ready-readonly");
    assert.equal(preview.providers.find((provider) => provider.id === "apple-calendar")?.writeSupported, false);
    assert.equal(preview.operations.every((operation) => operation.writesExternalSystem === false), true);
    assert.equal(preview.operations.filter((operation) => operation.action === "read-only-import").length, 2);
    assert.match(JSON.stringify(preview), /Strategy review/);
    assert.match(JSON.stringify(preview), /Renew contract/);
    assert.doesNotMatch(JSON.stringify(preview), /Completed task should stay out/);
    assert.doesNotMatch(JSON.stringify(preview), new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});

test("calendar sync preview blocks proposed external writes until connectors are shipped", async () => {
  await withCalendarPreview("blocked-writes", {}, async ({ buildCalendarSyncPreview }) => {
    const preview = buildCalendarSyncPreview({
      proposedItems: [
        {
          providerId: "google-calendar",
          kind: "event",
          action: "create",
          title: "Client follow-up",
          startsAt: "2026-07-03T09:00:00.000Z",
          source: "studio-generated-plan",
        },
        {
          providerId: "system-reminders",
          kind: "task",
          action: "complete",
          title: "Pay invoice",
          dueAt: "2026-07-04T12:00:00.000Z",
        },
      ],
    });
    assert.equal(preview.summary.blockedWrites, 2);
    assert.equal(preview.operations.filter((operation) => operation.status === "blocked").length, 2);
    assert.equal(preview.operations.some((operation) => operation.providerId === "google-calendar" && operation.action === "create"), true);
    assert.equal(preview.operations.some((operation) => operation.providerId === "system-reminders" && operation.risk === "high"), true);
    assert.equal(preview.safety.requiresExplicitConsentBeforeWrite, true);
    assert.equal(preview.safety.requiresAuditLogBeforeWrite, true);
    assert.match(preview.recommendations.join("\n"), /Do not advertise two-way calendar\/task sync/);
  });
});
