import type { NotionDatabase } from "./client";

export type PropertyFilter = {
  property: string;
  equals?: string | number | boolean;
  contains?: string;
  is_empty?: true;
  is_not_empty?: true;
  greater_than?: number;
  less_than?: number;
  between?: { from: number | string; to: number | string };
  before?: string;
  after?: string;
  on_or_before?: string;
  on_or_after?: string;
  past_week?: true;
  past_month?: true;
  past_year?: true;
  next_week?: true;
  next_month?: true;
  next_year?: true;
};

export type NotionFilter = Record<string, unknown>;

export interface DatabaseSchema {
  titlePropertyName: string;
  propsByName: Map<string, { type: string }>;
  availableProperties: Array<{ name: string; type: string }>;
}

export type TranslateResult =
  | { filter: NotionFilter }
  | {
      error: string;
      availableProperties?: Array<{ name: string; type: string }>;
    };

export function extractDatabaseSchema(db: NotionDatabase): DatabaseSchema {
  const propsByName = new Map<string, { type: string }>();
  const available: Array<{ name: string; type: string }> = [];
  let titleName: string | null = null;

  if (db.properties) {
    for (const [name, schema] of Object.entries(db.properties)) {
      propsByName.set(name, { type: schema.type });
      available.push({ name, type: schema.type });
      if (schema.type === "title") titleName = name;
    }
  }

  return {
    titlePropertyName: titleName ?? "Name",
    propsByName,
    availableProperties: available,
  };
}

const TEXT_TYPES = new Set([
  "title",
  "rich_text",
  "url",
  "email",
  "phone_number",
]);
const DATE_TYPES = new Set(["date", "created_time", "last_edited_time"]);

const RELATIVE_DATE_KEYS = [
  "past_week",
  "past_month",
  "past_year",
  "next_week",
  "next_month",
  "next_year",
] as const;
const DATE_POINT_KEYS = [
  "before",
  "after",
  "on_or_before",
  "on_or_after",
] as const;

function getOperatorKey(filter: PropertyFilter): string | null {
  const keys = Object.keys(filter).filter((k) => k !== "property");
  return keys.length === 1 ? keys[0] : keys[0] ?? null;
}

function unsupportedOp(
  op: string,
  type: string,
  supported: string[]
): TranslateResult {
  return {
    error: `Operator '${op}' is not supported for property of type '${type}'. Supported operators: ${supported.join(
      ", "
    )}.`,
  };
}

function translateText(
  prop: string,
  type: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  const bucket = type;
  switch (op) {
    case "equals":
      return { filter: { property: prop, [bucket]: { equals: filter.equals } } };
    case "contains":
      return {
        filter: { property: prop, [bucket]: { contains: filter.contains } },
      };
    case "is_empty":
      return { filter: { property: prop, [bucket]: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, [bucket]: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, type, [
        "equals",
        "contains",
        "is_empty",
        "is_not_empty",
      ]);
  }
}

function translateNumber(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  switch (op) {
    case "equals":
      return { filter: { property: prop, number: { equals: filter.equals } } };
    case "greater_than":
      return {
        filter: { property: prop, number: { greater_than: filter.greater_than } },
      };
    case "less_than":
      return {
        filter: { property: prop, number: { less_than: filter.less_than } },
      };
    case "between": {
      const range = filter.between!;
      return {
        filter: {
          and: [
            {
              property: prop,
              number: { greater_than_or_equal_to: range.from },
            },
            {
              property: prop,
              number: { less_than_or_equal_to: range.to },
            },
          ],
        },
      };
    }
    case "is_empty":
      return { filter: { property: prop, number: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, number: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, "number", [
        "equals",
        "greater_than",
        "less_than",
        "between",
        "is_empty",
        "is_not_empty",
      ]);
  }
}

function translateCheckbox(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  if (op === "equals") {
    return {
      filter: { property: prop, checkbox: { equals: filter.equals } },
    };
  }
  return unsupportedOp(op, "checkbox", ["equals"]);
}

function translateSelectLike(
  prop: string,
  type: "select" | "status",
  op: string,
  filter: PropertyFilter
): TranslateResult {
  switch (op) {
    case "equals":
      return { filter: { property: prop, [type]: { equals: filter.equals } } };
    case "is_empty":
      return { filter: { property: prop, [type]: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, [type]: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, type, ["equals", "is_empty", "is_not_empty"]);
  }
}

function translateMultiSelect(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  switch (op) {
    case "contains":
      return {
        filter: { property: prop, multi_select: { contains: filter.contains } },
      };
    case "is_empty":
      return { filter: { property: prop, multi_select: { is_empty: true } } };
    case "is_not_empty":
      return {
        filter: { property: prop, multi_select: { is_not_empty: true } },
      };
    default:
      return unsupportedOp(op, "multi_select", [
        "contains",
        "is_empty",
        "is_not_empty",
      ]);
  }
}

function translateDate(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  if (DATE_POINT_KEYS.includes(op as (typeof DATE_POINT_KEYS)[number])) {
    return {
      filter: {
        property: prop,
        date: { [op]: filter[op as keyof PropertyFilter] },
      },
    };
  }
  if (RELATIVE_DATE_KEYS.includes(op as (typeof RELATIVE_DATE_KEYS)[number])) {
    return { filter: { property: prop, date: { [op]: {} } } };
  }
  switch (op) {
    case "equals":
      return { filter: { property: prop, date: { equals: filter.equals } } };
    case "between": {
      const range = filter.between!;
      return {
        filter: {
          and: [
            { property: prop, date: { on_or_after: range.from } },
            { property: prop, date: { on_or_before: range.to } },
          ],
        },
      };
    }
    case "is_empty":
      return { filter: { property: prop, date: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, date: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, "date", [
        "equals",
        ...DATE_POINT_KEYS,
        "between",
        ...RELATIVE_DATE_KEYS,
        "is_empty",
        "is_not_empty",
      ]);
  }
}

function translatePeople(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  switch (op) {
    case "contains":
      return {
        filter: { property: prop, people: { contains: filter.contains } },
      };
    case "is_empty":
      return { filter: { property: prop, people: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, people: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, "people", [
        "contains",
        "is_empty",
        "is_not_empty",
      ]);
  }
}

function translateFiles(prop: string, op: string): TranslateResult {
  switch (op) {
    case "is_empty":
      return { filter: { property: prop, files: { is_empty: true } } };
    case "is_not_empty":
      return { filter: { property: prop, files: { is_not_empty: true } } };
    default:
      return unsupportedOp(op, "files", ["is_empty", "is_not_empty"]);
  }
}

function translateRelation(
  prop: string,
  op: string,
  filter: PropertyFilter
): TranslateResult {
  switch (op) {
    case "contains":
      return {
        filter: { property: prop, relation: { contains: filter.contains } },
      };
    case "is_empty":
      return { filter: { property: prop, relation: { is_empty: true } } };
    case "is_not_empty":
      return {
        filter: { property: prop, relation: { is_not_empty: true } },
      };
    default:
      return unsupportedOp(op, "relation", [
        "contains",
        "is_empty",
        "is_not_empty",
      ]);
  }
}

export function translatePropertyFilter(
  filter: PropertyFilter,
  schema: DatabaseSchema
): TranslateResult {
  const propMeta = schema.propsByName.get(filter.property);
  if (!propMeta) {
    return {
      error: `Property '${filter.property}' not found in database. Available properties: ${schema.availableProperties
        .map((p) => `${p.name} (${p.type})`)
        .join(", ")}.`,
      availableProperties: schema.availableProperties,
    };
  }

  const op = getOperatorKey(filter);
  if (!op) {
    return {
      error: `propertyFilter requires exactly one operator key (equals, contains, before, ...).`,
    };
  }

  const type = propMeta.type;
  if (type === "formula" || type === "rollup") {
    return {
      error: `Filtering on '${type}' properties is not supported in v1.`,
    };
  }

  if (TEXT_TYPES.has(type)) {
    return translateText(filter.property, type, op, filter);
  }
  if (DATE_TYPES.has(type)) {
    return translateDate(filter.property, op, filter);
  }
  switch (type) {
    case "number":
      return translateNumber(filter.property, op, filter);
    case "checkbox":
      return translateCheckbox(filter.property, op, filter);
    case "select":
      return translateSelectLike(filter.property, "select", op, filter);
    case "status":
      return translateSelectLike(filter.property, "status", op, filter);
    case "multi_select":
      return translateMultiSelect(filter.property, op, filter);
    case "people":
      return translatePeople(filter.property, op, filter);
    case "files":
      return translateFiles(filter.property, op);
    case "relation":
      return translateRelation(filter.property, op, filter);
    default:
      return {
        error: `Property type '${type}' is not supported by propertyFilter.`,
      };
  }
}
