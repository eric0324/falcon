import { describe, it, expect } from "vitest";
import {
  extractDatabaseSchema,
  translatePropertyFilter,
} from "./property-filter";
import type { NotionDatabase } from "./client";

function makeDatabase(
  props: Array<{ name: string; type: string }>
): NotionDatabase {
  const properties: NotionDatabase["properties"] = {};
  for (const p of props) {
    properties[p.name] = { id: `id_${p.name}`, name: p.name, type: p.type };
  }
  return {
    id: "db1",
    title: [{ plain_text: "Tasks" }],
    description: [],
    url: "https://notion.so/db1",
    properties,
  };
}

describe("extractDatabaseSchema", () => {
  it("builds a schema map and finds the title property", () => {
    const db = makeDatabase([
      { name: "Name", type: "title" },
      { name: "Status", type: "status" },
      { name: "Due", type: "date" },
    ]);
    const schema = extractDatabaseSchema(db);
    expect(schema.titlePropertyName).toBe("Name");
    expect(schema.propsByName.get("Status")).toEqual({ type: "status" });
    expect(schema.propsByName.get("Due")).toEqual({ type: "date" });
  });

  it("falls back to 'Name' as title property when properties is missing", () => {
    const db = makeDatabase([]);
    db.properties = undefined;
    const schema = extractDatabaseSchema(db);
    expect(schema.titlePropertyName).toBe("Name");
    expect(schema.propsByName.size).toBe(0);
  });

  it("lists availableProperties for error messages", () => {
    const db = makeDatabase([
      { name: "Name", type: "title" },
      { name: "Status", type: "status" },
    ]);
    const schema = extractDatabaseSchema(db);
    expect(schema.availableProperties).toEqual([
      { name: "Name", type: "title" },
      { name: "Status", type: "status" },
    ]);
  });
});

describe("translatePropertyFilter — basic operators", () => {
  it("translates title equals", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([{ name: "Name", type: "title" }])
    );
    const result = translatePropertyFilter(
      { property: "Name", equals: "Ship" },
      schema
    );
    expect(result).toEqual({
      filter: { property: "Name", title: { equals: "Ship" } },
    });
  });

  it("translates rich_text contains", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([{ name: "Notes", type: "rich_text" }])
    );
    const result = translatePropertyFilter(
      { property: "Notes", contains: "bug" },
      schema
    );
    expect(result).toEqual({
      filter: { property: "Notes", rich_text: { contains: "bug" } },
    });
  });

  it("translates url / email / phone_number equals", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([
        { name: "Link", type: "url" },
        { name: "Mail", type: "email" },
        { name: "Phone", type: "phone_number" },
      ])
    );
    expect(
      translatePropertyFilter({ property: "Link", equals: "https://x" }, schema)
    ).toEqual({ filter: { property: "Link", url: { equals: "https://x" } } });
    expect(
      translatePropertyFilter({ property: "Mail", equals: "a@b.com" }, schema)
    ).toEqual({ filter: { property: "Mail", email: { equals: "a@b.com" } } });
    expect(
      translatePropertyFilter({ property: "Phone", equals: "12345" }, schema)
    ).toEqual({
      filter: { property: "Phone", phone_number: { equals: "12345" } },
    });
  });
});

describe("translatePropertyFilter — number", () => {
  const schema = extractDatabaseSchema(
    makeDatabase([{ name: "Estimate", type: "number" }])
  );

  it("equals", () => {
    expect(
      translatePropertyFilter({ property: "Estimate", equals: 5 }, schema)
    ).toEqual({
      filter: { property: "Estimate", number: { equals: 5 } },
    });
  });

  it("greater_than / less_than", () => {
    expect(
      translatePropertyFilter(
        { property: "Estimate", greater_than: 3 },
        schema
      )
    ).toEqual({
      filter: { property: "Estimate", number: { greater_than: 3 } },
    });
    expect(
      translatePropertyFilter({ property: "Estimate", less_than: 8 }, schema)
    ).toEqual({
      filter: { property: "Estimate", number: { less_than: 8 } },
    });
  });

  it("between expands to AND of >= and <=", () => {
    expect(
      translatePropertyFilter(
        { property: "Estimate", between: { from: 3, to: 8 } },
        schema
      )
    ).toEqual({
      filter: {
        and: [
          {
            property: "Estimate",
            number: { greater_than_or_equal_to: 3 },
          },
          {
            property: "Estimate",
            number: { less_than_or_equal_to: 8 },
          },
        ],
      },
    });
  });

  it("rejects contains on number", () => {
    const result = translatePropertyFilter(
      { property: "Estimate", contains: "5" },
      schema
    );
    expect("error" in result).toBe(true);
  });
});

describe("translatePropertyFilter — checkbox", () => {
  const schema = extractDatabaseSchema(
    makeDatabase([{ name: "Done", type: "checkbox" }])
  );

  it("equals true", () => {
    expect(
      translatePropertyFilter({ property: "Done", equals: true }, schema)
    ).toEqual({
      filter: { property: "Done", checkbox: { equals: true } },
    });
  });

  it("equals false", () => {
    expect(
      translatePropertyFilter({ property: "Done", equals: false }, schema)
    ).toEqual({
      filter: { property: "Done", checkbox: { equals: false } },
    });
  });
});

describe("translatePropertyFilter — select / status / multi_select", () => {
  const schema = extractDatabaseSchema(
    makeDatabase([
      { name: "Priority", type: "select" },
      { name: "Status", type: "status" },
      { name: "Tags", type: "multi_select" },
    ])
  );

  it("select equals", () => {
    expect(
      translatePropertyFilter(
        { property: "Priority", equals: "High" },
        schema
      )
    ).toEqual({
      filter: { property: "Priority", select: { equals: "High" } },
    });
  });

  it("status equals", () => {
    expect(
      translatePropertyFilter(
        { property: "Status", equals: "Done" },
        schema
      )
    ).toEqual({
      filter: { property: "Status", status: { equals: "Done" } },
    });
  });

  it("multi_select contains", () => {
    expect(
      translatePropertyFilter(
        { property: "Tags", contains: "frontend" },
        schema
      )
    ).toEqual({
      filter: { property: "Tags", multi_select: { contains: "frontend" } },
    });
  });

  it("multi_select rejects equals (not a supported op)", () => {
    const result = translatePropertyFilter(
      { property: "Tags", equals: "frontend" },
      schema
    );
    expect("error" in result).toBe(true);
  });

  it("select rejects contains (not a supported op)", () => {
    const result = translatePropertyFilter(
      { property: "Priority", contains: "High" },
      schema
    );
    expect("error" in result).toBe(true);
  });

  it("is_empty / is_not_empty work on select / status / multi_select", () => {
    expect(
      translatePropertyFilter({ property: "Status", is_empty: true }, schema)
    ).toEqual({ filter: { property: "Status", status: { is_empty: true } } });
    expect(
      translatePropertyFilter(
        { property: "Tags", is_not_empty: true },
        schema
      )
    ).toEqual({
      filter: { property: "Tags", multi_select: { is_not_empty: true } },
    });
  });
});

describe("translatePropertyFilter — date", () => {
  const schema = extractDatabaseSchema(
    makeDatabase([
      { name: "Due", type: "date" },
      { name: "CreatedAt", type: "created_time" },
    ])
  );

  it("before / after / on_or_before / on_or_after", () => {
    expect(
      translatePropertyFilter(
        { property: "Due", before: "2026-06-01" },
        schema
      )
    ).toEqual({
      filter: { property: "Due", date: { before: "2026-06-01" } },
    });
    expect(
      translatePropertyFilter(
        { property: "Due", on_or_before: "2026-06-01" },
        schema
      )
    ).toEqual({
      filter: { property: "Due", date: { on_or_before: "2026-06-01" } },
    });
  });

  it("relative windows: past_week, next_month", () => {
    expect(
      translatePropertyFilter({ property: "Due", past_week: true }, schema)
    ).toEqual({ filter: { property: "Due", date: { past_week: {} } } });
    expect(
      translatePropertyFilter({ property: "Due", next_month: true }, schema)
    ).toEqual({ filter: { property: "Due", date: { next_month: {} } } });
  });

  it("between on date expands to AND of on_or_after / on_or_before", () => {
    expect(
      translatePropertyFilter(
        {
          property: "Due",
          between: { from: "2026-05-01", to: "2026-05-31" },
        },
        schema
      )
    ).toEqual({
      filter: {
        and: [
          { property: "Due", date: { on_or_after: "2026-05-01" } },
          { property: "Due", date: { on_or_before: "2026-05-31" } },
        ],
      },
    });
  });

  it("created_time uses 'date' bucket too", () => {
    expect(
      translatePropertyFilter(
        { property: "CreatedAt", after: "2026-01-01" },
        schema
      )
    ).toEqual({
      filter: { property: "CreatedAt", date: { after: "2026-01-01" } },
    });
  });
});

describe("translatePropertyFilter — people / files / relation", () => {
  const schema = extractDatabaseSchema(
    makeDatabase([
      { name: "Assignee", type: "people" },
      { name: "Files", type: "files" },
      { name: "Project", type: "relation" },
    ])
  );

  it("people contains user id", () => {
    expect(
      translatePropertyFilter(
        { property: "Assignee", contains: "user-abc" },
        schema
      )
    ).toEqual({
      filter: { property: "Assignee", people: { contains: "user-abc" } },
    });
  });

  it("files supports only is_empty / is_not_empty", () => {
    expect(
      translatePropertyFilter({ property: "Files", is_empty: true }, schema)
    ).toEqual({ filter: { property: "Files", files: { is_empty: true } } });

    const bad = translatePropertyFilter(
      { property: "Files", contains: "a.pdf" },
      schema
    );
    expect("error" in bad).toBe(true);
  });

  it("relation contains page id", () => {
    expect(
      translatePropertyFilter(
        { property: "Project", contains: "page-xyz" },
        schema
      )
    ).toEqual({
      filter: { property: "Project", relation: { contains: "page-xyz" } },
    });
  });
});

describe("translatePropertyFilter — errors", () => {
  it("property name not found returns availableProperties list", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([
        { name: "Name", type: "title" },
        { name: "Status", type: "status" },
        { name: "Assignee", type: "people" },
      ])
    );
    const result = translatePropertyFilter(
      { property: "Assignne", equals: "u1" },
      schema
    );
    if (!("error" in result)) {
      throw new Error("expected error");
    }
    expect(result.error).toMatch(/Assignne/);
    expect(result.availableProperties).toEqual([
      { name: "Name", type: "title" },
      { name: "Status", type: "status" },
      { name: "Assignee", type: "people" },
    ]);
  });

  it("operator not supported for type returns clear message with supported ops", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([{ name: "Status", type: "status" }])
    );
    const result = translatePropertyFilter(
      { property: "Status", greater_than: 5 },
      schema
    );
    if (!("error" in result)) {
      throw new Error("expected error");
    }
    expect(result.error).toMatch(/greater_than/);
    expect(result.error).toMatch(/status/);
  });

  it("formula type is not supported in v1", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([{ name: "Total", type: "formula" }])
    );
    const result = translatePropertyFilter(
      { property: "Total", equals: 99 },
      schema
    );
    if (!("error" in result)) {
      throw new Error("expected error");
    }
    expect(result.error).toMatch(/formula/i);
  });

  it("rollup type is not supported in v1", () => {
    const schema = extractDatabaseSchema(
      makeDatabase([{ name: "Sum", type: "rollup" }])
    );
    const result = translatePropertyFilter(
      { property: "Sum", equals: 1 },
      schema
    );
    if (!("error" in result)) {
      throw new Error("expected error");
    }
    expect(result.error).toMatch(/rollup/i);
  });
});
