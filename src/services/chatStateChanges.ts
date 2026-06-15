import type { CustomApp } from "../types";

export type ResolvedChatStateChanges = {
  shouldOpenStudio: boolean;
  widgetToShow?: string;
  widgetArgs?: Record<string, unknown>;
  generatedApps: CustomApp[];
};

const widgetArgKeys = [
  "destination",
  "start",
  "travelMode",
  "phoneNumber",
  "email",
  "subject",
  "text",
  "shortcutName",
  "targetUrl",
] as const;

export function resolveChatStateChanges(
  stateChanges: Array<Record<string, any>> | undefined,
  createId: (index: number) => string = (index) => `${Date.now()}-${index}`,
): ResolvedChatStateChanges {
  const result: ResolvedChatStateChanges = {
    shouldOpenStudio: false,
    generatedApps: [],
  };

  for (const [index, change] of (stateChanges || []).entries()) {
    if (change.type === "OPEN_APP") {
      if (change.appName === "studio") {
        result.shouldOpenStudio = true;
      } else {
        result.widgetToShow = change.appName;
        result.widgetArgs = Object.fromEntries(widgetArgKeys.map((key) => [key, change[key]]));
      }
    } else if (change.type === "REQUEST_APP_GENERATION") {
      result.generatedApps.push({
        id: createId(index),
        name: change.appName,
        description: change.description,
        visibility: change.visibility || "private",
        status: "building",
        createdAt: Date.now(),
        code: "",
      });
    }
  }

  return result;
}
