# Proposal: Studio 對話增強功能

## Summary
在 Studio 對話介面新增檔案上傳、資料來源選擇、模型選擇功能。

## Why
- 檔案上傳：讓使用者可以提供範例資料、截圖、規格文件給 AI 參考
- 資料來源選擇：讓 AI 知道工具可以存取哪些資料來源，生成對應的程式碼
- 模型選擇：不同任務適合不同模型，讓使用者可以選擇（速度 vs 品質）

## What Changes
- 對話輸入區新增檔案上傳按鈕
- 新增資料來源選擇器（多選）
- 新增模型選擇下拉選單
- 更新 chat API 支援檔案和設定參數

## Motivation
Enhance the Studio chat interface to support file uploads for context, data source selection for code generation, and model selection for flexibility.

## Scope

### In Scope
- 檔案上傳 UI（拖放 + 點擊上傳）
- 支援圖片、PDF、文字檔案
- 資料來源多選器
- 模型選擇（Claude Sonnet / Haiku / Opus）
- 將選擇的資料來源資訊傳給 AI

### Out of Scope
- 檔案永久儲存（僅用於當次對話）
- 資料來源管理介面
- 自訂模型參數（temperature 等）

## Success Criteria
- [ ] 可以上傳檔案並在對話中引用
- [ ] 可以選擇多個資料來源
- [ ] 可以切換 AI 模型
- [ ] AI 能根據選擇的資料來源生成正確的 companyAPI 呼叫

## Dependencies
- 現有 Studio chat 實作

## Timeline
4-5 hours
