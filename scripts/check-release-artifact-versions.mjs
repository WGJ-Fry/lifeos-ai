import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const releaseDir = process.env.LIFEOS_RELEASE_DIR ? path.resolve(process.env.LIFEOS_RELEASE_DIR) : path.join(rootDir, "release");
const fix = process.argv.includes("--fix");
const artifactPattern = /\.(dmg|zip|exe|AppImage|blockmap)$/i;
const packageVersionCore = String(packageJson.version).match(/\d+\.\d+\.\d+/)?.[0] || packageJson.version;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function versionMismatches(file) {
  const name = path.basename(file);
  if (name.includes(packageJson.version)) return [];
  return [...name.matchAll(/\b(\d+\.\d+\.\d+)\b/g)]
    .map((match) => match[1])
    .filter((version) => version !== packageVersionCore || packageJson.version !== packageVersionCore);
}

function metadataVersionMismatches(file) {
  const content = fs.readFileSync(file, "utf8");
  const scanContent = content.split(packageJson.version).join("");
  return [...scanContent.matchAll(/\b(\d+\.\d+\.\d+)\b/g)]
    .map((match) => match[1])
    .filter((version) => version !== packageVersionCore || packageJson.version !== packageVersionCore);
}

function isReleaseMetadata(file) {
  const name = path.basename(file);
  const parent = path.basename(path.dirname(file));
  return name === "SHA256SUMS" || (parent === "update-feed" && (/^latest.*\.yml$/.test(name) || name === "release-manifest.json"));
}

const artifacts = walk(releaseDir).filter((file) => artifactPattern.test(file));
const metadata = walk(releaseDir).filter(isReleaseMetadata);
const staleArtifacts = artifacts
  .map((file) => ({ file, mismatches: versionMismatches(file), kind: "artifact" }))
  .filter((item) => item.mismatches.length > 0);
const staleMetadata = metadata
  .map((file) => ({ file, mismatches: metadataVersionMismatches(file), kind: "metadata" }))
  .filter((item) => item.mismatches.length > 0);
const stale = [...staleArtifacts, ...staleMetadata];

if (stale.length === 0) {
  console.log(`Release artifact versions are clean for ${packageJson.version}.`);
  process.exit(0);
}

console.error(`Release artifacts do not match package version ${packageJson.version}:`);
for (const item of stale) {
  console.error(`- ${path.relative(rootDir, item.file)} (${item.kind}) contains ${item.mismatches.join(", ")}`);
}

if (!fix) {
  console.error("Run with --fix to delete stale release artifacts, or rebuild packages for the current version.");
  process.exit(1);
}

for (const item of stale) {
  fs.rmSync(item.file, { force: true });
  console.log(`Deleted ${path.relative(rootDir, item.file)}`);
}
