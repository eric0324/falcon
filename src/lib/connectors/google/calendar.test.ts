import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleCalendarConnector } from "./calendar";

// Mock the token manager
vi.mock("@/lib/google/token-manager", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GoogleCalendarConnector", () => {
  let connector: GoogleCalendarConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new GoogleCalendarConnector("test-user-id");
  });

  describe("getCapabilities", () => {
    it("should return correct capabilities", () => {
      const caps = connector.getCapabilities();
      expect(caps).toEqual({
        canQuery: false,
        canList: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      });
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should list calendars when no resource specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { id: "primary", summary: "Main Calendar", primary: true },
              { id: "work", summary: "Work Calendar" },
            ],
          }),
      });

      const result = await connector.list({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "primary",
        name: "Main Calendar",
        isPrimary: true,
      });
    });

    it("should list events when resource is calendarId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "event1",
                summary: "Team Meeting",
                start: { dateTime: "2024-01-15T10:00:00Z" },
                end: { dateTime: "2024-01-15T11:00:00Z" },
                status: "confirmed",
              },
            ],
          }),
      });

      const result = await connector.list({ resource: "primary" });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].summary).toBe("Team Meeting");
    });

    it("should get specific event when resource includes eventId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event1",
            summary: "Team Meeting",
            description: "Weekly sync",
            location: "Conference Room A",
            start: { dateTime: "2024-01-15T10:00:00Z" },
            end: { dateTime: "2024-01-15T11:00:00Z" },
          }),
      });

      const result = await connector.list({ resource: "primary/event1" });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBe("Team Meeting");
      expect(result.data.description).toBe("Weekly sync");
    });
  });

  describe("create", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should create a new event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "new-event",
            summary: "New Meeting",
            start: { dateTime: "2024-01-20T14:00:00Z" },
            end: { dateTime: "2024-01-20T15:00:00Z" },
          }),
      });

      const result = await connector.create({
        resource: "primary",
        data: {
          summary: "New Meeting",
          start: "2024-01-20T14:00:00Z",
          end: "2024-01-20T15:00:00Z",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBe("New Meeting");
    });

    it("should fail if required fields are missing", async () => {
      const result = await connector.create({
        resource: "primary",
        data: {
          summary: "Meeting without time",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("start");
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should update an event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "event1",
            summary: "Updated Meeting",
            start: { dateTime: "2024-01-15T10:00:00Z" },
            end: { dateTime: "2024-01-15T11:00:00Z" },
          }),
      });

      const result = await connector.update({
        resource: "primary/event1",
        data: {
          summary: "Updated Meeting",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBe("Updated Meeting");
    });

    it("should fail if resource format is invalid", async () => {
      const result = await connector.update({
        resource: "primary", // Missing eventId
        data: { summary: "Test" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("calendarId/eventId");
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should delete an event", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await connector.delete({
        resource: "primary/event1",
        data: {},
      });

      expect(result.success).toBe(true);
    });
  });
});
