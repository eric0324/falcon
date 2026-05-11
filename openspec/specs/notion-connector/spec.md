# notion-connector Specification

## Purpose
TBD - created by archiving change expose-notion-properties. Update Purpose after archive.
## Requirements
### Requirement: Database Property Extraction

The Notion connector SHALL parse Notion API page properties into a flat, AI-readable shape, and the AI-facing `notionSearch` tool SHALL include these parsed properties in `read` and `query` responses.

#### Scenario: Read a page returns parsed properties

- GIVEN a Notion page with multiple typed properties (e.g. `Status`, `Tags`, `Due`, `Owner`, `Done?`)
- WHEN the AI calls `notionSearch({ action: "read", pageId })`
- THEN the response `data.properties` is a map of property name → extracted value
- AND each value reflects the property type (e.g. `Status` → string, `Tags` → string[], `Due` → `{ start, end? }`, `Done?` → boolean)

#### Scenario: Query a database returns properties per row

- GIVEN a database queried via `notionSearch({ action: "query", databaseId, ... })`
- WHEN the response is built
- THEN each item in `data` includes `id`, `title`, `icon`, AND `properties`
- AND `properties` is the same parsed shape as the `read` action

#### Scenario: Title property

- GIVEN a page whose property `Name` is of type `title` with text "Refactor auth"
- WHEN properties are extracted
- THEN `properties.Name === "Refactor auth"`

#### Scenario: Rich text property

- GIVEN a property of type `rich_text` with content "Owner is bob"
- WHEN extracted
- THEN the value is the joined plain text "Owner is bob"

#### Scenario: Select and Status

- GIVEN properties `Status` (type `status`, value `In Progress`) and `Priority` (type `select`, value `High`)
- WHEN extracted
- THEN `properties.Status === "In Progress"` AND `properties.Priority === "High"`

#### Scenario: Multi-select

- GIVEN a property `Tags` of type `multi_select` with options `["frontend", "p1"]`
- WHEN extracted
- THEN `properties.Tags === ["frontend", "p1"]`

#### Scenario: Date with start only

- GIVEN a property `Due` of type `date` with `{ start: "2026-05-20", end: null }`
- WHEN extracted
- THEN `properties.Due === { start: "2026-05-20" }` (no `end` key when null)

#### Scenario: Date with range

- GIVEN a property `Sprint` of type `date` with `{ start: "2026-05-10", end: "2026-05-24" }`
- WHEN extracted
- THEN `properties.Sprint === { start: "2026-05-10", end: "2026-05-24" }`

#### Scenario: Number, checkbox, url, email, phone

- GIVEN properties `Count` (number=42), `Done?` (checkbox=true), `Link` (url), `Contact` (email), `Phone` (phone_number)
- WHEN extracted
- THEN each maps to its underlying primitive value

#### Scenario: People property

- GIVEN a property `Owner` of type `people` containing two users with names "Alice", "Bob"
- WHEN extracted
- THEN `properties.Owner === ["Alice", "Bob"]`

#### Scenario: Files property

- GIVEN a property `Attachments` of type `files` with two file entries
- WHEN extracted
- THEN `properties.Attachments` is a string array of file names (or URLs when name absent)

#### Scenario: Relation returns page ids only

- GIVEN a property `Project` of type `relation` with `[{ id: "page_a" }, { id: "page_b" }]`
- WHEN extracted
- THEN `properties.Project === ["page_a", "page_b"]`
- AND no additional Notion API call is made to resolve titles

#### Scenario: Formula unwraps underlying value

- GIVEN a property `Total` of type `formula` with `formula: { type: "number", number: 99 }`
- WHEN extracted
- THEN `properties.Total === 99`
- AND the same applies for formula types `string`, `boolean`, `date`

#### Scenario: Rollup unwraps underlying value

- GIVEN a property `RolledTotal` of type `rollup` with `rollup: { type: "number", number: 12 }`
- WHEN extracted
- THEN `properties.RolledTotal === 12`
- AND for `rollup.type === "array"`, the value is an array of the inner items' primitive values

#### Scenario: Timestamps

- GIVEN properties `CreatedAt` (type `created_time`) and `EditedAt` (type `last_edited_time`)
- WHEN extracted
- THEN each property maps to its ISO 8601 string

#### Scenario: created_by and last_edited_by

- GIVEN properties of type `created_by` / `last_edited_by` containing a user with name "Alice"
- WHEN extracted
- THEN the value is the user's name "Alice"

#### Scenario: Unique ID

- GIVEN a property `Ticket` of type `unique_id` with `{ prefix: "PROJ", number: 42 }`
- WHEN extracted
- THEN `properties.Ticket === "PROJ-42"`
- AND if `prefix` is null/empty THEN the value is `"42"`

#### Scenario: Empty values are omitted

- GIVEN a page where `Tags` is `multi_select: []`, `Due` is `date: null`, `Status` is `status: null`
- WHEN extracted
- THEN none of these keys appear in the resulting `properties` object

#### Scenario: Unknown property types are skipped silently

- GIVEN a page containing a property of an unrecognized type (e.g. a future Notion type)
- WHEN extracted
- THEN the unknown property is omitted from the output
- AND no error is thrown

#### Scenario: searchAll and list actions do not include properties

- GIVEN the AI calls `notionSearch({ action: "searchAll", search })` or `notionSearch({ action: "list" })`
- WHEN the response is built
- THEN result items contain only `id`, `title`, `icon`, and `source` / `objectType`
- AND no `properties` field is included (to keep cross-database search lightweight)

### Requirement: Server-side Property Filtering

The Notion connector SHALL accept a structured `propertyFilter` parameter on the `query` action, translate it against the target database's actual property schema, and forward the result to the Notion API for server-side filtering. The connector SHALL combine `propertyFilter` with the existing `search` (title-contains) parameter using an `AND` filter when both are present.

#### Scenario: Status equals filter

- GIVEN a database `Tasks` whose property `Status` is of type `status`
- WHEN the AI calls `notionSearch({ action: "query", databaseId, propertyFilter: { property: "Status", equals: "Done" } })`
- THEN the connector fetches the database schema
- AND sends the filter `{ property: "Status", status: { equals: "Done" } }` to the Notion API
- AND returns only pages whose Status equals "Done"

#### Scenario: People contains filter for finding a person across the database

- GIVEN a database whose property `Assignee` is of type `people`
- WHEN the AI calls `notionSearch({ action: "query", databaseId, propertyFilter: { property: "Assignee", contains: "u123" } })`
- THEN the connector sends `{ property: "Assignee", people: { contains: "u123" } }` to the Notion API
- AND all matching pages across the database are returned (not limited by client-side `limit` window)

#### Scenario: Multi-select contains filter

- GIVEN a property `Tags` of type `multi_select`
- WHEN the AI passes `propertyFilter: { property: "Tags", contains: "p1" }`
- THEN the Notion filter is `{ property: "Tags", multi_select: { contains: "p1" } }`

#### Scenario: Number between range

- GIVEN a property `Estimate` of type `number`
- WHEN the AI passes `propertyFilter: { property: "Estimate", between: { from: 3, to: 8 } }`
- THEN the Notion filter is `{ and: [{ property: "Estimate", number: { greater_than_or_equal_to: 3 } }, { property: "Estimate", number: { less_than_or_equal_to: 8 } }] }`

#### Scenario: Date before / after / between

- GIVEN a property `Due` of type `date`
- WHEN the AI passes `propertyFilter: { property: "Due", before: "2026-06-01" }`
- THEN the Notion filter is `{ property: "Due", date: { before: "2026-06-01" } }`
- AND when the AI passes `propertyFilter: { property: "Due", between: { from: "2026-05-01", to: "2026-05-31" } }`
- THEN the filter is an `and` of `on_or_after` / `on_or_before`

#### Scenario: Date relative window past_week

- GIVEN a property `Due` of type `date`
- WHEN the AI passes `propertyFilter: { property: "Due", past_week: true }`
- THEN the Notion filter is `{ property: "Due", date: { past_week: {} } }`

#### Scenario: is_empty / is_not_empty across types

- GIVEN a property of any supported type
- WHEN the AI passes `propertyFilter: { property, is_empty: true }`
- THEN the Notion filter is `{ property, <typeBucket>: { is_empty: true } }`
- AND the same shape applies for `is_not_empty`

#### Scenario: search + propertyFilter combined as AND

- GIVEN a database with a title property `Name` and a `Status` property
- WHEN the AI calls `notionSearch({ action: "query", databaseId, search: "設計", propertyFilter: { property: "Status", equals: "Done" } })`
- THEN the Notion filter is `{ and: [{ property: "Name", title: { contains: "設計" } }, { property: "Status", status: { equals: "Done" } }] }`
- AND the title clause uses the database's actual title property name (not the literal "Name")

#### Scenario: Property name not found returns a friendly error with available properties

- GIVEN a database whose property names are `Name`, `Status`, `Assignee`
- WHEN the AI passes `propertyFilter: { property: "Assignne", equals: "Alice" }` (misspelled)
- THEN the response is `{ success: false, service: "notion", error: <message naming the missing property>, availableProperties: [{ name, type }, ...] }`
- AND no Notion API query is sent

#### Scenario: Operator incompatible with property type returns an error

- GIVEN a property `Status` of type `status`
- WHEN the AI passes `propertyFilter: { property: "Status", greater_than: 5 }`
- THEN the response is `{ success: false, error: <message stating greater_than is not valid for status, listing supported operators> }`

#### Scenario: Exactly one operator key is required

- GIVEN the AI passes `propertyFilter: { property: "Status", equals: "Done", contains: "Done" }`
- WHEN the request reaches the AI tool's input validation
- THEN validation rejects the request before any Notion call
- AND the error message indicates that exactly one operator key is required

#### Scenario: Formula and rollup types are not yet supported

- GIVEN a property of type `formula` or `rollup`
- WHEN the AI passes any `propertyFilter` targeting that property
- THEN the response is `{ success: false, error: <message stating formula/rollup filtering is not supported in v1> }`

#### Scenario: searchAll, list, and read are unaffected

- GIVEN the AI calls `notionSearch` with `action: "searchAll"`, `action: "list"`, or `pageId: ...`
- WHEN the request is processed
- THEN the `propertyFilter` parameter (if accidentally passed) is ignored
- AND behavior matches the current spec (no `properties` on searchAll/list; full content on read)

