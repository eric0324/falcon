# Notion Connector Spec Deltas — notion-property-filter

## ADDED Requirements

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
