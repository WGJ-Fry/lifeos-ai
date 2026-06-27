import { getPackageVersion } from "./version";

const DEFAULT_OWNER = "WGJ-Fry";
const DEFAULT_REPO = "lifeos-ai";
const RELEASE_CHECK_TIMEOUT_MS = Number(process.env.LIFEOS_RELEASE_CHECK_TIMEOUT_MS || 5000);

export type ReleaseUpdateAsset = {
  name: string;
  size: number;
  downloadUrl: string;
};

export type ReleaseUpdateCheck = {
  checkedAt: string;
  status: "up-to-date" | "update-available" | "unavailable" | "error";
  current: {
    version: string;
    tag: string;
  };
  latest: {
    version: string;
    tag: string;
    name: string;
    url: string;
    prerelease: boolean;
    publishedAt: string;
    assetCount: number;
    assets: ReleaseUpdateAsset[];
    checksumAsset?: ReleaseUpdateAsset;
  } | null;
  updateAvailable: boolean;
  manualUpdateRequired: true;
  autoUpdateEnabled: false;
  reason: string;
  recommendations: string[];
};

type ReleaseApiRecord = {
  tag_name?: string;
  name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  assets?: Array<{
    name?: string;
    size?: number;
    browser_download_url?: string;
  }>;
};

type VersionParts = {
  major: number;
  minor: number;
  patch: number;
  prereleaseRank: number;
  prereleaseNumber: number;
};

function configuredRepository() {
  const raw = process.env.LIFEOS_RELEASE_REPOSITORY || `${DEFAULT_OWNER}/${DEFAULT_REPO}`;
  const match = raw.trim().match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) return { owner: DEFAULT_OWNER, repo: DEFAULT_REPO };
  return { owner: match[1], repo: match[2] };
}

export function packageVersionToReleaseTag(version = getPackageVersion()) {
  const normalized = version.trim();
  const prerelease = normalized.match(/^(\d+\.\d+\.\d+)-(alpha|beta|rc)(?:\.\d+)?$/);
  if (prerelease) return `v${prerelease[1]}-${prerelease[2]}`;
  return `v${normalized}`;
}

function parseVersionTag(value: string): VersionParts | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)(?:\.(\d+))?)?$/i);
  if (!match) return null;
  const prerelease = (match[4] || "").toLowerCase();
  const prereleaseRank = prerelease === "alpha" ? 0 : prerelease === "beta" ? 1 : prerelease === "rc" ? 2 : 3;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prereleaseRank,
    prereleaseNumber: match[5] ? Number(match[5]) : 0,
  };
}

export function compareReleaseTags(left: string, right: string) {
  const a = parseVersionTag(left);
  const b = parseVersionTag(right);
  if (!a || !b) return left.localeCompare(right);
  for (const key of ["major", "minor", "patch", "prereleaseRank", "prereleaseNumber"] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  return 0;
}

function releaseVersionFromTag(tag: string) {
  return tag.replace(/^v/, "");
}

function normalizeAsset(asset: NonNullable<ReleaseApiRecord["assets"]>[number]): ReleaseUpdateAsset {
  return {
    name: String(asset.name || "download"),
    size: typeof asset.size === "number" && Number.isFinite(asset.size) ? asset.size : 0,
    downloadUrl: String(asset.browser_download_url || ""),
  };
}

function normalizeRelease(record: ReleaseApiRecord) {
  const tag = String(record.tag_name || "");
  const assets = Array.isArray(record.assets) ? record.assets.map(normalizeAsset) : [];
  return {
    version: releaseVersionFromTag(tag),
    tag,
    name: String(record.name || tag),
    url: String(record.html_url || ""),
    prerelease: Boolean(record.prerelease),
    publishedAt: String(record.published_at || ""),
    assetCount: assets.length,
    assets,
    checksumAsset: assets.find((asset) => asset.name === "SHA256SUMS"),
  };
}

function buildRecommendations(status: ReleaseUpdateCheck["status"], latestTag: string | null) {
  if (status === "update-available") {
    return [
      `Download ${latestTag} from GitHub Releases.`,
      "Verify SHA256SUMS before opening the new desktop package.",
      "Create a SQLite backup before replacing the current app.",
      "Automatic update is intentionally disabled for unsigned alpha packages.",
    ];
  }
  if (status === "up-to-date") {
    return [
      "This installation matches the newest visible GitHub prerelease.",
      "Keep manual SHA256 verification for unsigned alpha packages.",
    ];
  }
  return [
    "Open GitHub Releases manually and compare the newest tag before updating.",
    "Do not download installers from unofficial mirrors.",
  ];
}

export async function checkReleaseUpdate(options: { fetchImpl?: typeof fetch; now?: Date } = {}): Promise<ReleaseUpdateCheck> {
  const currentVersion = getPackageVersion();
  const currentTag = packageVersionToReleaseTag(currentVersion);
  const checkedAt = (options.now || new Date()).toISOString();
  const { owner, repo } = configuredRepository();
  const url = process.env.LIFEOS_RELEASE_API_URL || `https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`;
  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELEASE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "LifeOS-AI-Update-Check",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`release_api_http_${response.status}`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error("release_api_invalid_response");
    const candidates = records
      .filter((release: ReleaseApiRecord) => !release.draft && parseVersionTag(String(release.tag_name || "")))
      .sort((a: ReleaseApiRecord, b: ReleaseApiRecord) => compareReleaseTags(String(a.tag_name || ""), String(b.tag_name || "")));
    const latestRecord = candidates[candidates.length - 1];
    if (!latestRecord) {
      return {
        checkedAt,
        status: "unavailable",
        current: { version: currentVersion, tag: currentTag },
        latest: null,
        updateAvailable: false,
        manualUpdateRequired: true,
        autoUpdateEnabled: false,
        reason: "no_public_release_found",
        recommendations: buildRecommendations("unavailable", null),
      };
    }
    const latest = normalizeRelease(latestRecord);
    const updateAvailable = compareReleaseTags(latest.tag, currentTag) > 0;
    const status = updateAvailable ? "update-available" : "up-to-date";
    return {
      checkedAt,
      status,
      current: { version: currentVersion, tag: currentTag },
      latest,
      updateAvailable,
      manualUpdateRequired: true,
      autoUpdateEnabled: false,
      reason: updateAvailable ? "newer_release_available" : "current_release_is_latest",
      recommendations: buildRecommendations(status, latest.tag),
    };
  } catch (error: any) {
    return {
      checkedAt,
      status: "error",
      current: { version: currentVersion, tag: currentTag },
      latest: null,
      updateAvailable: false,
      manualUpdateRequired: true,
      autoUpdateEnabled: false,
      reason: error?.name === "AbortError" ? "release_check_timeout" : String(error?.message || "release_check_failed").slice(0, 120),
      recommendations: buildRecommendations("error", null),
    };
  } finally {
    clearTimeout(timer);
  }
}
