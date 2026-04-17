# System Config Specification Deltas

## ADDED Requirements

### Requirement: AWS S3 設定
系統 SHALL 透過 `SystemConfig` 管理 AWS S3 credentials，沿用既有動態設定機制。

#### Scenario: 從 SystemConfig 讀取 S3 credentials
- GIVEN DB 中有 `AWS_S3_BUCKET`、`AWS_S3_REGION`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`
- WHEN storage 層建立 S3 client
- THEN 使用 DB 中的值初始化

#### Scenario: 缺少必要 S3 設定
- GIVEN `AWS_S3_BUCKET` 在 DB 與 env 皆未設定
- WHEN 呼叫任何會使用 S3 的流程（圖片生成、圖片上傳）
- THEN 拋出明確錯誤：「尚未設定 AWS_S3_BUCKET，請至 /admin/settings 設定」

#### Scenario: Admin 設定 S3 欄位
- GIVEN 使用者為 ADMIN
- WHEN 於 `/admin/settings` 填入並儲存 S3 credentials
- THEN 四個 key 加密寫入 DB
- AND 敏感值（access key、secret）masked 顯示
- AND bucket、region 以明文顯示
