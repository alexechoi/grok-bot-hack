#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { GrokBotClient } from "grok-bot-sdk";
import { z } from "zod";
try {
  process.loadEnvFile(".env.local");
} catch {}
try {
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
  await client.getMe();
  const roster = await client.listBots();
  console.log(
    JSON.stringify({
      accountVerified: true,
      botCount: roster.bots.length,
      truncated: roster.truncated,
      product: "Grok Bot desktop protocol",
      sdkVersion: "0.78.1",
      unofficial: true,
    }),
  );
  if (!process.argv.includes("--round-trip")) process.exit(0);
  const bot =
    roster.bots.find((b) => b.id === process.env.GROK_BOT_INSPECTOR_ID) ||
    roster.bots.find((b) => b.viewerIsOwner && b.harness === "temporal" && /^Caretakr.*Scout/.test(b.name)) ||
    roster.bots.find((b) => b.viewerIsOwner && b.kind !== "room" && b.harness === "temporal");
  if (!bot)
    throw new Error(
      "No owned Bot available; create one in the Grok Bot app first.",
    );
  const requestId = randomUUID(),
    before = await client.listTranscript({
      botId: bot.id,
      sessionId: bot.sessionId,
      limit: 1,
    });
  const afterUpdatedSeq = before.entries.reduce(
    (m, e) => (BigInt(e.updatedSeq) > BigInt(m) ? e.updatedSeq : m),
    "0",
  );
  const sent = await client.sendMessage({
    botId: bot.id,
    sessionId: bot.sessionId,
    messageId: requestId,
    text: `Caretakr connectivity and evidence test. Use only this synthetic walkthrough note EV-001: Brown water stain above the bathroom shower, bubbling paint, no active dripping observed. No moisture measurements available. Do not browse, contact anyone or change any data. Reply ONLY one JSON object with keys requestId (value ${JSON.stringify(requestId)}), evidenceId (EV-001), suspectedIssue (a cautious one-sentence interpretation), recommendedAction (one-sentence investigation). Do not echo the prompt.`,
  });
  console.log(
    JSON.stringify({
      phase: "delivered",
      delivery: sent.delivery,
      requestId,
      botId: bot.id,
    }),
  );
  const schema = z.object({
    requestId: z.literal(requestId),
    evidenceId: z.literal("EV-001"),
    suspectedIssue: z.string().min(1),
    recommendedAction: z.string().min(1),
  });
  let success = false;
  for await (const event of client.watchBot({
    botId: bot.id,
    sessionId: bot.sessionId,
    cursor: { generation: before.generation, afterUpdatedSeq },
    signal: AbortSignal.timeout(180000),
  })) {
    if (event.type === "turn.failed") throw new Error("Grok Bot turn failed");
    if (event.type !== "message") continue;
    let parsed;
    try {
      parsed = JSON.parse(
        event.data.text
          .trim()
          .replace(/^```(?:json)?\s*/, "")
          .replace(/\s*```$/, ""),
      );
    } catch {
      continue;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) continue;
    const record = {
      verifiedAt: new Date().toISOString(),
      product: "Grok Bot",
      botId: bot.id,
      requestId,
      entryId: event.data.entryId,
      sourceCursor: event.id,
      result: result.data,
    };
    await mkdir(".caretakr", { recursive: true, mode: 0o700 });
    await writeFile(
      ".caretakr/round-trip.json",
      JSON.stringify(record, null, 2),
      { mode: 0o600 },
    );
    console.log(JSON.stringify({ phase: "round-trip-verified", ...record }));
    success = true;
    break;
  }
  if (!success)
    throw new Error(
      "No validated response received; accepted delivery is not a successful round trip.",
    );
} catch (error) {
  console.error(
    JSON.stringify({
      phase: "failed",
      code: error?.code || "CHECK_FAILED",
      message: error?.code
        ? "Grok Bot protocol request failed"
        : String(error?.message || "Check failed"),
    }),
  );
  process.exitCode = 1;
}
