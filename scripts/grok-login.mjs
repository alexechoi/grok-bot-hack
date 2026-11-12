#!/usr/bin/env node
import { createLogin, pollLogin, GrokBotClient } from "grok-bot-sdk";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";
try {
  process.loadEnvFile(".env.local");
} catch {}
const out = resolve(
  process.env.GROK_BOT_CREDENTIALS_FILE || ".caretakr/grok-credentials.json",
);
const flow = createLogin();
console.log(
  JSON.stringify({
    phase: "authorize",
    loginUrl: flow.loginUrl,
    message: "Open this URL and sign in yourself. No credentials are printed.",
  }),
);
try {
  const credentials = await pollLogin(flow);
  await mkdir(resolve(out, ".."), { recursive: true, mode: 0o700 });
  await writeFile(out, JSON.stringify(credentials), { mode: 0o600 });
  await chmod(out, 0o600);
  const client = new GrokBotClient({
    accessToken: credentials.accessToken,
    teamId: credentials.selectedTeamId,
  });
  const { bots, truncated } = await client.listBots();
  console.log(
    JSON.stringify({
      phase: "connected",
      credentialsSaved: true,
      botCount: bots.length,
      truncated,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      phase: "failed",
      code: error instanceof Error ? error.message : "LOGIN_FAILED",
    }),
  );
  process.exitCode = 1;
}
