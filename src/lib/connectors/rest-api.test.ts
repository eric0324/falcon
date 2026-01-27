import { describe, it, expect, vi, beforeEach } from "vitest";
import { RestConnector, executeRestApiCall } from "./rest-api";

describe("RestConnector", () => {
  const testConfig = {
    baseUrl: "https://api.example.com",
    headers: { "X-API-Key": "test-key" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateEndpoint", () => {
    it("allows any endpoint when allowedEndpoints is empty", () => {
      const connector = new RestConnector(testConfig, []);
      expect(connector.validateEndpoint("anything")).toBe(true);
    });

    it("allows listed endpoints", () => {
      const connector = new RestConnector(testConfig, ["users", "orders"]);
      expect(connector.validateEndpoint("users")).toBe(true);
      expect(connector.validateEndpoint("orders")).toBe(true);
    });

    it("rejects unlisted endpoints", () => {
      const connector = new RestConnector(testConfig, ["users"]);
      expect(connector.validateEndpoint("secrets")).toBe(false);
    });
  });

  describe("call", () => {
    it("rejects unauthorized endpoints", async () => {
      const connector = new RestConnector(testConfig, ["users"]);
      await expect(connector.call("secrets")).rejects.toThrow(
        "Endpoint not allowed: secrets"
      );
    });

    it("uses GET method when no data is provided", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const connector = new RestConnector(testConfig, ["users"]);
      await connector.call("users");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({ method: "GET", body: undefined })
      );
    });

    it("uses POST method when data is provided", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 })
      );

      const connector = new RestConnector(testConfig, ["users"]);
      await connector.call("users", { name: "Alice" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Alice" }),
        })
      );
    });

    it("includes configured headers", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const connector = new RestConnector(testConfig, ["users"]);
      await connector.call("users");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "test-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("throws on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      const connector = new RestConnector(testConfig, ["users"]);
      await expect(connector.call("users")).rejects.toThrow(
        "API call failed: 404"
      );
    });
  });
});

describe("executeRestApiCall", () => {
  const testConfig = {
    baseUrl: "https://api.example.com",
    headers: { "X-API-Key": "test-key" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the endpoint and returns data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ users: [{ id: 1 }] }), { status: 200 })
    );

    const result = await executeRestApiCall(testConfig, "users", undefined, ["users"]);
    expect(result).toEqual({ users: [{ id: 1 }] });
  });

  it("respects allowedEndpoints", async () => {
    await expect(
      executeRestApiCall(testConfig, "secrets", undefined, ["users"])
    ).rejects.toThrow("Endpoint not allowed: secrets");
  });

  it("sends POST with data", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );

    await executeRestApiCall(testConfig, "users", { name: "Alice" }, ["users"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/users",
      expect.objectContaining({ method: "POST" })
    );
  });
});
