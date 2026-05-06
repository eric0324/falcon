# 複製群組權限功能 — 設計文件

日期：2026-05-06
範圍：管理員後台 `/admin/groups`

## 動機

目前每開一個新群組，都要逐一進到每張資料表把群組勾選進權限清單，當資料表多時非常費工。需要一個一鍵複製既有群組權限到新群組的功能，讓使用者可以把現有群組當作 template。

## 目標

在群組列表上提供「複製此群組」按鈕，一鍵建立一個與來源群組擁有相同 **資料表權限** 與 **欄位權限** 的新群組。新群組名稱自動帶 `(副本)` 字尾。

## 非目標

- **不複製工具權限** (`Tool.allowedGroups`)：使用者通常會另外調整。
- **不複製群組成員** (`User.groups`)：建立的是「權限模板」，不是 user 複製。
- **不複製建立時間以外的中繼資料**：新群組就是新群組，`createdAt` 為當下。
- **不提供「合併權限到現有群組」的選項**：本次只做「建立全新副本」。

## 使用流程

1. 使用者進入 `/admin/groups`。
2. 在想複製的群組列右側點擊新加入的「複製」按鈕。
3. 後端在 transaction 內建立同權限的新群組，預設名稱為 `「{來源群組名} (副本)」`。
4. 列表立即更新，新群組依字母順序插入。使用者可立即用既有的「重新命名」按鈕調整名稱。

無確認對話框（非破壞性操作；不滿意可直接刪除）。

## 資料模型（無變更）

沿用 `prisma/schema.prisma` 既有的 `Group`、`ExternalDatabaseTable`、`ExternalDatabaseColumn` 之多對多關聯（`Group.tables` / `Group.columns`）。本次不新增 schema、不寫 migration。

## API 設計

### 路由

```
POST /api/admin/groups/[id]/duplicate
```

放在 `src/app/api/admin/groups/[id]/duplicate/route.ts`。

### Request

無 body。`[id]` 為來源群組 ID。

### Response

成功（201）回傳新群組，shape 對齊既有 `POST /api/admin/groups`：

```json
{
  "id": "<new-cuid>",
  "name": "業務組 (副本)",
  "createdAt": "2026-05-06T10:30:00.000Z",
  "userCount": 0
}
```

### 錯誤

| 狀態碼 | 情境 |
|--------|------|
| 401/403 | 未通過 `requireAdmin()` |
| 404 | 來源群組不存在 |
| 500 | DB / transaction 失敗 |

### 行為

於單一 `prisma.$transaction` 內：

1. 用 `findUnique({ where: { id } })` 並 `select` 出來源 group 的 `id`、`name`、`tables: { select: { id } }`、`columns: { select: { id } }`。不存在 → 404。
2. 計算不衝突的新名稱（見「命名衝突」段）。
3. `prisma.group.create` 同時 `connect` 全部 tables 和 columns 的 ID。
4. 回傳新建群組 + `userCount: 0`。

## 命名衝突處理

預設名稱 `「{來源名稱} (副本)」`。若已存在，依序遞增為 `「(副本 2)」`、`「(副本 3)」` …直到找到未使用者。

實作方式：在 transaction 內以 `findMany` 撈出所有 `name.startsWith("{來源名稱} (副本")` 的群組，於 application 層算出第一個未使用的編號（單純字串比對，不用模糊正則）。

`Group.name` 已有 `@unique` 約束，極端 race condition 下 DB 仍會擋下並回 500。

## UI 變更

**檔案**：`src/app/(admin)/admin/groups/group-manager.tsx`

每個群組列右側按鈕順序改為：

```
[群組名稱]  [N 位使用者]  ✏️ [📋+] 🗑️
```

新增的複製按鈕：
- Icon：`lucide-react` 的 `CopyPlus`
- 樣式對齊既有 Pencil/Trash 按鈕（`p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground`）
- 互動：點擊後立刻 disable 按鈕（防止重複點），完成後恢復；失敗時顯示在現有的紅色 error banner（沿用 `error` state）

新增 `handleDuplicate(group: Group)` 函式，參考 `handleAdd` 將回傳的新 group 用相同排序邏輯插入列表。

## 邊角情況

- **來源群組沒有任何權限關聯** → 仍建立空殼新群組（合法情境，例如僅當佔位群組）。
- **同時有人重新命名來源群組** → 命名以執行 transaction 當下讀到的為準。
- **使用者沒有權限** → `requireAdmin()` 直接擋下。
- **名稱長度**：schema 未限制，不額外處理。

## 測試重點

- 來源有 N 張表 + M 個欄位 → 新群組正確 connect 全部 N + M 筆。
- 同一來源連按 3 次 → 產生 `(副本)`、`(副本 2)`、`(副本 3)`。
- 來源不存在 → 404。
- 工具與使用者關聯 **不** 被複製到新群組。

## 影響範圍

- 新檔案 1 個：`src/app/api/admin/groups/[id]/duplicate/route.ts`
- 修改檔案 1 個：`src/app/(admin)/admin/groups/group-manager.tsx`
- 無 schema 變更、無 migration、無對外 API 行為改動
