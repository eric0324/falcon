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

  describe("getCapabilities", () => {
    it("returns correct capabilities", () => {
      const connector = new RestConnector(testConfig);
      const caps = connector.getCapabilities();
      expect(caps.canQuery).toBe(false);
      expect(caps.canList).toBe(true);
      expect(caps.canCreate).toBe(true);
      expect(caps.canUpdate).toBe(true);
      expect(caps.canDelete).toBe(true);
    });
  });

  describe("validateEndpoint", () => {
    it("allows any endpoint when allowedEndpoints is empty", () => {
      const connector = new RestConnector(testConfig);
      expect(connector.validateEndpoint("anything")).toBe(true);
    });

    it("allows listed endpoints", () => {
      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users", "orders"],
      });
      expect(connector.validateEndpoint("users")).toBe(true);
      expect(connector.validateEndpoint("orders")).toBe(true);
    });

    it("allows sub-paths of listed endpoints", () => {
      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
      expect(connector.validateEndpoint("users/123")).toBe(true);
    });

    it("rejects unlisted endpoints", () => {
      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
      expect(connector.validateEndpoint("secrets")).toBe(false);
    });
  });

  describe("call (legacy)", () => {
    it("rejects unauthorized endpoints", async () => {
      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
      await expect(connector.call("secrets")).rejects.toThrow(
        "Endpoint not allowed: secrets"
      );
    });

    it("uses GET method when no data is provided", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
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

      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
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

      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
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

      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
      await expect(connector.call("users")).rejects.toThrow(
        "API call failed: 404"
      );
    });
  });

  describe("list", () => {
    it("fetches list of resources", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 })
      );

      const connector = new RestConnector(testConfig);
      const result = await connector.list({ resource: "users" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.rowCount).toBe(2);
    });

    it("returns error for blocked endpoint", async () => {
      const connector = new RestConnector({
        ...testConfig,
        allowedEndpoints: ["users"],
      });
      const result = await connector.list({ resource: "secrets" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Endpoint not allowed: secrets");
    });
  });

  describe("create", () => {
    it("creates new resource", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: "Alice" }), { status: 201 })
      );

      const connector = new RestConnector(testConfig);
      const result = await connector.create({
        resource: "users",
        data: { name: "Alice" },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: "Alice" });
    });
  });

  describe("update", () => {
    it("updates existing resource", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: "Bob" }), { status: 200 })
      );

      const connector = new RestConnector(testConfig);
      const result = await connector.update({
        resource: "users",
        data: { name: "Bob" },
        where: { id: "1" },
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  describe("delete", () => {
    it("deletes resource", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const connector = new RestConnector(testConfig);
      const result = await connector.delete({
        resource: "users",
        data: {},
        where: { id: "1" },
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/1",
        expect.objectContaining({ method: "DELETE" })
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
