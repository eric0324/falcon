# Tasks: Sandpack Preview Panel

## 1. Sandpack Setup
- [x] 1.1 Install Sandpack
  ```bash
  pnpm add @codesandbox/sandpack-react
  ```
- [x] 1.2 Create PreviewPanel component (`src/components/preview-panel.tsx`)
- [x] 1.3 Configure Sandpack with React template

## 2. Basic Preview
- [x] 2.1 Set up Sandpack with SandpackProvider + SandpackPreview
- [x] 2.2 Style preview container to fill available space (flex layout)
- [x] 2.3 Add light theme support
- [x] 2.4 Include Tailwind CSS via externalResources

## 3. Code Hot-Reload
- [x] 3.1 Accept `code` prop from parent
- [x] 3.2 Use `key` state to trigger re-render on code change
- [x] 3.3 Handle empty/null code state (show DEFAULT_CODE placeholder)
- [x] 3.4 Show "● Live" indicator when code is active

## 4. Mock Company API
- [x] 4.1 Create MOCK_API inline in preview-panel.tsx
- [x] 4.2 Implement mock responses:
  - `query()`: orders, users/employees, products 模擬資料
  - `call()`: 模擬 REST API 回應
  - `getSources()`: 模擬資料源列表
- [x] 4.3 Inject mock API into Sandpack App.js file
- [x] 4.4 Add console.log with styled warning for mock mode

## 5. Error Handling
- [x] 5.1 Sandpack 內建錯誤邊界自動處理
- [x] 5.2 Display syntax errors in preview area
- [ ] 5.3 Custom error overlay (deferred - using Sandpack default)

## 6. Loading States
- [x] 6.1 ToolRunner: Show "Loading..." during mount
- [x] 6.2 PreviewPanel: Show "使用模擬資料" badge
- [ ] 6.3 Fade effect when code updates (deferred)

## 7. Preview Controls
- [x] 7.1 Add refresh button via showRefreshButton={true}
- [x] 7.2 Hide "Open in CodeSandbox" via showOpenInCodeSandbox={false}
- [ ] 7.3 Fullscreen toggle (deferred)
- [ ] 7.4 Device frame selector (deferred)

## 8. Integration with Chat
- [x] 8.1 Connect code extraction to preview panel in studio/page.tsx
- [x] 8.2 Update preview when new code extracted during streaming
- [x] 8.3 Reset preview when handleReset() called

## 9. Production Mode (超出原 Scope)
- [x] 9.1 Create ToolRunner component for deployed tools
- [x] 9.2 Implement real API Bridge via PostMessage
- [x] 9.3 Create sandbox-api-client.ts for Bridge code generation
- [x] 9.4 Create use-api-bridge.ts hook for message handling
- [x] 9.5 Create /api/bridge backend endpoint
- [x] 9.6 Implement database connectors (PostgreSQL, MySQL, REST API)
- [x] 9.7 Add permission validation (Session → Tool → DataSource)
- [x] 9.8 Add API logging for audit trail
