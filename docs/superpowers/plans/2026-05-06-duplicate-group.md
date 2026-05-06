# 複製群組權限 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/admin/groups` 列表加入「複製群組」按鈕，一鍵建立同權限新群組（包含 `ExternalDatabaseTable` 與 `ExternalDatabaseColumn` 的多對多權限關聯，不含 tools / users）。

**Architecture:** 新增 `POST /api/admin/groups/[id]/duplicate` route，於 `prisma.$transaction` 內讀來源群組、產生不衝突的 `(副本)` 名稱、建立新群組並 connect 既有 tables/columns。前端 `group-manager.tsx` 在每列新增 `CopyPlus` 按鈕呼叫該 API，回傳的新群組以字母排序插入列表。

**Tech Stack:** Next.js 15 App Router、Prisma、TypeScript、vitest（API 單元測試）、Tailwind、lucide-react

**參考文件:** `docs/superpowers/specs/2026-05-06-duplicate-group-design.md`

---

## File Structure

| 檔案 | 行為 | 責任 |
|------|------|------|
| `src/app/api/admin/groups/[id]/duplicate/route.ts` | **新增** | POST handler：複製來源群組權限到新群組 |
| `src/app/api/admin/groups/[id]/duplicate/route.test.ts` | **新增** | API 單元測試（vitest） |
| `src/app/(admin)/admin/groups/group-manager.tsx` | **修改** | 加入複製按鈕與 `handleDuplicate` |

---

## Task 1: API route — 複製群組

**Files:**
- Create: `src/app/api/admin/groups/[id]/duplicate/route.ts`
- Create: `src/app/api/admin/groups/[id]/duplicate/route.test.ts`

### Step 1.1: 寫失敗的測試

- [ ] **Step 1.1: 建立測試檔**

建立 `src/app/api/admin/groups/[id]/duplicate/route.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

const groupMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: groupMock,
    $transaction: vi.fn(async (cb: any) => cb({ group: groupMock })),
  },
}));

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { POST } from "./route";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;

function makeRequest(id: string) {
  return new Request(`http://localhost/api/admin/groups/${id}/duplicate`, {
    method: "POST",
  });
}

function callPost(id: string) {
  return POST(makeRequest(id), { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/groups/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await callPost("g-1");
    expect(res.status).toBe(403);
  });

  it("returns 404 when source group not found", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue(null);

    const res = await callPost("missing");
    expect(res.status).toBe(404);
  });

  it("creates new group with same table and column connections", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [{ id: "t-1" }, { id: "t-2" }],
      columns: [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }],
    });
    groupMock.findMany.mockResolvedValue([]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本)",
      createdAt: new Date("2026-05-06T10:00:00Z"),
    });

    const res = await callPost("g-1");
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe("業務組 (副本)");
    expect(body.userCount).toBe(0);

    expect(groupMock.create).toHaveBeenCalledWith({
      data: {
        name: "業務組 (副本)",
        tables: { connect: [{ id: "t-1" }, { id: "t-2" }] },
        columns: { connect: [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }] },
      },
      select: { id: true, name: true, createdAt: true },
    });
  });

  it("appends (副本 2) when (副本) already exists", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [],
      columns: [],
    });
    groupMock.findMany.mockResolvedValue([{ name: "業務組 (副本)" }]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本 2)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    expect(groupMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "業務組 (副本 2)" }),
      })
    );
  });

  it("appends (副本 3) when (副本) and (副本 2) exist", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [],
      columns: [],
    });
    groupMock.findMany.mockResolvedValue([
      { name: "業務組 (副本)" },
      { name: "業務組 (副本 2)" },
    ]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本 3)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    expect(groupMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "業務組 (副本 3)" }),
      })
    );
  });

  it("does not copy users or tools (only tables and columns connect fields are passed)", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [{ id: "t-1" }],
      columns: [{ id: "c-1" }],
    });
    groupMock.findMany.mockResolvedValue([]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    const createArgs = groupMock.create.mock.calls[0][0];
    expect(createArgs.data).not.toHaveProperty("users");
    expect(createArgs.data).not.toHaveProperty("tools");
  });
});
```

- [ ] **Step 1.2: 執行測試確認失敗**

```
npx vitest run src/app/api/admin/groups/\[id\]/duplicate/route.test.ts
```

Expected: 全部失敗，錯誤訊息類似 `Cannot find module './route'`。

- [ ] **Step 1.3: 寫最小可通過的實作**

建立 `src/app/api/admin/groups/[id]/duplicate/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const created = await prisma.$transaction(async (tx) => {
    const source = await tx.group.findUnique({
      where: { id },
      select: {
        name: true,
        tables: { select: { id: true } },
        columns: { select: { id: true } },
      },
    });

    if (!source) return null;

    const prefix = `${source.name} (副本`;
    const existing = await tx.group.findMany({
      where: { name: { startsWith: prefix } },
      select: { name: true },
    });
    const taken = new Set(existing.map((g) => g.name));

    let newName = `${source.name} (副本)`;
    if (taken.has(newName)) {
      let n = 2;
      while (taken.has(`${source.name} (副本 ${n})`)) {
        n++;
      }
      newName = `${source.name} (副本 ${n})`;
    }

    return tx.group.create({
      data: {
        name: newName,
        tables: { connect: source.tables.map((t) => ({ id: t.id })) },
        columns: { connect: source.columns.map((c) => ({ id: c.id })) },
      },
      select: { id: true, name: true, createdAt: true },
    });
  });

  if (!created) {
    return NextResponse.json({ error: "群組不存在" }, { status: 404 });
  }

  return NextResponse.json({ ...created, userCount: 0 }, { status: 201 });
}
```

- [ ] **Step 1.4: 執行測試確認全部通過**

```
npx vitest run src/app/api/admin/groups/\[id\]/duplicate/route.test.ts
```

Expected: 6 個測試全部 PASS。

- [ ] **Step 1.5: 跑 typecheck 確認沒有型別錯誤**

```
npx tsc --noEmit
```

Expected: 沒有任何錯誤輸出。

- [ ] **Step 1.6: Commit**

```bash
git add src/app/api/admin/groups/\[id\]/duplicate/route.ts \
        src/app/api/admin/groups/\[id\]/duplicate/route.test.ts
git commit -m "feat(admin/groups): 新增複製群組權限 API"
```

---

## Task 2: UI — 複製按鈕

**Files:**
- Modify: `src/app/(admin)/admin/groups/group-manager.tsx`

- [ ] **Step 2.1: 修改 import 加入 CopyPlus icon**

把 lucide-react 的 import 改成：

```typescript
import { Plus, Pencil, Trash2, Check, X, CopyPlus } from "lucide-react";
```

- [ ] **Step 2.2: 加入 duplicating state**

在 `useState` 區塊（`error` state 上方）加入：

```typescript
const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
```

- [ ] **Step 2.3: 加入 handleDuplicate 函式**

放在 `handleDelete` 之後：

```typescript
async function handleDuplicate(group: Group) {
  setError(null);
  setDuplicatingId(group.id);

  try {
    const res = await fetch(`/api/admin/groups/${group.id}/duplicate`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "複製失敗");
      return;
    }

    const newGroup = await res.json();
    setGroups((prev) =>
      [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name))
    );
  } finally {
    setDuplicatingId(null);
  }
}
```

- [ ] **Step 2.4: 在群組列表加入複製按鈕**

找到非編輯狀態的 `<>...</>` block（目前是 Pencil 與 Trash2 兩顆按鈕之間）。在 Pencil 按鈕**之後**、Trash2 按鈕**之前**插入：

```tsx
<button
  onClick={() => handleDuplicate(group)}
  disabled={duplicatingId === group.id}
  title="複製此群組（含資料表/欄位權限）"
  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
>
  <CopyPlus className="h-4 w-4" />
</button>
```

完整非編輯狀態 block 應該變成：

```tsx
<>
  <span className="font-medium flex-1">{group.name}</span>
  <span className="text-xs text-muted-foreground">
    {group.userCount} 位使用者
  </span>
  <button
    onClick={() => { setEditingId(group.id); setEditName(group.name); setError(null); }}
    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
  >
    <Pencil className="h-4 w-4" />
  </button>
  <button
    onClick={() => handleDuplicate(group)}
    disabled={duplicatingId === group.id}
    title="複製此群組（含資料表/欄位權限）"
    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
  >
    <CopyPlus className="h-4 w-4" />
  </button>
  <button
    onClick={() => handleDelete(group)}
    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600"
  >
    <Trash2 className="h-4 w-4" />
  </button>
</>
```

- [ ] **Step 2.5: 跑 typecheck 與 lint**

```
npx tsc --noEmit && npm run lint
```

Expected: 沒有錯誤。

- [ ] **Step 2.6: 手動瀏覽器驗證**

啟動 dev server：

```
npm run dev
```

到 `http://localhost:3000/admin/groups`，依序驗證：

1. 列表中每個群組都有新的「📋+」按鈕（在編輯與刪除之間）。
2. 點擊「複製」→ 列表立刻多出 `「{原名} (副本)」` 群組，使用者數為 0。
3. 對同一個群組再點「複製」→ 出現 `「{原名} (副本 2)」`。
4. 進到 `/admin/databases/[id]` 任一資料表，確認新群組擁有與來源相同的表/欄勾選。
5. （非必要）短暫看一下複製按鈕在 request 進行時會 disabled。

如果有任何步驟結果不符，回到 Task 1/2 修正後重跑。

- [ ] **Step 2.7: Commit**

```bash
git add src/app/\(admin\)/admin/groups/group-manager.tsx
git commit -m "feat(admin/groups): 群組列表新增複製按鈕"
```

---

## Self-Review 檢查（Plan 撰寫者已執行）

**Spec coverage:**

- ✅ UI 變更（CopyPlus 按鈕、位於 Pencil 與 Trash2 之間） → Task 2.1–2.4
- ✅ `POST /api/admin/groups/[id]/duplicate` → Task 1
- ✅ Transaction 內讀來源 + 產生新名稱 + create + connect → Task 1.3
- ✅ 命名衝突 `(副本)` / `(副本 2)` / `(副本 3)` → Task 1.1 測試 + 1.3 實作
- ✅ 不複製 users / tools → Task 1.1 測試明確驗證 `data` 不含這兩欄位
- ✅ 來源不存在回 404 → Task 1.1/1.3
- ✅ `requireAdmin()` 防護 → Task 1.1/1.3
- ✅ 回傳 shape `{id, name, createdAt, userCount: 0}` → Task 1.3 / 測試斷言
- ✅ Response status 201 → Task 1.3
- ✅ 列表自動排序插入 → Task 2.3 沿用 `handleAdd` 排序邏輯

**Placeholder scan:** 無 TBD / TODO；所有步驟皆含可執行 code 或具體指令。

**Type consistency:** `Group` 介面欄位（id/name/createdAt/userCount）在 `group-manager.tsx` 既有定義中已具備；API 回傳 shape 與之吻合。`prisma.$transaction` 的 callback 寫法與 mock 設定一致（`tx.group` 等價於 `prisma.group`）。

---

## 完成定義

- 兩個 commit：`feat(admin/groups): 新增複製群組權限 API`、`feat(admin/groups): 群組列表新增複製按鈕`
- `npm test` / `npx vitest run` 全綠
- `npx tsc --noEmit` 無錯
- 手動瀏覽器驗證通過
