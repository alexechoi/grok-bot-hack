#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createUnlockLink } from "./unlock-live.mjs";
const require = createRequire(import.meta.url);
try {
  await import("./grok-setup.mjs");
  const args = process.argv.slice(2),
    portIndex = args.findIndex((a) => a === "--port" || a === "-p");
  const port =
    portIndex >= 0
      ? Number(args[portIndex + 1])
      : Number(process.env.PORT || 3000);
  console.log(
    `\nOpen your Live workspace (one use, expires in 5 minutes):\n${await createUnlockLink(`http://localhost:${port}`)}\n`,
  );
  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", ...args],
    { stdio: "inherit", env: process.env },
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => {
    process.exitCode = code || 0;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
