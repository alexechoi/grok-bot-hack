#!/usr/bin/env node
import { readFile, writeFile, chmod } from "node:fs/promises";
import { GrokBotClient } from "grok-bot-sdk";
try {
  process.loadEnvFile(".env.local");
} catch {}
const saved = process.env.GROK_BOT_ACCESS_TOKEN
  ? { accessToken: process.env.GROK_BOT_ACCESS_TOKEN }
  : JSON.parse(
      await readFile(
        process.env.GROK_BOT_CREDENTIALS_FILE ||
          ".caretakr/grok-credentials.json",
        "utf8",
      ),
    );
const client = new GrokBotClient({
  accessToken: saved.accessToken,
  teamId: saved.selectedTeamId,
  version: process.env.GROK_BOT_CLIENT_VERSION || "0.78.1",
});
const roster = await client.listBots();
if (roster.truncated)
  throw new Error("Bot roster truncated; refusing to create duplicates");
const roles = [
  ["inspector", "Caretakr · Scout", "Property inspector", "squircle", "blue"],
  ["energy", "Caretakr · Watt", "Energy analyst", "teardrop", "violet"],
  ["maintenance", "Caretakr · Fix", "Maintenance engineer", "cloud", "orange"],
  ["manager", "Caretakr · Cleo", "Property manager", "hex", "green"],
];
let env = "";
try {
  env = await readFile(".env.local", "utf8");
} catch {}
for (const [role, name, title, avatarShape, avatarColor] of roles) {
  const configured = process.env[`GROK_BOT_${role.toUpperCase()}_ID`];
  let bot = roster.bots.find((b) =>
    configured ? b.id === configured : b.name === name && b.viewerIsOwner,
  );
  if (!bot) {
    bot = (
      await client.createBot({
        name,
        title,
        avatarShape,
        avatarColor,
        purpose: `Caretakr synthetic property inspection: ${title}. Use only supplied evidence. Never claim synthetic records are verified.`,
        introductionSuppressed: true,
        kickstartRequested: false,
      })
    ).bot;
  }
  const key = `GROK_BOT_${role.toUpperCase()}_ID`,
    line = `${key}=${bot.id}`,
    regex = new RegExp(`^${key}=.*$`, "m");
  env = regex.test(env)
    ? env.replace(regex, line)
    : `${env.trimEnd()}\n${line}\n`;
  console.log(JSON.stringify({ role, botId: bot.id, status: "configured" }));
}
await writeFile(".env.local", env, { mode: 0o600 });
await chmod(".env.local", 0o600);
console.log("Four real Grok Bot roles configured. Restart the server.");
