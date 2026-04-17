# Studio Specification Deltas

## ADDED Requirements

### Requirement: 圖片 Provider 選擇器
Studio SHALL 在 chat model 選擇器旁提供獨立的圖片 provider 選擇器。

#### Scenario: 顯示選擇器
- GIVEN 使用者進入 Studio
- WHEN 畫面渲染完成
- THEN chat model 選擇器旁出現圖片 provider 下拉
- AND 選項為 `Imagen 4` 與 `GPT-Image-1`
- AND 預設值為 `Imagen 4`

#### Scenario: 切換 provider
- GIVEN 使用者切換圖片 provider 下拉
- WHEN 選擇新值
- THEN 該值保存在對話狀態
- AND 下次觸發 `generateImage` 時此值作為 provider 參數傳入

### Requirement: 訊息中圖片渲染
Studio SHALL 在訊息列顯示 `generateImage` tool 回傳的圖片與錯誤狀態。

#### Scenario: 渲染生成圖片
- GIVEN 訊息包含 `image_generated` tool result
- WHEN 渲染訊息
- THEN 顯示圖片（寬度自適應）
- AND 提供下載按鈕
- AND 提供點擊放大檢視

#### Scenario: Presigned URL 過期重簽
- GIVEN 圖片載入失敗（URL 過期）
- WHEN 前端偵測到圖片 error event
- THEN 呼叫 `/api/chat/presign-image?key=<s3Key>` 取得新 URL
- AND 以新 URL 重試顯示

#### Scenario: 渲染錯誤
- GIVEN 訊息包含 `image_error` tool result
- WHEN 渲染訊息
- THEN 顯示錯誤卡片，包含 `reason` 文字

### Requirement: 本地圖檔上傳
Studio SHALL 允許使用者在訊息輸入區上傳本地圖檔，供圖生圖使用。

#### Scenario: 拖拉上傳
- GIVEN 使用者拖拉圖檔到訊息輸入區
- WHEN 放開滑鼠
- THEN 檔案 POST 到 `/api/chat/upload-image`
- AND 上傳成功後顯示縮圖與移除按鈕
- AND 送出訊息時夾帶 `s3Key`

#### Scenario: 點擊選檔
- GIVEN 使用者點擊輸入區的上傳按鈕
- WHEN 選擇圖檔
- THEN 流程同拖拉上傳

#### Scenario: 上傳失敗
- GIVEN 檔案過大或 MIME 不符
- WHEN upload endpoint 回錯
- THEN 輸入區顯示錯誤訊息，不夾帶任何 `s3Key`

#### Scenario: 取消上傳
- GIVEN 上傳完成後使用者尚未送出訊息
- WHEN 點擊縮圖上的移除按鈕
- THEN 從待送訊息中移除該 `s3Key`
