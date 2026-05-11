import { describe, it, expect } from "vitest";
import { extractProperties } from "./properties";

describe("extractProperties", () => {
  describe("title and rich_text", () => {
    it("extracts title property as joined plain text", () => {
      const result = extractProperties({
        Name: {
          type: "title",
          title: [{ plain_text: "Refactor " }, { plain_text: "auth" }],
        },
      });
      expect(result.Name).toBe("Refactor auth");
    });

    it("extracts rich_text property as joined plain text", () => {
      const result = extractProperties({
        Notes: {
          type: "rich_text",
          rich_text: [{ plain_text: "Owner is bob" }],
        },
      });
      expect(result.Notes).toBe("Owner is bob");
    });

    it("omits empty title", () => {
      const result = extractProperties({
        Name: { type: "title", title: [] },
      });
      expect(result).not.toHaveProperty("Name");
    });

    it("omits empty rich_text", () => {
      const result = extractProperties({
        Notes: { type: "rich_text", rich_text: [] },
      });
      expect(result).not.toHaveProperty("Notes");
    });
  });

  describe("select / status / multi_select", () => {
    it("extracts select option name", () => {
      const result = extractProperties({
        Priority: { type: "select", select: { name: "High" } },
      });
      expect(result.Priority).toBe("High");
    });

    it("extracts status option name", () => {
      const result = extractProperties({
        Status: { type: "status", status: { name: "In Progress" } },
      });
      expect(result.Status).toBe("In Progress");
    });

    it("extracts multi_select as array of names", () => {
      const result = extractProperties({
        Tags: {
          type: "multi_select",
          multi_select: [{ name: "frontend" }, { name: "p1" }],
        },
      });
      expect(result.Tags).toEqual(["frontend", "p1"]);
    });

    it("omits null select", () => {
      const result = extractProperties({
        Priority: { type: "select", select: null },
      });
      expect(result).not.toHaveProperty("Priority");
    });

    it("omits null status", () => {
      const result = extractProperties({
        Status: { type: "status", status: null },
      });
      expect(result).not.toHaveProperty("Status");
    });

    it("omits empty multi_select", () => {
      const result = extractProperties({
        Tags: { type: "multi_select", multi_select: [] },
      });
      expect(result).not.toHaveProperty("Tags");
    });
  });

  describe("date", () => {
    it("returns { start } when end is null", () => {
      const result = extractProperties({
        Due: { type: "date", date: { start: "2026-05-20", end: null } },
      });
      expect(result.Due).toEqual({ start: "2026-05-20" });
    });

    it("returns { start, end } when range provided", () => {
      const result = extractProperties({
        Sprint: {
          type: "date",
          date: { start: "2026-05-10", end: "2026-05-24" },
        },
      });
      expect(result.Sprint).toEqual({
        start: "2026-05-10",
        end: "2026-05-24",
      });
    });

    it("omits null date", () => {
      const result = extractProperties({
        Due: { type: "date", date: null },
      });
      expect(result).not.toHaveProperty("Due");
    });
  });

  describe("primitives", () => {
    it("extracts number", () => {
      const result = extractProperties({
        Count: { type: "number", number: 42 },
      });
      expect(result.Count).toBe(42);
    });

    it("extracts zero number (not omitted)", () => {
      const result = extractProperties({
        Count: { type: "number", number: 0 },
      });
      expect(result.Count).toBe(0);
    });

    it("omits null number", () => {
      const result = extractProperties({
        Count: { type: "number", number: null },
      });
      expect(result).not.toHaveProperty("Count");
    });

    it("extracts checkbox true", () => {
      const result = extractProperties({
        Done: { type: "checkbox", checkbox: true },
      });
      expect(result.Done).toBe(true);
    });

    it("extracts checkbox false (not omitted)", () => {
      const result = extractProperties({
        Done: { type: "checkbox", checkbox: false },
      });
      expect(result.Done).toBe(false);
    });

    it("extracts url, email, phone_number", () => {
      const result = extractProperties({
        Link: { type: "url", url: "https://example.com" },
        Contact: { type: "email", email: "a@b.com" },
        Phone: { type: "phone_number", phone_number: "+886-2-1234-5678" },
      });
      expect(result.Link).toBe("https://example.com");
      expect(result.Contact).toBe("a@b.com");
      expect(result.Phone).toBe("+886-2-1234-5678");
    });

    it("omits null url / email / phone", () => {
      const result = extractProperties({
        Link: { type: "url", url: null },
        Contact: { type: "email", email: null },
        Phone: { type: "phone_number", phone_number: null },
      });
      expect(result).not.toHaveProperty("Link");
      expect(result).not.toHaveProperty("Contact");
      expect(result).not.toHaveProperty("Phone");
    });
  });

  describe("people / created_by / last_edited_by", () => {
    it("extracts people as array of names", () => {
      const result = extractProperties({
        Owner: {
          type: "people",
          people: [
            { id: "u1", name: "Alice" },
            { id: "u2", name: "Bob" },
          ],
        },
      });
      expect(result.Owner).toEqual(["Alice", "Bob"]);
    });

    it("omits empty people array", () => {
      const result = extractProperties({
        Owner: { type: "people", people: [] },
      });
      expect(result).not.toHaveProperty("Owner");
    });

    it("extracts created_by as name", () => {
      const result = extractProperties({
        Creator: {
          type: "created_by",
          created_by: { id: "u1", name: "Alice" },
        },
      });
      expect(result.Creator).toBe("Alice");
    });

    it("extracts last_edited_by as name", () => {
      const result = extractProperties({
        Editor: {
          type: "last_edited_by",
          last_edited_by: { id: "u2", name: "Bob" },
        },
      });
      expect(result.Editor).toBe("Bob");
    });
  });

  describe("files", () => {
    it("extracts file names", () => {
      const result = extractProperties({
        Attachments: {
          type: "files",
          files: [
            { name: "a.pdf", file: { url: "https://x/a.pdf" } },
            { name: "b.png", external: { url: "https://x/b.png" } },
          ],
        },
      });
      expect(result.Attachments).toEqual(["a.pdf", "b.png"]);
    });

    it("falls back to url when name is missing", () => {
      const result = extractProperties({
        Attachments: {
          type: "files",
          files: [{ external: { url: "https://x/anon.jpg" } }],
        },
      });
      expect(result.Attachments).toEqual(["https://x/anon.jpg"]);
    });

    it("omits empty files array", () => {
      const result = extractProperties({
        Attachments: { type: "files", files: [] },
      });
      expect(result).not.toHaveProperty("Attachments");
    });
  });

  describe("relation", () => {
    it("returns array of page ids", () => {
      const result = extractProperties({
        Project: {
          type: "relation",
          relation: [{ id: "page_a" }, { id: "page_b" }],
        },
      });
      expect(result.Project).toEqual(["page_a", "page_b"]);
    });

    it("omits empty relation array", () => {
      const result = extractProperties({
        Project: { type: "relation", relation: [] },
      });
      expect(result).not.toHaveProperty("Project");
    });
  });

  describe("formula", () => {
    it("unwraps number formula", () => {
      const result = extractProperties({
        Total: { type: "formula", formula: { type: "number", number: 99 } },
      });
      expect(result.Total).toBe(99);
    });

    it("unwraps string formula", () => {
      const result = extractProperties({
        Label: {
          type: "formula",
          formula: { type: "string", string: "Q2-2026" },
        },
      });
      expect(result.Label).toBe("Q2-2026");
    });

    it("unwraps boolean formula", () => {
      const result = extractProperties({
        Flag: { type: "formula", formula: { type: "boolean", boolean: true } },
      });
      expect(result.Flag).toBe(true);
    });

    it("unwraps date formula", () => {
      const result = extractProperties({
        Deadline: {
          type: "formula",
          formula: {
            type: "date",
            date: { start: "2026-06-01", end: null },
          },
        },
      });
      expect(result.Deadline).toEqual({ start: "2026-06-01" });
    });

    it("omits formula with null underlying value", () => {
      const result = extractProperties({
        Total: { type: "formula", formula: { type: "number", number: null } },
      });
      expect(result).not.toHaveProperty("Total");
    });
  });

  describe("rollup", () => {
    it("unwraps number rollup", () => {
      const result = extractProperties({
        RolledTotal: {
          type: "rollup",
          rollup: { type: "number", number: 12 },
        },
      });
      expect(result.RolledTotal).toBe(12);
    });

    it("unwraps array rollup by mapping items to their primitive values", () => {
      const result = extractProperties({
        AllTags: {
          type: "rollup",
          rollup: {
            type: "array",
            array: [
              { type: "select", select: { name: "frontend" } },
              { type: "select", select: { name: "backend" } },
            ],
          },
        },
      });
      expect(result.AllTags).toEqual(["frontend", "backend"]);
    });

    it("omits rollup with null underlying value", () => {
      const result = extractProperties({
        RolledTotal: {
          type: "rollup",
          rollup: { type: "number", number: null },
        },
      });
      expect(result).not.toHaveProperty("RolledTotal");
    });
  });

  describe("timestamps", () => {
    it("extracts created_time as ISO string", () => {
      const result = extractProperties({
        CreatedAt: {
          type: "created_time",
          created_time: "2026-05-01T08:00:00.000Z",
        },
      });
      expect(result.CreatedAt).toBe("2026-05-01T08:00:00.000Z");
    });

    it("extracts last_edited_time as ISO string", () => {
      const result = extractProperties({
        EditedAt: {
          type: "last_edited_time",
          last_edited_time: "2026-05-10T12:00:00.000Z",
        },
      });
      expect(result.EditedAt).toBe("2026-05-10T12:00:00.000Z");
    });
  });

  describe("unique_id", () => {
    it("formats prefix-number when prefix exists", () => {
      const result = extractProperties({
        Ticket: {
          type: "unique_id",
          unique_id: { prefix: "PROJ", number: 42 },
        },
      });
      expect(result.Ticket).toBe("PROJ-42");
    });

    it("returns plain number string when prefix is null", () => {
      const result = extractProperties({
        Ticket: {
          type: "unique_id",
          unique_id: { prefix: null, number: 7 },
        },
      });
      expect(result.Ticket).toBe("7");
    });

    it("omits unique_id when number is null", () => {
      const result = extractProperties({
        Ticket: {
          type: "unique_id",
          unique_id: { prefix: "PROJ", number: null },
        },
      });
      expect(result).not.toHaveProperty("Ticket");
    });
  });

  describe("unknown and edge cases", () => {
    it("silently skips unknown property types", () => {
      const result = extractProperties({
        Mystery: { type: "future_notion_type_xyz", future_notion_type_xyz: {} },
      });
      expect(result).not.toHaveProperty("Mystery");
    });

    it("does not throw on malformed property entries", () => {
      expect(() =>
        extractProperties({
          Broken: { type: "title" },
          NoType: {},
          NullVal: null,
        } as Record<string, unknown>)
      ).not.toThrow();
    });

    it("returns empty object for empty input", () => {
      expect(extractProperties({})).toEqual({});
    });
  });

  describe("integration: realistic Notion task page", () => {
    it("extracts all common fields from a typical task", () => {
      const result = extractProperties({
        Name: {
          type: "title",
          title: [{ plain_text: "Ship Notion property reader" }],
        },
        Status: { type: "status", status: { name: "In Progress" } },
        Priority: { type: "select", select: { name: "High" } },
        Tags: {
          type: "multi_select",
          multi_select: [{ name: "backend" }, { name: "p1" }],
        },
        Due: { type: "date", date: { start: "2026-05-20", end: null } },
        Owner: {
          type: "people",
          people: [{ id: "u1", name: "Alice" }],
        },
        "Done?": { type: "checkbox", checkbox: false },
        Estimate: { type: "number", number: 3 },
        Project: {
          type: "relation",
          relation: [{ id: "page_proj_1" }],
        },
        Total: {
          type: "formula",
          formula: { type: "number", number: 99 },
        },
        EmptyTags: { type: "multi_select", multi_select: [] },
        NullStatus: { type: "status", status: null },
      });

      expect(result).toEqual({
        Name: "Ship Notion property reader",
        Status: "In Progress",
        Priority: "High",
        Tags: ["backend", "p1"],
        Due: { start: "2026-05-20" },
        Owner: ["Alice"],
        "Done?": false,
        Estimate: 3,
        Project: ["page_proj_1"],
        Total: 99,
      });
    });
  });
});
