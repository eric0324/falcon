import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/webinarjam", () => ({
  isWebinarjamConfigured: vi.fn(() => true),
  listWebinars: vi.fn(),
  getWebinar: vi.fn(),
  getRegistrants: vi.fn(),
  WebinarjamApiError: class WebinarjamApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = "WebinarjamApiError";
    }
  },
}));

import { createWebinarjamTools, webinarjamQueryInputSchema } from "./webinarjam-tools";
import {
  isWebinarjamConfigured,
  listWebinars,
  getWebinar,
  getRegistrants,
  WebinarjamApiError,
} from "@/lib/integrations/webinarjam";

const mockIsConfigured = vi.mocked(isWebinarjamConfigured);
const mockList = vi.mocked(listWebinars);
const mockGet = vi.mocked(getWebinar);
const mockRegistrants = vi.mocked(getRegistrants);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockResolvedValue(true);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(params: Record<string, unknown>): Promise<any> {
  const tools = createWebinarjamTools();
  return tools.webinarjamQuery.execute!(
    params as never,
    { toolCallId: "t", messages: [], abortSignal: undefined as never }
  );
}

describe("webinarjamQuery - list action", () => {
  it("returns webinars list", async () => {
    mockList.mockResolvedValueOnce([
      {
        webinar_id: "demo1",
        name: "Live Session",
        description: "",
        type: "scheduled",
        series: 1,
        schedules: ["2099-01-01 10:00"],
        timezone: "UTC",
      },
    ]);

    const result = await executeTool({ action: "list" });

    expect(result.success).toBe(true);
    expect(result.service).toBe("webinarjam");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].webinar_id).toBe("demo1");
  });

  it("defaults action to list when not specified", async () => {
    mockList.mockResolvedValueOnce([]);
    const result = await executeTool({});
    expect(result.success).toBe(true);
    expect(mockList).toHaveBeenCalled();
  });
});

describe("webinarjamQuery - get action", () => {
  it("returns single webinar details", async () => {
    mockGet.mockResolvedValueOnce({
      webinar_id: "demo1",
      name: "Live",
      description: "",
      type: "scheduled",
      series: 1,
      schedules: [{ date: "2099-01-01 10:00", schedule: 0 }],
      timezone: "UTC",
      presenters: [],
      registration_url: "https://example.com/r",
      registration_type: "free",
      registration_fee: 0,
      registration_currency: "",
      registration_checkout_url: "",
      registration_post_payment_url: "",
    });

    const result = await executeTool({ action: "get", webinarId: "demo1" });

    expect(result.success).toBe(true);
    expect(result.data.webinar_id).toBe("demo1");
    expect(mockGet).toHaveBeenCalledWith("demo1");
  });

  it("rejects get without webinarId", async () => {
    const result = await executeTool({ action: "get" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/webinarId/);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("webinarjamQuery - registrants action", () => {
  it("calls getRegistrants with required params only", async () => {
    mockRegistrants.mockResolvedValueOnce([
      { first_name: "Alice", email: "a@b.com" } as never,
    ]);

    const result = await executeTool({
      action: "registrants",
      webinarId: "demo1",
      scheduleId: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(mockRegistrants).toHaveBeenCalledWith({
      webinarId: "demo1",
      scheduleId: 0,
      attendedLive: undefined,
      attendedReplay: undefined,
      purchased: undefined,
      search: undefined,
      page: undefined,
    });
  });

  it("forwards all filter params to client", async () => {
    mockRegistrants.mockResolvedValueOnce([]);

    await executeTool({
      action: "registrants",
      webinarId: "demo1",
      scheduleId: 1,
      attendedLive: 2,
      attendedReplay: 1,
      purchased: 0,
      search: "alice",
      page: 2,
    });

    expect(mockRegistrants).toHaveBeenCalledWith({
      webinarId: "demo1",
      scheduleId: 1,
      attendedLive: 2,
      attendedReplay: 1,
      purchased: 0,
      search: "alice",
      page: 2,
    });
  });

  it("rejects registrants without webinarId", async () => {
    const result = await executeTool({ action: "registrants", scheduleId: 0 });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/webinarId/);
    expect(mockRegistrants).not.toHaveBeenCalled();
  });

  it("rejects registrants without scheduleId", async () => {
    const result = await executeTool({
      action: "registrants",
      webinarId: "demo1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/scheduleId/);
    expect(mockRegistrants).not.toHaveBeenCalled();
  });
});

describe("webinarjamQuery - configuration and errors", () => {
  it("returns needsConnection when API key is missing", async () => {
    mockIsConfigured.mockResolvedValueOnce(false);

    const result = await executeTool({ action: "list" });

    expect(result.success).toBe(false);
    expect(result.needsConnection).toBe(true);
    expect(result.service).toBe("webinarjam");
    expect(mockList).not.toHaveBeenCalled();
  });

  it("passes through WebinarjamApiError message", async () => {
    mockList.mockRejectedValueOnce(
      new WebinarjamApiError("Invalid webinar id")
    );

    const result = await executeTool({ action: "list" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid webinar id/);
  });

  it("includes status code on rate-limit error", async () => {
    mockList.mockRejectedValueOnce(
      new WebinarjamApiError("WebinarJam API error (429): Too many", 429)
    );

    const result = await executeTool({ action: "list" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/429/);
  });
});

describe("webinarjamQuery - input validation", () => {
  it("rejects attendedLive out of 0..4 at schema layer", async () => {
    const parsed = webinarjamQueryInputSchema.safeParse({
      action: "registrants",
      webinarId: "demo1",
      scheduleId: 0,
      attendedLive: 9,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects purchased out of 0..2 at schema layer", async () => {
    const parsed = webinarjamQueryInputSchema.safeParse({
      action: "registrants",
      webinarId: "demo1",
      scheduleId: 0,
      purchased: 5,
    });
    expect(parsed.success).toBe(false);
  });
});
