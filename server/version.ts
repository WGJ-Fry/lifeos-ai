import fs from "fs";
import path from "path";

let cachedPackageVersion: string | null = null;

export function getPackageVersion() {
  if (cachedPackageVersion) return cachedPackageVersion;
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    cachedPackageVersion = typeof packageJson.version === "string" && packageJson.version.trim()
      ? packageJson.version.trim()
      : "0.0.0-unknown";
  } catch {
    cachedPackageVersion = "0.0.0-unknown";
  }
  return cachedPackageVersion;
}
