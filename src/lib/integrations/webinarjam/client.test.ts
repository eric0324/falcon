import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn((key: string) => Promise.resolve(process.env[key])),
}));

import {
  isWebinarjamConfigured,
  listWebinars,
  getWebinar,
  getRegistrants,
  WebinarjamApiError,
} from "./client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WEBINARJAM_API_KEY", "test-key-1234");
});

describe("isWebinarjamConfigured", () => {
  it("returns true when API key is set", async () => {
    expect(await isWebinarjamConfigured()).toBe(true);
  });

  it("returns false when API key is missing", async () => {
    vi.stubEnv("WEBINARJAM_API_KEY", "");
    expect(await isWebinarjamConfigured()).toBe(false);
  });
});

describe("listWebinars", () => {
  it("POSTs to /webinars with api_key in form body", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: "success",
        webinars: [
          {
            webinar_id: "demo123",
            name: "Demo",
            description: "",
            type: "scheduled",
            series: 1,
            schedules: ["2099-01-01 10:00"],
            timezone: "UTC",
          },
        ],
      })
    );

    const result = await listWebinars();

    expect(result).toHaveLength(1);
    expect(result[0].webinar_id).toBe("demo123");
    const [calledUrl, init] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.webinarjam.com/webinarjam/webinars");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(init.body).toBe("api_key=test-key-1234");
  });
});

describe("getWebinar", () => {
  it("POSTs to /webinar with api_key and webinar_id", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: "success",
        message: "",
        webinar: {
          webinar_id: "demo123",
          name: "Demo",
          description: "",
          type: "scheduled",
          series: 1,
          schedules: [
            { date: "2099-01-01 10:00", schedule: 0 },
            { date: "2099-01-02 10:00", schedule: 1 },
          ],
          timezone: "UTC",
          presenters: [],
          registration_url: "https://example.com/r/demo123",
          registration_type: "free",
          registration_fee: 0,
          registration_currency: "",
          registration_checkout_url: "",
          registration_post_payment_url: "",
        },
      })
    );

    const result = await getWebinar("demo123");

    expect(result.webinar_id).toBe("demo123");
    expect(result.schedules).toHaveLength(2);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe("api_key=test-key-1234&webinar_id=demo123");
  });
});

describe("getRegistrants", () => {
  it("POSTs to /registrants with required params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "success", data: [] })
    );

    await getRegistrants({ webinarId: "demo123", scheduleId: 0 });

    const [calledUrl, init] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(
      "https://api.webinarjam.com/webinarjam/registrants"
    );
    const params = new URLSearchParams(init.body);
    expect(params.get("api_key")).toBe("test-key-1234");
    expect(params.get("webinar_id")).toBe("demo123");
    expect(params.get("schedule_id")).toBe("0");
  });

  it("includes optional filters when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "success", data: [] })
    );

    await getRegistrants({
      webinarId: "demo123",
      scheduleId: 0,
      attendedLive: 2,
      attendedReplay: 1,
      purchased: 0,
      search: "alice",
      page: 3,
    });

    const [, init] = mockFetch.mock.calls[0];
    const params = new URLSearchParams(init.body);
    expect(params.get("attended_live")).toBe("2");
    expect(params.get("attended_replay")).toBe("1");
    expect(params.get("purchased")).toBe("0");
    expect(params.get("search")).toBe("alice");
    expect(params.get("page")).toBe("3");
  });

  it("omits absent optional filters from body", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "success", data: [] })
    );

    await getRegistrants({ webinarId: "demo123", scheduleId: 1 });

    const [, init] = mockFetch.mock.calls[0];
    const params = new URLSearchParams(init.body);
    expect(params.has("attended_live")).toBe(false);
    expect(params.has("attended_replay")).toBe(false);
    expect(params.has("purchased")).toBe(false);
    expect(params.has("search")).toBe(false);
    expect(params.has("page")).toBe(false);
  });

  it("returns the raw data array from WebinarJam", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: "success",
        data: [
          {
            first_name: "Alice",
            last_name: "Wu",
            email: "alice@example.com",
            attended_live: 1,
            attended_replay: 0,
          },
        ],
      })
    );

    const result = await getRegistrants({
      webinarId: "demo123",
      scheduleId: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@example.com");
  });
});

describe("error paths", () => {
  it("throws WebinarjamApiError with API message when status is error", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        status: "error",
        message: "Invalid webinar id",
      })
    );

    await expect(getWebinar("bogus")).rejects.toBeInstanceOf(
      WebinarjamApiError
    );
    await expect(getWebinar("bogus")).rejects.toThrow(/Invalid webinar id/);
  });

  it("throws WebinarjamApiError on HTTP 4xx", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ message: "Forbidden" }, false, 403)
    );

    await expect(listWebinars()).rejects.toBeInstanceOf(WebinarjamApiError);
    await expect(listWebinars()).rejects.toThrow(/403/);
  });

  it("throws WebinarjamApiError on HTTP 429 with rate-limit hint", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Too many requests" }, false, 429)
    );

    await expect(listWebinars()).rejects.toThrow(/429/);
  });

  it("throws when API key is not configured", async () => {
    vi.stubEnv("WEBINARJAM_API_KEY", "");
    await expect(listWebinars()).rejects.toThrow(/WEBINARJAM_API_KEY/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
