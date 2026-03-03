# Admin: 編輯成員 Department

## 動機

成員詳情頁目前只能指派群組，但 `department` 欄位只有顯示、無法編輯。管理員需要一個表單來更新成員的部門。

## 範圍

- 在成員詳情頁 (`/admin/members/[id]`) 加入 department 編輯表單
- 新增 `PATCH /api/admin/members/[id]` API route 來更新 department
- 僅限 ADMIN 角色可操作

## 變更清單

| 檔案 | 動作 |
|------|------|
| `src/app/api/admin/members/[id]/route.ts` | 新增：PATCH handler 更新 department |
| `src/app/(admin)/admin/members/[id]/department-edit.tsx` | 新增：inline 編輯 department 的 client component |
| `src/app/(admin)/admin/members/[id]/page.tsx` | 修改：嵌入 DepartmentEdit 元件 |

## 設計

- 使用 inline edit 模式：顯示目前 department 值 + 編輯按鈕
- 點擊編輯後變成 input field，可儲存或取消
- API 用 PATCH method，body: `{ department: string }`
- 空字串視為清除 department（設為 null）
