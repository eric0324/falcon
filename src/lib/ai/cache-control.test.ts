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
