# Tasks: 簡化 Visibility 層級

## 1. Prisma Schema 更新
- [ ] 1.1 移除 Visibility enum 的 DEPARTMENT 值
- [ ] 1.2 移除 User model 的 department 欄位
- [ ] 1.3 建立 migration (含資料遷移)

## 2. 資料遷移
- [ ] 2.1 將現有 DEPARTMENT visibility 的 tools 改為 COMPANY:
  ```sql
  UPDATE "Tool" SET visibility = 'COMPANY' WHERE visibility = 'DEPARTMENT';
  ```

## 3. 更新 Visibility Filter
- [ ] 3.1 簡化 marketplace page filter:
  ```typescript
  const visibilityFilter = {
    OR: [
      { visibility: 'PUBLIC' },
      { visibility: 'COMPANY' },
    ]
  };
  ```
- [ ] 3.2 簡化 leaderboard page filter
- [ ] 3.3 簡化 category page filter
- [ ] 3.4 簡化 search page filter

## 4. 更新 Tool Access Check
- [ ] 4.1 簡化 tool page 存取檢查:
  ```typescript
  // Before
  if (tool.visibility === 'DEPARTMENT' && user.department !== tool.author.department) {
    notFound();
  }
  // After: 移除 DEPARTMENT 檢查
  ```
- [ ] 4.2 移除 author.department 的 include/select

## 5. 清理 UI
- [ ] 5.1 更新 DeployDialog 的 visibility 選項 (如有)
- [ ] 5.2 更新 VisibilityBadge 元件 (如有)
- [ ] 5.3 移除任何 DEPARTMENT 相關的 UI 文字

## 6. 清理程式碼
- [ ] 6.1 搜尋並移除所有 `user.department` 參考
- [ ] 6.2 搜尋並移除所有 `DEPARTMENT` visibility 參考
- [ ] 6.3 移除不再需要的 type definitions
