import { parseAiResponse } from "../../../services/aiRuntime";
import { getAuthHeaders } from "../../../services/lifeosApi";

export type AnalyzeFileInput =
  | { fileName: string; fileImageBase64: string; mimeType: string }
  | { fileName: string; fileContent: string };

export type AnalyzeFileResponse = {
  appName?: string;
  description?: string;
  uiCode?: string;
};

export type GenerateAppResponse = {
  appName?: string;
  uiCode?: string;
};

export type RefineCodeResponse = {
  refinedCode?: string;
};

async function postJson<T>(url: string, bodyData: unknown): Promise<T> {
  const body = JSON.stringify(bodyData);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders("POST", url, body)) },
    body,
  });
  return parseAiResponse(response);
}

export function analyzeFile(input: AnalyzeFileInput) {
  return postJson<AnalyzeFileResponse>("/api/analyze_file", input);
}

export function generateStudioApp(input: { appName: string; description: string }) {
  return postJson<GenerateAppResponse>("/api/generate_app", input);
}

export function refineCode(input: { currentCode: string; instruction: string }) {
  return postJson<RefineCodeResponse>("/api/refine_code", input);
}
