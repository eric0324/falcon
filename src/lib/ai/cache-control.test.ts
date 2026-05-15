import { describe, it, expect } from "vitest";
import { cacheableSystem, cacheableTools } from "./cache-control";

describe("cacheableSystem", () => {
  it("wraps system prompt with cacheControl for Anthropic models", () => {
    const result = cacheableSystem("hello", "claude-haiku");
    expect(result).toEqual({
      role: "system",
      content: "hello",
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
  });

  it("uses the same shape for opus / sonnet", () => {
    expect(cacheableSystem("x", "claude-opus-47")).toMatchObject({
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    });
    expect(cacheableSystem("x", "claude-sonnet")).toMatchObject({
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    });
  });

  it("returns the original string for non-Anthropic models", () => {
    expect(cacheableSystem("hello", "gpt-5-mini")).toBe("hello");
    expect(cacheableSystem("hello", "gemini-flash")).toBe("hello");
  });
});

describe("cacheableTools", () => {
  it("adds cacheControl to the last tool for Anthropic models", () => {
    const tools = {
      foo: { description: "foo", inputSchema: {} },
      bar: { description: "bar", inputSchema: {} },
    };
    const result = cacheableTools(tools, "claude-haiku");
    expect(result.foo).toEqual(tools.foo);
    expect(result.bar).toMatchObject({
      description: "bar",
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
  });

  it("returns the original tools unchanged for non-Anthropic models", () => {
    const tools = { foo: { description: "foo", inputSchema: {} } };
    const result = cacheableTools(tools, "gpt-5-mini");
    expect(result).toBe(tools);
  });

  it("returns empty tools unchanged regardless of model", () => {
    const empty = {};
    expect(cacheableTools(empty, "claude-haiku")).toBe(empty);
    expect(cacheableTools(empty, "gpt-5-mini")).toBe(empty);
  });

  it("does not mutate the original tools object", () => {
    const tools = {
      a: { description: "a", inputSchema: {} },
      b: { description: "b", inputSchema: {} },
    };
    const snapshot = JSON.parse(JSON.stringify(tools));
    cacheableTools(tools, "claude-haiku");
    expect(tools).toEqual(snapshot);
  });
});

describe("cacheableSystem with layered segments", () => {
  const SEGS = {
    core: "core text",
    capabilities: "capabilities text",
    volatile: "volatile text",
  };

  it("Anthropic: returns Array<SystemModelMessage> in order [core, capabilities, volatile]", () => {
    const result = cacheableSystem(SEGS, "claude-haiku");
    expect(Array.isArray(result)).toBe(true);
    const arr = result as Array<{ role: string; content: string }>;
    expect(arr).toHaveLength(3);
    expect(arr[0]).toMatchObject({ role: "system", content: "core text" });
    expect(arr[1]).toMatchObject({ role: "system", content: "capabilities text" });
    expect(arr[2]).toMatchObject({ role: "system", content: "volatile text" });
  });

  it("Anthropic: Core and Capabilities messages carry cacheControl=ephemeral, Volatile does not", () => {
    const result = cacheableSystem(SEGS, "claude-haiku") as Array<Record<string, unknown>>;
    expect(result[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
    expect(result[1].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
    // Volatile must NOT have providerOptions (avoid wasted cache write on volatile content)
    expect(result[2].providerOptions).toBeUndefined();
  });

  it("Anthropic: empty Capabilities segment is omitted (no zero-length message)", () => {
    const result = cacheableSystem(
      { core: "core", capabilities: "", volatile: "vol" },
      "claude-haiku"
    ) as Array<{ content: string }>;
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("core");
    expect(result[1].content).toBe("vol");
  });

  it("Anthropic: empty Volatile segment is omitted", () => {
    const result = cacheableSystem(
      { core: "core", capabilities: "cap", volatile: "" },
      "claude-haiku"
    ) as Array<{ content: string }>;
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("core");
    expect(result[1].content).toBe("cap");
  });

  it("Anthropic: works the same way on opus / sonnet / opus-47", () => {
    for (const model of ["claude-opus", "claude-sonnet", "claude-opus-47"] as const) {
      const result = cacheableSystem(SEGS, model);
      expect(Array.isArray(result)).toBe(true);
      const arr = result as Array<{ providerOptions?: unknown }>;
      expect(arr[0].providerOptions).toBeDefined();
      expect(arr[1].providerOptions).toBeDefined();
      expect(arr[2].providerOptions).toBeUndefined();
    }
  });

  it("OpenAI: returns concatenated string in order [core, capabilities, volatile], no providerOptions", () => {
    const result = cacheableSystem(SEGS, "gpt-5-mini");
    expect(result).toBe("core textcapabilities textvolatile text");
  });

  it("OpenAI: empty segments are skipped during concat (no extra separator)", () => {
    const result = cacheableSystem(
      { core: "A", capabilities: "", volatile: "B" },
      "gpt-5-mini"
    );
    expect(result).toBe("AB");
  });

  it("Gemini: returns concatenated string in order [core, capabilities, volatile]", () => {
    const result = cacheableSystem(SEGS, "gemini-flash");
    expect(result).toBe("core textcapabilities textvolatile text");
  });

  it("Anthropic: count of cache_control breakpoints in system equals number of non-empty stable segments (Core + Capabilities)", () => {
    const result = cacheableSystem(SEGS, "claude-haiku") as Array<{
      providerOptions?: unknown;
    }>;
    const withBreakpoint = result.filter((p) => p.providerOptions !== undefined);
    expect(withBreakpoint).toHaveLength(2);
  });
});
