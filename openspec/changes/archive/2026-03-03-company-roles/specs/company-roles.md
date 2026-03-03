# Spec: company-roles

## Requirements

### R1: 角色 CRUD
- 管理員可建立角色（名稱必填，不可重複）
- 管理員可編輯角色名稱
- 管理員可刪除角色（刪除時解除所有使用者和 table/column 的關聯）

### R2: 使用者角色指派
- 管理員可在使用者詳情頁指派/移除角色
- 一個使用者可以擁有零到多個角色
- 沒有角色的使用者視為「無權限」（看不到任何 table/column）

### R3: 資料表/欄位角色權限
- 管理員可為每張 table 設定允許的角色清單
- 管理員可為每個 column 設定允許的角色清單
- 新掃描到的 table/column 預設允許所有現有角色（全部勾選）
- 空的 allowedRoles 代表「所有角色皆可見」

### R4: 可見性規則（供後續 LLM 過濾使用）
- 使用者有角色 A，table 的 allowedRoles 包含 A → 可見
- 使用者有角色 A，table 的 allowedRoles 不包含 A → 不可見
- 使用者沒有任何角色 → 不可見任何 table/column
- table 的 allowedRoles 為空 → 所有角色皆可見
- table 被標記 hidden → 所有人不可見（hidden 優先於 allowedRoles）

## Scenarios

### S1: 建立角色
- Given: 管理員在角色管理頁
- When: 輸入「財務部」並送出
- Then: 角色建立成功，出現在列表中

### S2: 角色名稱重複
- Given: 已存在「財務部」角色
- When: 再次輸入「財務部」
- Then: 顯示錯誤「角色名稱已存在」

### S3: 指派角色給使用者
- Given: 管理員在使用者詳情頁
- When: 勾選「財務部」和「主管」
- Then: 使用者擁有兩個角色

### S4: 設定 table 允許角色
- Given: 外部資料庫有 `salaries` 資料表
- When: 管理員將 allowedRoles 設為 [財務部]
- Then: 只有擁有「財務部」角色的使用者的 LLM 可參考此表

### S5: 刪除角色
- Given:「財務部」角色已指派給 3 個使用者和 2 張 table
- When: 管理員刪除「財務部」
- Then: 角色刪除，3 個使用者和 2 張 table 的關聯自動解除

### S6: 新掃描的 table 預設權限
- Given: 已有角色「財務部」「業務部」
- When: 執行資料庫掃描，發現新的 table
- Then: 新 table 的 allowedRoles 自動包含「財務部」和「業務部」
