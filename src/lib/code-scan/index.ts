import { prisma } from "@/lib/prisma";
import { Prisma, ScanStatus } from "@prisma/client";
import { runRuleScan, type ScanFinding } from "./rules";
import { runLlmScan } from "./llm-analyzer";

function deriveStatus(findings: ScanFinding[]): ScanStatus {
  if (findings.some((f) => f.severity === "critical")) return "FAIL";
  if (findings.some((f) => f.severity === "warning")) return "WARN";
  return "PASS";
}

function toJson(data: ScanFinding[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

/**
 * Called during deploy: accepts pre-computed findings, saves to DB,
 * kicks off LLM in background.
 */
export async function scanOnDeploy(
  toolId: string,
  code: string,
  precomputedFindings?: ScanFinding[]
): Promise<{ status: ScanStatus; findings: ScanFinding[]; blocked: boolean }> {
  const findings = precomputedFindings ?? runRuleScan(code);
  const status = deriveStatus(findings);
  const blocked = status === "FAIL";

  // Save rule-scan result
  const scan = await prisma.codeScan.create({
    data: { toolId, status, findings: toJson(findings) },
  });

  // Background LLM analysis — use captured scan.id to avoid race condition
  const scanId = scan.id;
  runLlmScan(code)
    .then(async ({ findings: llmFindings, summary }) => {
      const allFindings = [...findings, ...llmFindings];
      const finalStatus = deriveStatus(allFindings);
      await prisma.codeScan.update({
        where: { id: scanId },
        data: {
          status: finalStatus,
          findings: toJson(allFindings),
          llmSummary: summary,
        },
      });
    })
    .catch(() => {
      // LLM failure is non-critical
    });

  return { status, findings, blocked };
}

/**
 * Full scan triggered by Admin: rule + LLM, waits for both.
 */
export async function runFullScan(toolId: string) {
  const tool = await prisma.tool.findUniqueOrThrow({
    where: { id: toolId },
    select: { code: true },
  });

  const ruleFindings = runRuleScan(tool.code);
  const { findings: llmFindings, summary } = await runLlmScan(tool.code);
  const allFindings = [...ruleFindings, ...llmFindings];
  const status = deriveStatus(allFindings);

  const scan = await prisma.codeScan.create({
    data: {
      toolId,
      status,
      findings: toJson(allFindings),
      llmSummary: summary,
    },
  });

  return scan;
}
