import { describe, it, expect } from "vitest";
import { trimSheetsReadPayload, trimGmailBody } from "./trim-tool-payload";

describe("trimSheetsReadPayload", () => {
  it("removes the raw field when data has { headers, rows, raw }", () => {
    const data = {
      headers: ["name", "age"],
      rows: [{ name: "Alice", age: "30" }],
      raw: [["name", "age"], ["Alice", "30"]],
    };
    const out = trimSheetsReadPayload(data);
    expect(out).toEqual({
      headers: ["name", "age"],
      rows: [{ name: "Alice", age: "30" }],
    });
    expect((out as Record<string, unknown>).raw).toBeUndefined();
  });

  it("returns data unchanged when raw is absent (different shape)", () => {
    const data = {
      headers: ["name", "age"],
      rows: [{ name: "Alice", age: "30" }],
    };
    const out = trimSheetsReadPayload(data);
    expect(out).toEqual(data);
  });

  it("returns data unchanged when not an object (file list / null / string)", () => {
    expect(trimSheetsReadPayload(null)).toBeNull();
    expect(trimSheetsReadPayload(undefined)).toBeUndefined();
    expect(trimSheetsReadPayload("text")).toBe("text");
    const arr = [{ id: "1" }, { id: "2" }];
    expect(trimSheetsReadPayload(arr)).toBe(arr);
  });

  it("does not mutate the input object", () => {
    const data = {
      headers: ["a"],
      rows: [{ a: "1" }],
      raw: [["a"], ["1"]],
    };
    const snapshot = JSON.parse(JSON.stringify(data));
    trimSheetsReadPayload(data);
    expect(data).toEqual(snapshot);
  });

  it("preserves headers and rows byte-identical when stripping raw", () => {
    const data = {
      headers: ["x", "y", "z"],
      rows: [
        { x: "1", y: "2", z: "3" },
        { x: "4", y: "5", z: "6" },
      ],
      raw: [["x", "y", "z"], ["1", "2", "3"], ["4", "5", "6"]],
    };
    const out = trimSheetsReadPayload(data) as { headers: unknown; rows: unknown };
    expect(out.headers).toBe(data.headers);
    expect(out.rows).toBe(data.rows);
  });
});

describe("trimGmailBody", () => {
  it("truncates body and appends a marker when body > 5000 chars", () => {
    const longBody = "a".repeat(7000);
    const data = {
      from: "x@y.com",
      subject: "Hi",
      body: longBody,
    };
    const out = trimGmailBody(data) as { body: string };
    expect(out.body.startsWith("a".repeat(5000))).toBe(true);
    expect(out.body).toMatch(/\[Body truncated: kept first 5000 chars of 7000 total\]\s*$/);
  });

  it("leaves body unchanged when length <= 5000", () => {
    const data = {
      from: "x@y.com",
      body: "short body",
    };
    const out = trimGmailBody(data);
    expect(out).toEqual(data);
  });

  it("returns data unchanged when body field is absent (list result)", () => {
    const data = {
      id: "msg-1",
      from: "x@y.com",
      subject: "Hi",
      snippet: "preview",
    };
    const out = trimGmailBody(data);
    expect(out).toEqual(data);
  });

  it("returns data unchanged when body is not a string", () => {
    const data = { body: 12345 };
    const out = trimGmailBody(data);
    expect(out).toEqual(data);
  });

  it("returns data unchanged when not an object", () => {
    expect(trimGmailBody(null)).toBeNull();
    expect(trimGmailBody(undefined)).toBeUndefined();
    expect(trimGmailBody("text")).toBe("text");
  });

  it("honors a custom maxChars option", () => {
    const data = { body: "a".repeat(300) };
    const out = trimGmailBody(data, { maxChars: 100 }) as { body: string };
    expect(out.body.startsWith("a".repeat(100))).toBe(true);
    expect(out.body).toMatch(/\[Body truncated: kept first 100 chars of 300 total\]\s*$/);
  });

  it("preserves non-body fields when truncating", () => {
    const data = {
      from: "x@y.com",
      to: "a@b.com",
      subject: "Hi",
      date: "2026-05-15",
      labels: ["INBOX"],
      isUnread: true,
      body: "x".repeat(6000),
    };
    const out = trimGmailBody(data) as Record<string, unknown>;
    expect(out.from).toBe("x@y.com");
    expect(out.to).toBe("a@b.com");
    expect(out.subject).toBe("Hi");
    expect(out.date).toBe("2026-05-15");
    expect(out.labels).toEqual(["INBOX"]);
    expect(out.isUnread).toBe(true);
  });

  it("does not mutate the input object", () => {
    const data = { from: "x@y.com", body: "a".repeat(8000) };
    const snapshot = JSON.parse(JSON.stringify(data));
    trimGmailBody(data);
    expect(data).toEqual(snapshot);
  });

  it("marker format includes both kept and total char counts", () => {
    const data = { body: "a".repeat(5001) };
    const out = trimGmailBody(data) as { body: string };
    expect(out.body).toContain("kept first 5000 chars");
    expect(out.body).toContain("of 5001 total");
  });
});
