import { demoFindings, Finding, WorkOrder, validateAnalysis } from "./scenario";

export interface AIProvider {
  name: string;
  analyseInspectionEvidence(): Promise<Finding[]>;
  analyseEnergyReadings(): Promise<Finding[]>;
  assessMaintenance(findings: Finding[]): Promise<WorkOrder[]>;
  generatePropertyReport(
    findings: Finding[],
    workOrders: WorkOrder[],
  ): Promise<string>;
}
export const demoProvider: AIProvider = {
  name: "Synthetic example · deterministic",
  async analyseInspectionEvidence() {
    return demoFindings.filter((f) => f.category !== "energy");
  },
  async analyseEnergyReadings() {
    return demoFindings.filter((f) => f.category === "energy");
  },
  async assessMaintenance(findings) {
    return findings.map((f, i) => ({
      id: `WO-00${i + 1}`,
      findingIds: [f.id],
      title: f.title,
      priority: f.severity,
      action: f.recommendedAction,
      trade:
        f.category === "water"
          ? "Plumber"
          : f.category === "energy"
            ? "Electrician"
            : "Property operations",
    }));
  },
  async generatePropertyReport() {
    return "Three operational concerns require follow-up: a suspected bathroom moisture issue, unusual overnight kitchen electricity consumption and a potentially obstructed hallway escape route. Prioritise clearing the route and investigating moisture, then verify the kitchen loads. All inputs are synthetic and the causes remain unconfirmed.";
  },
};
export function importedProvider(input: unknown): AIProvider {
  const data = validateAnalysis(input);
  return {
    name: "Imported results · origin unverified",
    async analyseInspectionEvidence() {
      return data.findings.filter((f) => f.category !== "energy");
    },
    async analyseEnergyReadings() {
      return data.findings.filter((f) => f.category === "energy");
    },
    async assessMaintenance() {
      return data.workOrders;
    },
    async generatePropertyReport() {
      return data.summary;
    },
  };
}
export async function executeProvider(provider: AIProvider) {
  const [inspection, energy] = await Promise.all([
    provider.analyseInspectionEvidence(),
    provider.analyseEnergyReadings(),
  ]);
  const findings = [...inspection, ...energy];
  const workOrders = await provider.assessMaintenance(findings);
  const summary = await provider.generatePropertyReport(findings, workOrders);
  return validateAnalysis({ findings, workOrders, summary });
}
