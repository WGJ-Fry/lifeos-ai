import assert from "node:assert/strict";
import test from "node:test";
import { resolveChatStateChanges } from "../src/services/chatStateChanges.ts";

test("chat state changes resolve studio, widgets, and generated app drafts", () => {
  const result = resolveChatStateChanges([
    { type: "OPEN_APP", appName: "studio" },
    { type: "OPEN_APP", appName: "navigation", destination: "人民广场", travelMode: "driving" },
    { type: "REQUEST_APP_GENERATION", appName: "记账板", description: "记录日常支出", visibility: "public" },
  ], (index) => `app-${index}`);

  assert.equal(result.shouldOpenStudio, true);
  assert.equal(result.widgetToShow, "navigation");
  assert.equal(result.widgetArgs?.destination, "人民广场");
  assert.equal(result.widgetArgs?.travelMode, "driving");
  assert.equal(result.generatedApps.length, 1);
  assert.deepEqual(
    {
      id: result.generatedApps[0].id,
      name: result.generatedApps[0].name,
      description: result.generatedApps[0].description,
      visibility: result.generatedApps[0].visibility,
      status: result.generatedApps[0].status,
      code: result.generatedApps[0].code,
    },
    {
      id: "app-2",
      name: "记账板",
      description: "记录日常支出",
      visibility: "public",
      status: "building",
      code: "",
    },
  );
});

test("chat state changes default generated apps to private visibility", () => {
  const result = resolveChatStateChanges([
    { type: "REQUEST_APP_GENERATION", appName: "仪表盘", description: "显示状态" },
  ], () => "new-app");

  assert.equal(result.generatedApps[0].visibility, "private");
});
