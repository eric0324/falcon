# Tool Favorites Spec Deltas — add-tool-favorites

## ADDED Requirements

### Requirement: 收藏資料模型
系統 SHALL 提供 `ToolFavorite` 資料表，紀錄每位使用者對每個工具的收藏關係，且每對 (userId, toolId) 至多存在一筆紀錄。

#### 資料模型

```prisma
model ToolFavorite {
  id        String   @id @default(cuid())
  userId    String
  toolId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  tool Tool @relation(fields: [toolId], references: [id], onDelete: Cascade)

  @@unique([userId, toolId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([toolId])
}
```

#### Scenario: 同一使用者對同一工具僅一筆收藏
- GIVEN 使用者 U1 已經收藏工具 T1
- WHEN 系統嘗試為 U1 建立 T1 的第二筆收藏
- THEN unique 限制阻擋第二筆寫入
- AND 此情境在 API 層被視為 idempotent（不報錯）

#### Scenario: 工具被刪除時 cascade 清除收藏
- GIVEN 工具 T1 有多位使用者收藏紀錄
- WHEN T1 被刪除
- THEN 所有指向 T1 的 ToolFavorite 自動刪除

#### Scenario: 使用者被刪除時 cascade 清除收藏
- GIVEN 使用者 U1 收藏多個工具
- WHEN U1 被刪除
- THEN U1 的所有 ToolFavorite 自動刪除

### Requirement: 收藏 / 取消收藏 API
系統 SHALL 提供 `POST` 與 `DELETE /api/tools/:id/favorite` 端點，皆為 idempotent，僅供已登入使用者操作自己的收藏。

#### Scenario: POST 對未收藏的工具寫入收藏
- GIVEN 使用者已登入
- AND 工具 T1 對該使用者可見
- AND 該使用者尚未收藏 T1
- WHEN POST `/api/tools/T1/favorite`
- THEN 建立 ToolFavorite 紀錄
- AND 回應 200 OK，body 為 `{ favorited: true }`

#### Scenario: POST 對已收藏的工具是 idempotent
- GIVEN 使用者已收藏工具 T1
- WHEN 再次 POST `/api/tools/T1/favorite`
- THEN 不重複建立紀錄
- AND 回應 200 OK，body 為 `{ favorited: true }`

#### Scenario: DELETE 移除收藏
- GIVEN 使用者已收藏工具 T1
- WHEN DELETE `/api/tools/T1/favorite`
- THEN ToolFavorite 紀錄被刪除
- AND 回應 200 OK，body 為 `{ favorited: false }`

#### Scenario: DELETE 對未收藏的工具是 idempotent
- GIVEN 使用者尚未收藏工具 T1
- WHEN DELETE `/api/tools/T1/favorite`
- THEN 不報錯
- AND 回應 200 OK，body 為 `{ favorited: false }`

#### Scenario: 對使用者不可見的工具拒絕收藏
- GIVEN 工具 T1 對該使用者不可見（PRIVATE 且非 author / 不在 allowedGroups）
- WHEN POST `/api/tools/T1/favorite`
- THEN 回應 404（不洩漏存在）

#### Scenario: 未登入使用者拒絕
- GIVEN 使用者未登入
- WHEN POST 或 DELETE `/api/tools/:id/favorite`
- THEN 回應 401 Unauthorized

#### Scenario: 不存在的工具回 404
- GIVEN 工具 id 不存在
- WHEN POST 或 DELETE `/api/tools/non-existent/favorite`
- THEN 回應 404

### Requirement: 工具卡片愛心按鈕
`MarketplaceToolCard` SHALL 在卡片右上角顯示愛心 icon，反映目前使用者的收藏狀態，並支援樂觀更新。

#### Scenario: 卡片顯示已收藏狀態
- GIVEN 卡片接到 `isFavorited = true` prop
- WHEN 卡片 render
- THEN 愛心 icon 為實心（fill）

#### Scenario: 卡片顯示未收藏狀態
- GIVEN 卡片接到 `isFavorited = false` 或未提供
- WHEN 卡片 render
- THEN 愛心 icon 為線條（outline）

#### Scenario: 點愛心做樂觀更新並呼叫 API
- GIVEN 卡片目前 `isFavorited = false`
- WHEN 使用者點愛心
- THEN icon 立即變實心（不等 API）
- AND 同時對 `/api/tools/:id/favorite` 發出 POST
- AND 在 API 回應前，按鈕為 disabled 狀態避免重複點擊

#### Scenario: API 失敗時還原狀態
- GIVEN 樂觀更新已將愛心變實心
- WHEN POST `/api/tools/:id/favorite` 回應非 2xx
- THEN icon 回到線條
- AND 顯示 toast「收藏失敗，請稍後再試」
- AND 按鈕回到可點擊狀態

#### Scenario: 點實心愛心取消收藏
- GIVEN 卡片目前 `isFavorited = true`
- WHEN 使用者點愛心
- THEN icon 立即變線條
- AND 對 `/api/tools/:id/favorite` 發出 DELETE
- AND 失敗時還原 + toast

#### Scenario: 未登入時點愛心
- GIVEN 卡片在未登入頁面被 render（如未登入訪客的 marketplace）
- WHEN 使用者點愛心
- THEN 跳出 toast「請先登入才能收藏」並導引至 /login
- AND 不發出 API 呼叫

### Requirement: 工具詳細頁收藏按鈕
工具詳細頁 SHALL 顯示獨立的收藏按鈕，與 share-button 並列。

#### Scenario: 詳細頁顯示收藏按鈕
- GIVEN 使用者打開 `/tool/:id/details`
- WHEN 頁面 render
- THEN share-button 旁邊顯示愛心按鈕
- AND 按鈕反映目前收藏狀態（已收藏 / 未收藏）
- AND 點擊行為與卡片愛心一致（樂觀更新 + 失敗回滾）

### Requirement: 首頁我的收藏 Tab
首頁 SHALL 在現有 5 個 tab 後新增第 6 個「我的收藏」tab，顯示當前使用者收藏過且仍可見的工具，以收藏時間 desc 排序。

#### Scenario: 我的收藏 tab 顯示收藏列表
- GIVEN 使用者已收藏多個工具
- WHEN 切換到「我的收藏」tab
- THEN 列表以 `ToolFavorite.createdAt` desc 排序顯示
- AND 每張卡片的愛心皆為實心
- AND 套用 `buildVisibilityFilter`，不可見的工具不出現

#### Scenario: 收藏為空的空狀態
- GIVEN 使用者尚未收藏任何工具
- WHEN 切換到「我的收藏」tab
- THEN 顯示空狀態文案：「還沒有收藏任何工具，去探索看看」
- AND 顯示 CTA 連結回 trending tab

#### Scenario: 在收藏 tab 取消收藏
- GIVEN 使用者在「我的收藏」tab，可見一張已收藏卡片
- WHEN 點該卡片愛心取消收藏
- THEN 樂觀更新後卡片從列表移除
- AND 列表 reflow

#### Scenario: 工具變不可見不顯示在收藏 tab
- GIVEN 使用者收藏的工具 T1 後來變成 PRIVATE 且使用者非 author
- WHEN 使用者打開「我的收藏」tab
- THEN T1 不出現在列表
- AND `ToolFavorite` 紀錄保留（未來重新可見時再出現）

### Requirement: 卡片收藏狀態的高效查詢
全站使用 `MarketplaceToolCard` 的頁面 SHALL 在 server 端一次性查詢使用者的收藏 id set，避免每張卡片各自查 DB。

#### Scenario: server page 查詢收藏 id set
- GIVEN 一個 marketplace 頁面 render 多張卡片
- WHEN server-side 在頁面進入時查 `getFavoriteToolIds(userId)`
- THEN 結果是一個 `Set<string>`
- AND 每張卡片接到 `isFavorited: favoriteIds.has(tool.id)` prop

#### Scenario: 未登入使用者不查收藏
- GIVEN 一個 marketplace 頁面被未登入訪客打開
- WHEN server render
- THEN 不執行 `getFavoriteToolIds` 查詢
- AND 所有卡片的 `isFavorited` 為 false
