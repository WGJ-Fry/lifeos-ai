import fs from "fs";
import path from "path";
import { applyMigration } from "./db";

type Migration = {
  name: string;
  sql: string;
  version: number;
};

const migrationDir = path.join(process.cwd(), "server", "migrations");

function parseMigration(file: string): Migration | null {
  const match = file.match(/^(\d+)_(.+)\.sql$/);
  if (!match) return null;
  return {
    version: Number(match[1]),
    name: match[2],
    sql: fs.readFileSync(path.join(migrationDir, file), "utf8"),
  };
}

export function runMigrations() {
  if (!fs.existsSync(migrationDir)) return;
  const migrations = fs
    .readdirSync(migrationDir)
    .map(parseMigration)
    .filter((migration): migration is Migration => Boolean(migration))
    .sort((a, b) => a.version - b.version);

  for (const migration of migrations) {
    applyMigration(migration.version, migration.name, migration.sql);
  }
}
