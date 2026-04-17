# Design: improve-code-editing-safety

## Context

`updateCode` 目前是「傳一整段 code 全覆蓋」的設計，依賴 AI 每次都把所有既有功能完整保留下來。但 AI 在長對話、被 compact 過、或只讀到部分 context 時，很容易 regenerate 一個「只保留本輪功能」的簡化版，把其他功能砍掉。已發生使用者回報工具被蓋掉的情境。

三層防禦的理由：
- **Prompt（降發生率）**：引導 AI 偏向局部修改，避免全量重寫
- **editCode（降觸發率）**：從工具層阻擋「整段覆蓋」的路徑 —— 小改只能動被 find 到的那段
- **Snapshot（降傷害）**：就算失守，使用者能救回

## 關鍵決策

### 1. Snapshot 用獨立表，不塞 JSON 欄位

**作法**：`ToolCodeSnapshot` 獨立表，`toolId` FK，每版一 row。

**理由**：
- 20 版 × 每版可能 5–50KB code → JSON 欄位會膨脹、每次讀 Tool 都被迫載一堆不需要的資料
- 獨立表可分頁、可只 select metadata（id / explanation / createdAt）做列表
- 清舊也單純：`delete where toolId=X order by createdAt desc skip 20`

**Tradeoff**：多一個 table，migration 有額外成本；但換來 Tool 主表輕量、查詢乾淨，划算。

### 2. 每個 tool 保留最近 20 筆，超過自動刪最舊

**作法**：`snapshotBeforeUpdate` 寫入後，若該 tool 的 snapshot 筆數 > 20，刪最舊到剩 20 筆。

**理由**：
- 太多 row 會拖慢列表 + 佔空間，又沒人回頭看 50 版以前的
- 20 筆夠使用者 undo 最近半天到一天內的改動
- 清舊在同一 transaction 內做，一致性不會壞

**Tradeoff**：超過 20 版的歷史被丟掉；若未來要永久保存再擴欄位或改策略。

### 3. editCode 採 exact string 替換，要求 find 唯一

**作法**：AI 傳 `{ find, replace }`，server 端：
- `occurrences = count(code, find)`
- `occurrences === 0` → 錯（「找不到，請重新確認當前程式碼」）
- `occurrences > 1` → 錯（「find 出現 N 次，請加更多 context 讓它唯一」）
- `occurrences === 1` → `code.replace(find, replace)` → 寫 DB

**理由**：
- exact string 比 regex / AST patch 簡單，AI 幾乎一定能產生正確輸入
- 唯一性要求逼 AI 在 find 帶足夠 context，避免「所有按鈕都被換掉」這種意外
- 錯誤訊息讓 AI 能自行修正重試（AI SDK 的 tool loop 本來就支援）

**Tradeoff**：
- 複雜重構（例如同時改多處）要多次呼叫 editCode 或改用 updateCode。可接受。
- 若檔案內有重複 pattern（例如「className="text-sm"」），AI 得帶周邊 context 才能唯一定位。這反而是優點：逼 AI 精確。

### 4. Snapshot 觸發時機：成功更新前

**作法**：`updateCode` / `editCode` / restore 執行時，若 `newCode !== currentCode` 才 snapshot 舊 code，再寫新 code（同一 transaction）。

**理由**：
- 重複 updateCode 相同內容（AI 有時會）不產生垃圾 snapshot
- transaction 保證 snapshot 和 update 同生同死
- restore 前也 snapshot 當前版 → 「還原錯了還能再還原回來」

### 5. 版本歷史 UI 放在工具詳情頁

**作法**：`/tool/[id]` 加 Popover / Dialog，列 20 筆、每筆有「還原」按鈕；還原需二次確認。

**理由**：
- 工具詳情頁是使用者管理工具的主入口，放這最直覺
- 不放對話頁（太雜）也不放 marketplace（viewer 不該看別人的歷史）
- 只作者 / 有編輯權限者可看 —— API 驗 ownership

**Tradeoff**：
- 對話中發現被蓋掉要切到工具詳情頁，一個 extra click；可接受
- 未來若要在對話中快速還原再擴展

### 6. editCode 和 updateCode 共存

**作法**：保留 `updateCode` 做整體重寫 / 建新 tool；`editCode` 做局部。AI 依 prompt 規則自行挑。

**理由**：
- 全量 regenerate 仍有合法用途（使用者說「整個重寫」、第一次生成新 tool）
- 若強制所有修改都走 editCode，AI 要 chain 多次 edit 才能完成複雜改動，效率差
- prompt 規則 + Snapshot 已是雙重保險

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| AI 仍偏好呼叫 `updateCode` | 強化 prompt；從 telemetry 追蹤 updateCode vs editCode 比例，若失衡再調整 |
| `find` 剛好與其他地方碰撞被替換 | uniqueness 檢查擋掉，回錯讓 AI 重試 |
| `editCode` 替換後產生語法錯誤 | 本 change 不加 syntax check；原本 `updateCode` 也沒 check，維持一致。Preview 會顯示錯誤使用者可反饋 |
| 還原覆蓋了使用者正在編輯的內容 | 還原前 snapshot 當前版；二次確認 dialog 提醒 |
| Snapshot 表膨脹 | 每 tool 上限 20 筆 + onDelete Cascade；tool 刪除時 snapshot 自動清 |
| 歷史 tool 沒有 snapshot | 正常 —— 從 apply 後的第一次更新開始累積，舊 tool 第一次編輯前沒 snapshot 不影響功能 |

## 不在本 change 範疇

- Snapshot diff 視覺化 / 高亮
- 對話中 inline 「還原上一版」按鈕
- 自動偵測大改並警告使用者
- Draft tool（conversationId-bound）的 snapshot
- 使用者主動標記「里程碑版本」避免被刪
