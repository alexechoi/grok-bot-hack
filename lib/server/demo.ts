import { setTimeout as wait } from "node:timers/promises";
import { demoProvider, executeProvider } from "../providers";
import { demoFindings } from "../scenario";
import {
  Inspection,
  completeInspection,
  createWorkOrder,
  emit,
  recordFinding,
  status,
} from "./store";
export async function runDemo(run: Inspection, speed = 1) {
  const pause = (ms: number) => wait(ms / speed);
  try {
    const result = await executeProvider(demoProvider);
    emit(run, "manager", "task.started", {
      task: "Synthetic example inspection started",
      source: "demo-script",
    });
    status(run, "manager", "Assigned", "Assigning room inspections", "living");
    await pause(2200);
    status(
      run,
      "inspector",
      "Moving",
      "Examining bathroom evidence",
      "bathroom",
    );
    status(run, "energy", "Moving", "Checking kitchen readings", "kitchen");
    status(run, "maintenance", "Waiting", "Waiting for published findings");
    status(run, "manager", "Waiting", "Waiting for specialist findings");
    await pause(6500);
    status(
      run,
      "inspector",
      "Investigating",
      "Scanning ceiling moisture",
      "bathroom",
    );
    status(
      run,
      "energy",
      "Investigating",
      "Comparing overnight consumption",
      "kitchen",
    );
    await pause(4500);
    emit(
      run,
      "inspector",
      "evidence.reviewed",
      {
        evidenceIds: ["EV-001"],
        task: "Walkthrough note reviewed",
        source: "demo-script",
      },
      "bathroom",
    );
    recordFinding(run, "inspector", demoFindings[0]);
    await pause(2500);
    emit(
      run,
      "energy",
      "evidence.reviewed",
      {
        evidenceIds: ["EV-003", "EV-004", "EV-005"],
        task: "300% deviation from the baseline",
        source: "demo-script",
      },
      "kitchen",
    );
    recordFinding(run, "energy", demoFindings[1]);
    status(run, "energy", "Reporting", "Energy anomaly published", "kitchen");
    await pause(2000);
    status(run, "inspector", "Moving", "Checking the escape route", "hallway");
    status(
      run,
      "maintenance",
      "Moving",
      "Reviewing the moisture finding",
      "bathroom",
    );
    emit(run, "inspector", "message.sent", {
      toAgentId: "maintenance",
      findingId: "F-001",
      message: "Demo dependency: moisture finding passed to maintenance",
      source: "demo-script",
    });
    await pause(5500);
    status(
      run,
      "inspector",
      "Investigating",
      "Reviewing hallway obstruction",
      "hallway",
    );
    status(
      run,
      "maintenance",
      "Investigating",
      "Assessing investigation priority",
      "bathroom",
    );
    await pause(4000);
    emit(
      run,
      "inspector",
      "evidence.reviewed",
      {
        evidenceIds: ["EV-002"],
        task: "Escape route note reviewed",
        source: "demo-script",
      },
      "hallway",
    );
    recordFinding(run, "inspector", demoFindings[2]);
    status(run, "inspector", "Completed", "Walkthrough review complete");
    status(run, "energy", "Completed", "Energy review complete");
    await pause(2000);
    status(run, "maintenance", "Moving", "Reviewing hallway safety", "hallway");
    await pause(5000);
    status(
      run,
      "maintenance",
      "Reporting",
      "Creating maintenance actions",
      "hallway",
    );
    for (const order of result.workOrders) {
      createWorkOrder(run, "maintenance", order);
      await pause(1200);
    }
    emit(run, "maintenance", "message.sent", {
      toAgentId: "manager",
      message: "Demo dependency: three work orders passed to property manager",
      source: "demo-script",
    });
    status(run, "maintenance", "Completed", "Three work orders prepared");
    status(
      run,
      "manager",
      "Reporting",
      "Generating the property report",
      "living",
    );
    await pause(4200);
    completeInspection(run, "manager", result.summary);
  } catch {
    run.status = "error";
    status(run, "manager", "Error", "Demo inspection failed");
    emit(run, "manager", "task.failed", { message: "Demo validation failed" });
  }
}
