export type DateValue = { start: string; end?: string };
export type ExtractedPropertyValue =
  | string
  | number
  | boolean
  | string[]
  | DateValue;

type Prop = Record<string, unknown>;

function asProp(value: unknown): Prop | null {
  return value && typeof value === "object" ? (value as Prop) : null;
}

function joinPlainText(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((t) => (asProp(t)?.plain_text as string | undefined) ?? "")
    .join("");
}

function extractDate(raw: unknown): DateValue | null {
  const date = asProp(raw);
  const start = date?.start as string | undefined;
  if (!start) return null;
  const end = date?.end as string | null | undefined;
  return end ? { start, end } : { start };
}

function unwrapAtomic(
  type: string,
  container: Prop
): ExtractedPropertyValue | null {
  switch (type) {
    case "number":
      return typeof container.number === "number" ? container.number : null;
    case "string":
      return (container.string as string) || null;
    case "boolean":
      return typeof container.boolean === "boolean" ? container.boolean : null;
    case "date":
      return extractDate(container.date);
    default:
      return extractOne({ type, [type]: container[type] } as Prop);
  }
}

function extractRollupArrayItem(item: unknown): ExtractedPropertyValue | null {
  const p = asProp(item);
  if (!p) return null;
  const type = p.type as string | undefined;
  if (!type) return null;
  return extractOne(p);
}

function extractOne(prop: Prop): ExtractedPropertyValue | null {
  const type = prop.type as string | undefined;
  if (!type) return null;

  switch (type) {
    case "title":
      return joinPlainText(prop.title) || null;
    case "rich_text":
      return joinPlainText(prop.rich_text) || null;
    case "number":
      return typeof prop.number === "number" ? prop.number : null;
    case "checkbox":
      return typeof prop.checkbox === "boolean" ? prop.checkbox : null;
    case "url":
      return (prop.url as string) || null;
    case "email":
      return (prop.email as string) || null;
    case "phone_number":
      return (prop.phone_number as string) || null;
    case "select": {
      const sel = asProp(prop.select);
      return (sel?.name as string) || null;
    }
    case "status": {
      const sel = asProp(prop.status);
      return (sel?.name as string) || null;
    }
    case "multi_select": {
      const opts = prop.multi_select;
      if (!Array.isArray(opts) || opts.length === 0) return null;
      return opts.map((o) => (asProp(o)?.name as string) ?? "").filter(Boolean);
    }
    case "date":
      return extractDate(prop.date);
    case "people": {
      const people = prop.people;
      if (!Array.isArray(people) || people.length === 0) return null;
      const names = people
        .map((p) => (asProp(p)?.name as string) ?? "")
        .filter(Boolean);
      return names.length ? names : null;
    }
    case "created_by":
      return (asProp(prop.created_by)?.name as string) || null;
    case "last_edited_by":
      return (asProp(prop.last_edited_by)?.name as string) || null;
    case "files": {
      const files = prop.files;
      if (!Array.isArray(files) || files.length === 0) return null;
      const names = files
        .map((f) => {
          const file = asProp(f);
          if (!file) return "";
          const name = file.name as string | undefined;
          if (name) return name;
          const ext = asProp(file.external)?.url as string | undefined;
          const inner = asProp(file.file)?.url as string | undefined;
          return ext || inner || "";
        })
        .filter(Boolean);
      return names.length ? names : null;
    }
    case "relation": {
      const rel = prop.relation;
      if (!Array.isArray(rel) || rel.length === 0) return null;
      const ids = rel
        .map((r) => (asProp(r)?.id as string) ?? "")
        .filter(Boolean);
      return ids.length ? ids : null;
    }
    case "created_time":
      return (prop.created_time as string) || null;
    case "last_edited_time":
      return (prop.last_edited_time as string) || null;
    case "unique_id": {
      const uid = asProp(prop.unique_id);
      const num = uid?.number;
      if (typeof num !== "number") return null;
      const prefix = uid?.prefix as string | null | undefined;
      return prefix ? `${prefix}-${num}` : String(num);
    }
    case "formula": {
      const f = asProp(prop.formula);
      if (!f) return null;
      const ftype = f.type as string | undefined;
      if (!ftype) return null;
      return unwrapAtomic(ftype, f);
    }
    case "rollup": {
      const r = asProp(prop.rollup);
      if (!r) return null;
      const rtype = r.type as string | undefined;
      if (!rtype) return null;
      if (rtype === "array") {
        const arr = r.array;
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const items = arr
          .map(extractRollupArrayItem)
          .filter((v): v is ExtractedPropertyValue => v !== null);
        if (items.length === 0) return null;
        if (items.every((v) => typeof v === "string")) {
          return items as string[];
        }
        return items.map((v) => String(v));
      }
      return unwrapAtomic(rtype, r);
    }
    default:
      return null;
  }
}

export function extractProperties(
  raw: Record<string, unknown>
): Record<string, ExtractedPropertyValue> {
  const out: Record<string, ExtractedPropertyValue> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    const prop = asProp(value);
    if (!prop) continue;
    const extracted = extractOne(prop);
    if (extracted === null) continue;
    out[key] = extracted;
  }
  return out;
}
