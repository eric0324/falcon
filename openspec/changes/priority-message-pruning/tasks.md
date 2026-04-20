# Tasks: 基於優先度的訊息修剪

## Task 1: Priority 計算
- [ ] 建立 `src/lib/ai/message-priority.ts`
- [ ] 實作 `scoreMessage(message, index, totalCount): number`（0-100）
- [ ] 實作 `scoreMessages(messages): Array<{ message, score, index }>`
- [ ] 撰寫單元測試（覆蓋所有 heuristic case）

## Task 2: Priority-based Split
- [ ] 修改 `src/lib/ai/compact.ts` 的 `splitMessages()`
- [ ] 新策略：
  - 永遠保留 score >= 80 的訊息
  - 永遠保留最後 3 則訊息（不管 score）
  - 其他依 recency + score 排序，取 top N 保留
  - 剩下的進摘要池
- [ ] 撰寫單元測試（確認舊的「保留最後 6 則」行為仍能透過 score 達成）

## Task 3: 摘要 Prompt 調整
- [ ] 摘要 prompt 中提示 AI：「以下訊息是按優先度篩選後的次要訊息，請保留關鍵決策與資訊」
- [ ] 確保摘要品質不降

## Task 4: Feature Flag
- [ ] 在 `src/lib/config.ts` 或環境變數加入 `FEATURE_PRIORITY_PRUNING`（boolean）
- [ ] Flag off 時走舊邏輯（保留最後 6 則）
- [ ] Flag on 時走新 priority 邏輯

## Task 5: 觀察與監控
- [ ] `[Chat API] Compacted: X → Y messages (priority-based, keptOriginal=Z)` log
- [ ] 記錄保留的訊息 index 分布

## Task 6: 測試
- [ ] 單元測試：scoreMessage ≥ 15 case
- [ ] 單元測試：splitMessages（priority 模式）≥ 10 case
- [ ] 整合測試：完整 compact flow 維持綠燈
- [ ] 手動實測：長對話 + 附件 + tool calls 混合場景

## 依賴關係

```
Task 1 ← Task 2 ← Task 3, Task 4
              ← Task 5
              ← Task 6
```

- Task 1 是核心
- Task 2 依賴 Task 1
- Task 3-6 可平行
