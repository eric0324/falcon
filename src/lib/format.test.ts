import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDistanceToNow } from "./format";

describe("formatDistanceToNow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setNow(date: Date) {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  }

  const now = new Date("2025-06-15T12:00:00Z");

  it("returns 'just now' for less than 60 seconds", () => {
    setNow(now);
    const date = new Date(now.getTime() - 30 * 1000);
    expect(formatDistanceToNow(date)).toBe("just now");
  });

  it("returns '1 minute ago' for exactly 1 minute", () => {
    setNow(now);
    const date = new Date(now.getTime() - 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 minute ago");
  });

  it("returns '5 minutes ago' for 5 minutes", () => {
    setNow(now);
    const date = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("5 minutes ago");
  });

  it("returns '1 hour ago' for exactly 1 hour", () => {
    setNow(now);
    const date = new Date(now.getTime() - 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 hour ago");
  });

  it("returns '3 hours ago' for 3 hours", () => {
    setNow(now);
    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("3 hours ago");
  });

  it("returns '1 day ago' for exactly 1 day", () => {
    setNow(now);
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 day ago");
  });

  it("returns '5 days ago' for 5 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("5 days ago");
  });

  it("returns '1 week ago' for 7 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 week ago");
  });

  it("returns '3 weeks ago' for 21 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("3 weeks ago");
  });

  it("returns '1 month ago' for 30 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 month ago");
  });

  it("returns '6 months ago' for 180 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("6 months ago");
  });

  it("returns '1 year ago' for 365 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("1 year ago");
  });

  it("returns '2 years ago' for 730 days", () => {
    setNow(now);
    const date = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
    expect(formatDistanceToNow(date)).toBe("2 years ago");
  });
});
