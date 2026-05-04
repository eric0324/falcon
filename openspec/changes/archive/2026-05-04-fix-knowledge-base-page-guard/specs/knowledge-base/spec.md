# Knowledge Base Spec Deltas — fix-knowledge-base-page-guard

## ADDED Requirements

### Requirement: 知識庫頁面 Server-side 權限守門

知識庫的 server page（detail 與 settings）SHALL 在 server 端完成權限檢查，未授權的使用者必須在 server response 階段就被擋下，不可依賴 client 端 redirect 達成擋拒效果。

#### Scenario: 未登入使用者訪問 detail 或 settings 頁
- GIVEN 使用者未登入
- WHEN 訪問 `/knowledge/:id` 或 `/knowledge/:id/settings`
- THEN server 重導至 `/login`（既有行為，保留）

#### Scenario: 已登入但非成員訪問 detail 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 沒有任何 role（既非 creator、非 member、非系統 admin）
- WHEN 訪問 `/knowledge/:id`
- THEN server 端呼叫 `notFound()`，回應 404
- AND client component 不會被 render
- AND 不洩漏 KB 是否存在

#### Scenario: 成員訪問 detail 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 有 role（VIEWER / CONTRIBUTOR / ADMIN / creator / system admin 任一）
- WHEN 訪問 `/knowledge/:id`
- THEN client component 正常 render

#### Scenario: 已登入但非成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 沒有任何 role
- WHEN 訪問 `/knowledge/:id/settings`
- THEN server 端呼叫 `notFound()`，回應 404

#### Scenario: 非 ADMIN 成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 是 VIEWER 或 CONTRIBUTOR
- WHEN 訪問 `/knowledge/:id/settings`
- THEN server 端 `redirect` 至 `/knowledge/:id`
- AND settings client component 不會被 render

#### Scenario: ADMIN 成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 的 role 是 ADMIN（含 creator 與 system admin）
- WHEN 訪問 `/knowledge/:id/settings`
- THEN settings client component 正常 render
