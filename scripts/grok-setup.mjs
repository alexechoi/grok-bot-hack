#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
let existing = "";
try {
  existing = await readFile(".env.local", "utf8");
} catch {}
const names = [
  "CARETAKR_OPERATOR_TOKEN",
  "CARETAKR_SESSION_SECRET",
  "CARETAKR_MCP_INSPECTOR_TOKEN",
  "CARETAKR_MCP_ENERGY_TOKEN",
  "CARETAKR_MCP_MAINTENANCE_TOKEN",
  "CARETAKR_MCP_MANAGER_TOKEN",
];
for (const name of names) {
  const line = new RegExp(`^${name}=(.*)$`, "m");
  const match = existing.match(line);
  if (match?.[1]?.trim()) continue;
  const value = `${name}=${randomBytes(32).toString("hex")}`;
  existing = match
    ? existing.replace(line, value)
    : `${existing.trimEnd()}\n${value}\n`;
}
await writeFile(".env.local", existing, { mode: 0o600 });
await chmod(".env.local", 0o600);
console.log(
  JSON.stringify({
    status: "ready",
    file: ".env.local",
    secretsPrinted: false,
    instruction:
      "Restart the dev server after setup. Read the operator token locally to unlock Live mode; never paste it into chat.",
  }),
);
