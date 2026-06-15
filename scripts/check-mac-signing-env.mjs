import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const required = [
  "CSC_LINK",
  "CSC_KEY_PASSWORD",
  "APPLE_ID",
  "APPLE_APP_SPECIFIC_PASSWORD",
  "APPLE_TEAM_ID",
];

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

if (process.platform !== "darwin") {
  console.log("[SKIP] macOS signing environment check only runs on macOS.");
  process.exit(0);
}

for (const key of required) {
  const value = process.env[key] || "";
  if (!value || value.includes("REPLACE_WITH")) {
    fail(`${key} is missing or still uses a placeholder value`);
  } else {
    pass(`${key} is configured`);
  }
}

if (process.exitCode) process.exit(process.exitCode);

if (!fs.existsSync(process.env.CSC_LINK)) {
  fail(`CSC_LINK file does not exist: ${process.env.CSC_LINK}`);
  process.exit(process.exitCode);
}

const keychainPath = path.join(os.tmpdir(), `lifeos-signing-check-${Date.now()}.keychain`);
const keychainPassword = `lifeos-${Date.now()}`;

try {
  let result = run("security", ["create-keychain", "-p", keychainPassword, keychainPath]);
  if (result.status !== 0) {
    fail("failed to create temporary signing keychain");
    process.exit(process.exitCode);
  }

  result = run("security", [
    "import",
    process.env.CSC_LINK,
    "-k",
    keychainPath,
    "-T",
    "/usr/bin/codesign",
    "-T",
    "/usr/bin/productbuild",
    "-P",
    process.env.CSC_KEY_PASSWORD,
  ]);

  if (result.status !== 0) {
    fail("failed to import CSC_LINK; the .p12 password is wrong or the file is not a valid PKCS#12 certificate");
    process.exit(process.exitCode);
  }

  result = run("security", ["find-identity", "-v", "-p", "codesigning", keychainPath]);
  if (result.status !== 0) {
    fail("failed to inspect signing identities in CSC_LINK");
    process.exit(process.exitCode);
  }

  const identities = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\)/.test(line));

  if (!identities.length) {
    fail("CSC_LINK imported but contains no valid code signing identity");
    process.exit(process.exitCode);
  }

  for (const identity of identities) {
    console.log(`[INFO] ${identity.replace(/^[\d]+\)\s+[A-F0-9]+\s+/, "")}`);
  }

  if (identities.some((identity) => identity.includes("Developer ID Application:"))) {
    pass("CSC_LINK contains a Developer ID Application identity for public macOS distribution");
  } else {
    fail("CSC_LINK does not contain a Developer ID Application identity; export the Developer ID Application certificate with its private key from Keychain Access");
  }
} finally {
  run("security", ["delete-keychain", keychainPath]);
}

process.exit(process.exitCode || 0);
