# tool Spec Delta: add-tool-image-assets

新增 Tool image asset 機制：deploy 時掃 code 把作者命名空間的圖片 promote 到 tool 命名空間，讓所有有權執行該工具的人都能在 runtime 讀回。

## ADDED Requirements

### Requirement: Tool Image Assets — Deploy-time Promotion

When a tool is deployed or updated via `POST /api/tools`, the system SHALL scan the submitted `code` for s3 keys belonging to the author's personal namespace and copy each one to a tool-scoped namespace, rewriting the code to point at the new location. This is the sole mechanism by which images become "tool assets" — there is no separate asset upload action.

#### Scenario: First deploy promotes author-owned image keys

- GIVEN a chat in which the author dragged `logo.png` into the conversation, which lives at `images/<authorId>/abc.png`
- AND the AI wrote tool code containing the literal string `"images/<authorId>/abc.png"`
- WHEN the author POSTs `/api/tools` to deploy the tool
- THEN before writing `Tool.code`, the server pre-generates the toolId
- AND finds the key `images/<authorId>/abc.png` in the code
- AND copies it (S3 `CopyObject`) to `tools/<toolId>/images/abc.png`
- AND rewrites every occurrence in the code string from `images/<authorId>/abc.png` to `tools/<toolId>/images/abc.png`
- AND persists the rewritten code into `Tool.code`

#### Scenario: Update deploy promotes only newly-referenced images

- GIVEN an existing tool whose code already references `tools/<toolId>/images/abc.png`
- AND the author adds a new image at `images/<authorId>/xyz.png` referenced in the updated code
- WHEN the author POSTs `/api/tools` again
- THEN `tools/<toolId>/images/abc.png` is left untouched (already promoted)
- AND `images/<authorId>/xyz.png` is copied to `tools/<toolId>/images/xyz.png`
- AND the new code is rewritten accordingly

#### Scenario: Idempotent re-deploy

- GIVEN a tool whose code references only `tools/<toolId>/...` keys
- WHEN the author POSTs `/api/tools` with the same code
- THEN no S3 copies happen
- AND the code is persisted unchanged

#### Scenario: Cross-user keys are not promoted

- GIVEN the submitted code contains a string matching `images/<other-userId>/foo.png` where `other-userId !== author.id`
- WHEN the deploy scan runs
- THEN that key is NOT copied
- AND the code is NOT rewritten for that key
- AND deploy completes successfully (the bridge will later reject any runtime read of that key on its own ownership check)

#### Scenario: Pre-generated toolId is used for the create

- GIVEN this is the first deploy (no existing tool with that conversationId)
- WHEN the server promotes assets before insert
- THEN the `Tool` row is created with the same `id` used to build the `tools/<id>/...` paths
- AND there is no intermediate state where the tool row exists but the code still references the author's namespace
