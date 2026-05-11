# admin-search Specification

## Purpose
TBD - created by archiving change add-admin-search. Update Purpose after archive.
## Requirements
### Requirement: Admin List Pages Support Text Search

Every list page under `/admin/*` SHALL accept a `q` URL search parameter and filter rows server-side using Prisma `contains` (case-insensitive). The search SHALL coexist with existing per-page filters using AND semantics, and changing the search SHALL reset to page 1.

#### Scenario: Databases list searches by name

- GIVEN a user navigates to `/admin/databases?q=prod`
- WHEN the page is rendered
- THEN only `ExternalDatabase` rows whose `name` contains "prod" (case-insensitive) appear
- AND the count above the table reflects the filtered total

#### Scenario: Tools list searches by tool name OR author

- GIVEN `/admin/tools?q=alice`
- WHEN the page is rendered
- THEN tools whose own name contains "alice" OR whose author's `name` / `email` contains "alice" appear

#### Scenario: Members list searches by name OR email

- GIVEN `/admin/members?q=@example.com`
- WHEN the page is rendered
- THEN users whose `name` OR `email` contains "@example.com" appear

#### Scenario: Scans list combines text search with status filter

- GIVEN `/admin/scans?q=billing&status=FAIL`
- WHEN the page is rendered
- THEN only scans with `status = FAIL` AND whose `tool.name` / author contains "billing" appear

#### Scenario: Logs list combines text search with existing filters

- GIVEN `/admin/logs?q=timeout&status=error&source=chat`
- WHEN the page is rendered
- THEN logs with `status = error` AND `source = chat` AND (tool.name OR errorMessage) contains "timeout" appear

#### Scenario: Groups list searches by group name

- GIVEN the admin opens groups page and types a search keyword
- WHEN the search input emits the change
- THEN only groups whose `name` matches are shown (server-side or in-place filter, depending on group-manager's existing data fetching model)

#### Scenario: Empty search is treated as no search

- GIVEN `q=` is present but the value is an empty string or whitespace
- WHEN the page is rendered
- THEN the query behaves as if `q` is absent (no Prisma `contains` clause is added)

#### Scenario: Search resets pagination to page 1

- GIVEN the user is on page 3 of `/admin/tools?page=3`
- WHEN the user types into the search input
- THEN the URL pushed by the input drops `page` (or sets `page=1`)
- AND the listing starts from the first page of filtered results

#### Scenario: Pagination preserves search

- GIVEN `/admin/tools?q=alice` is rendered with multiple pages
- WHEN the user clicks the next-page link
- THEN the next URL keeps `q=alice` so navigating pages does not lose the filter

#### Scenario: SearchInput is debounced and controlled

- GIVEN the user types continuously into the search input
- WHEN no further input arrives for ~300ms
- THEN a single router push occurs with the latest value
- AND intermediate keystrokes do not trigger separate navigations

#### Scenario: Search is case-insensitive

- GIVEN a record with `name = "Alpha"`
- WHEN the user searches with `q=alpha` or `q=ALPHA`
- THEN the record appears in results

