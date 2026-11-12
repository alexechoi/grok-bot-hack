import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  evidence,
  energyMetrics,
  baselineReadings,
  findingSchema,
  rooms,
  scoringMethod,
  workOrderSchema,
} from "../scenario";
import { Role } from "./auth";
import {
  completeInspection,
  createWorkOrder,
  emit,
  getInspection,
  recordFinding,
  registry,
  status,
} from "./store";
const runInput = z.object({ inspectionId: z.string().uuid() });
const definitions = [
  {
    name: "get_property",
    description:
      "Read the illustrative property and current live inspection. All evidence is synthetic.",
    schema: z.object({}),
  },
  {
    name: "get_room_evidence",
    description:
      "Read original source evidence for a room. Returns evidence IDs for citations.",
    schema: runInput.extend({
      roomId: z.enum(["bathroom", "kitchen", "hallway", "bedroom", "living"]),
    }),
  },
  {
    name: "get_energy_readings",
    description:
      "Read synthetic meter readings and backend-calculated deviations. Do not invent calculations.",
    schema: runInput,
  },
  {
    name: "record_finding",
    description:
      "Publish a supported finding. Inspector or Energy Analyst role only. Validates room, identity and evidence references.",
    schema: runInput.extend({ finding: findingSchema }),
  },
  {
    name: "publish_agent_status",
    description:
      "Publish your actual current task and room to the 3D scene. Identity comes from your connector credential.",
    schema: runInput.extend({
      state: z.enum([
        "Idle",
        "Assigned",
        "Moving",
        "Investigating",
        "Waiting",
        "Reporting",
        "Completed",
        "Error",
      ]),
      task: z.string().min(1).max(300),
      roomId: z
        .enum(["bathroom", "kitchen", "hallway", "bedroom", "living"])
        .optional(),
    }),
  },
  {
    name: "create_work_order",
    description:
      "Create a maintenance action for existing findings. Maintenance role only.",
    schema: runInput.extend({ workOrder: workOrderSchema }),
  },
  {
    name: "complete_inspection",
    description:
      "Publish final sourced action plan. Manager only; requires maintenance actions for every finding. Score calculated by backend.",
    schema: runInput.extend({ summary: z.string().min(1).max(12000) }),
  },
];
export async function callCaretakrTool(
  role: Role,
  name: string,
  input: unknown,
) {
  const definition = definitions.find((tool) => tool.name === name);
  if (!definition) throw new Error("Unknown tool");
  const args: unknown = definition.schema.parse(input);
  if (name === "get_property") {
    for (const run of registry.runs.values())
      if (run.mode === "live" && run.status === "running")
        emit(run, role, "tool.called", {
          tool: name,
          toolCallId: randomUUID(),
          source: "authenticated-mcp",
        });
    return {
      id: "illustrative-apartment-01",
      name: "The Willow Apartment",
      synthetic: true,
      digitalTwin: "Original procedural geometry, not a captured real address",
      rooms,
      scoringMethod,
      activeInspectionIds: [...registry.runs.values()]
        .filter((run) => run.mode === "live" && run.status === "running")
        .map((run) => run.id),
    };
  }
  const run = getInspection((args as { inspectionId: string }).inspectionId);
  if (run.mode !== "live" || run.status !== "running")
    throw new Error("A running live inspection is required");
  // Role is derived from a secret server-side connector credential, never a request argument.
  const toolCallId = randomUUID();
  emit(run, role, "tool.called", {
    tool: name,
    toolCallId,
    source: "authenticated-mcp",
  });
  if (name === "get_room_evidence") {
    const { roomId } = args as z.infer<typeof runInput> & { roomId: string };
    const items = evidence.filter((e) => e.roomId === roomId);
    emit(
      run,
      role,
      "evidence.reviewed",
      {
        evidenceIds: items.map((e) => e.id),
        toolCallId,
        source: "authenticated-mcp",
      },
      roomId,
    );
    return { evidence: items };
  }
  if (name === "get_energy_readings")
    return {
      synthetic: true,
      baselineNightlyKwh: baselineReadings,
      inspectionNightKwh: 4.8,
      interval: "00:00–06:00",
      metrics: energyMetrics,
      evidenceIds: ["EV-003", "EV-004", "EV-005"],
    };
  if (name === "record_finding")
    return recordFinding(run, role, (args as { finding: unknown }).finding);
  if (name === "create_work_order")
    return createWorkOrder(
      run,
      role,
      (args as { workOrder: unknown }).workOrder,
    );
  if (name === "publish_agent_status") {
    const { state, task, roomId } = args as {
      state: Parameters<typeof status>[2];
      task: string;
      roomId?: string;
    };
    status(run, role, state, task, roomId);
    return { accepted: true, role };
  }
  if (name === "complete_inspection")
    return completeInspection(run, role, (args as { summary: string }).summary);
  throw new Error("Unknown tool");
}
export async function handleMcp(request: Request, role: Role) {
  const server = new Server(
    { name: "caretakr", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: definitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: z.toJSONSchema(tool.schema) as {
        type: "object";
        properties: Record<string, unknown>;
      },
      annotations: {
        readOnlyHint: tool.name.startsWith("get_"),
        destructiveHint: false,
        idempotentHint: tool.name.startsWith("get_"),
        openWorldHint: false,
      },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      const value = await callCaretakrTool(
        role,
        params.name,
        params.arguments ?? {},
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(value) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text:
              error instanceof z.ZodError
                ? "Invalid tool arguments"
                : error instanceof Error &&
                    /role|identity|reference|room|finding|running|Unknown|requires|Duplicate|limit/.test(
                      error.message,
                    )
                  ? error.message
                  : "Tool request rejected",
          },
        ],
      };
    }
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 128 * 1024,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}
