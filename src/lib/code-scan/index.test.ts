import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindUniqueOrThrow = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    codeScan: {
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    tool: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
  },
}));

// Mock LLM analyzer
vi.mock("./llm-analyzer", () => ({
  runLlmScan: vi.fn(),
}));

import { scanOnDeploy, runFullScan } from "./index";
import { runLlmScan } from "./llm-analyzer";

const mockedRunLlmScan = vi.mocked(runLlmScan);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: LLM returns nothing (never resolves for background tests)
  mockedRunLlmScan.mockResolvedValue({ findings: [], summary: "" });
  mockCreate.mockResolvedValue({ id: "scan-1" });
  mockUpdate.mockResolvedValue({});
});

describe("scanOnDeploy", () => {
  it("blocks deploy when code contains critical issues", async () => {
    const result = await scanOnDeploy("tool-1", 'eval("bad")');

    expect(result.blocked).toBe(true);
    expect(result.status).toBe("FAIL");
    expect(result.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("allows deploy when code has only warnings", async () => {
    const code = "setInterval(() => tick(), 1000);";
    const result = await scanOnDeploy("tool-1", code);

    expect(result.blocked).toBe(false);
    expect(result.status).toBe("WARN");
  });

  it("returns PASS for clean code", async () => {
    const cleanCode = "function App() { return <div>Hello</div>; }";
    const result = await scanOnDeploy("tool-1", cleanCode);

    expect(result.blocked).toBe(false);
    expect(result.status).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("saves scan result to database", async () => {
    await scanOnDeploy("tool-1", "setInterval(() => tick(), 1000);");

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate.mock.calls[0][0].data.toolId).toBe("tool-1");
    expect(mockCreate.mock.calls[0][0].data.status).toBe("WARN");
  });

  it("uses pre-computed findings when provided", async () => {
    const precomputed = [
      { severity: "info" as const, category: "quality" as const, rule: "test", message: "test" },
    ];
    const result = await scanOnDeploy("tool-1", "any code", precomputed);

    // Should not re-scan — status derived from precomputed
    expect(result.findings).toBe(precomputed);
    expect(result.status).toBe("PASS"); // info only → PASS
  });

  it("kicks off background LLM scan", async () => {
    await scanOnDeploy("tool-1", "const x = 1;");

    expect(mockedRunLlmScan).toHaveBeenCalledOnce();
  });

  it("uses captured scan ID in LLM callback (no race condition)", async () => {
    mockCreate.mockResolvedValue({ id: "scan-42" });
    mockedRunLlmScan.mockResolvedValue({
      findings: [{ severity: "info", category: "quality", rule: "llm-1", message: "LLM found" }],
      summary: "LLM summary",
    });

    await scanOnDeploy("tool-1", "const x = 1;");

    // Wait for background promise to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate.mock.calls[0][0].where.id).toBe("scan-42");
  });

  it("does not throw when LLM fails", async () => {
    mockedRunLlmScan.mockRejectedValue(new Error("LLM down"));

    const result = await scanOnDeploy("tool-1", "const x = 1;");

    expect(result.status).toBe("PASS");
    // No throw
  });
});

describe("runFullScan", () => {
  it("runs both rule and LLM scan", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ code: 'console.log("x");' });
    mockedRunLlmScan.mockResolvedValue({
      findings: [{ severity: "warning", category: "quality", rule: "llm-1", message: "test" }],
      summary: "Overall ok",
    });
    mockCreate.mockResolvedValue({
      id: "scan-1",
      status: "WARN",
      findings: [],
      llmSummary: "Overall ok",
    });

    const scan = await runFullScan("tool-1");

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      select: { code: true },
    });
    expect(mockedRunLlmScan).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(scan.id).toBe("scan-1");
  });

  it("combines rule findings and LLM findings", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ code: 'eval("x");' });
    mockedRunLlmScan.mockResolvedValue({
      findings: [{ severity: "info", category: "quality", rule: "llm-1", message: "llm" }],
      summary: "summary",
    });
    mockCreate.mockResolvedValue({ id: "scan-1" });

    await runFullScan("tool-1");

    const createArgs = mockCreate.mock.calls[0][0].data;
    // Should have both rule findings (eval → critical) and LLM findings
    expect(createArgs.status).toBe("FAIL");
  });
});
