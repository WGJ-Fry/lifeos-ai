export function normalizePublicBaseUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return "";
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

export function getConfiguredPublicBaseUrl() {
  return normalizePublicBaseUrl(process.env.PUBLIC_BASE_URL || process.env.APP_URL || "");
}

export function getConfiguredPublicOrigin() {
  const baseUrl = getConfiguredPublicBaseUrl();
  if (!baseUrl) return "";
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "";
  }
}

export function getConfiguredPublicBasePath() {
  const baseUrl = getConfiguredPublicBaseUrl();
  if (!baseUrl) return "";
  try {
    const pathname = new URL(baseUrl).pathname.replace(/\/+$/, "");
    return pathname === "/" ? "" : pathname;
  } catch {
    return "";
  }
}

export function stripConfiguredPublicBasePath(pathname: string) {
  const basePath = getConfiguredPublicBasePath();
  if (!basePath) return pathname || "/";
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return pathname || "/";
}
