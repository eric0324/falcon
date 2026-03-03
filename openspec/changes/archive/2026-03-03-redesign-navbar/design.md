# Design: 側邊欄 + 極簡頂部導航

## 架構決策

### 1. 佈局策略

採用 **App Shell 模式**，將側邊欄和頂部欄提升到 `layout.tsx` 層級，讓所有頁面共享統一的導航結構。

```
RootLayout
└── Providers
    └── AppShell (新增)
        ├── TopBar
        ├── Sidebar
        └── MainContent (children)
```

**理由**：
- 避免每個頁面重複引入 Navbar
- 側邊欄狀態可以在頁面切換時保持
- 對話列表只需載入一次

### 2. 狀態管理

使用 **React Context** 管理側邊欄狀態：

```typescript
interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}
```

**理由**：
- 狀態簡單，不需要 Zustand 或 Redux
- TopBar 和 Sidebar 都需要存取狀態
- Context 可以輕鬆整合到現有的 Providers

### 3. 響應式斷點

| 斷點 | 側邊欄行為 |
|------|-----------|
| `< 768px` (md) | 預設隱藏，overlay 模式展開 |
| `>= 768px` | 預設展開，inline 模式 |

### 4. 對話列表載入

採用 **Server Component + Client Hydration** 模式：

1. `AppShell` 是 Server Component，負責載入對話列表
2. `Sidebar` 是 Client Component，處理互動邏輯
3. 對話列表作為 props 傳入，避免 client-side fetch

**理由**：
- 利用 Next.js 14 的 Server Component 優勢
- 減少客戶端 JavaScript
- 首次載入更快

### 5. 頁面特殊處理

#### Studio 頁面

Studio 有自己的 header，需要特殊處理：

**方案 A**：Studio 不使用 AppShell（獨立佈局）
**方案 B**：Studio 使用 AppShell，但隱藏 TopBar

選擇 **方案 B**：
- 保持導航一致性
- 使用者可以從側邊欄快速切換對話
- 透過 pathname 判斷是否顯示 TopBar

#### Login 頁面

Login 頁面不需要側邊欄和頂部欄，透過 route group 排除：

```
src/app/
├── (app)/           ← 使用 AppShell
│   ├── page.tsx
│   ├── marketplace/
│   └── studio/
├── (auth)/          ← 不使用 AppShell
│   └── login/
└── layout.tsx
```

## 元件設計

### TopBar

```tsx
<header className="h-14 border-b flex items-center justify-between px-4">
  <div className="flex items-center gap-2">
    <SidebarToggle />
    <Logo />
  </div>
  <div className="flex items-center gap-2">
    <NewConversationButton />
    <UserNav />
  </div>
</header>
```

### Sidebar

```tsx
<aside className={cn(
  "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r",
  "transform transition-transform duration-200",
  isOpen ? "translate-x-0" : "-translate-x-full",
  "md:relative md:translate-x-0",
  !isOpen && "md:w-0 md:overflow-hidden"
)}>
  <nav className="p-4 space-y-6">
    <NavSection />
    <ConversationList />
  </nav>
</aside>
```

### 側邊欄寬度

| 狀態 | 寬度 |
|------|------|
| 展開 | 256px (w-64) |
| 收合 | 0px (桌面) / hidden (行動) |

## 樣式規範

### 色彩

沿用現有的 shadcn/ui 色彩系統：

- 背景：`bg-background`
- 邊框：`border-border`
- 文字：`text-foreground` / `text-muted-foreground`
- 選中態：`bg-accent`

### 動畫

- 側邊欄展開/收合：`transition-transform duration-200`
- Hover 效果：`transition-colors`

### 圖標

使用 Lucide React，與現有設計一致：

- 側邊欄 toggle：`PanelLeftClose` / `PanelLeft`
- 探索市集：`Store`
- 我的工具：`Wrench`
- 新對話：`Plus`

## 資料流

```
┌─────────────────┐
│  getServerSession │
│  + prisma.conversation.findMany
└────────┬────────┘
         ↓
┌─────────────────┐
│    AppShell     │ (Server Component)
│  conversations: []
└────────┬────────┘
         ↓
┌─────────────────┐
│    Sidebar      │ (Client Component)
│  conversations  │
│  isOpen, toggle │
└─────────────────┘
```

## 測試策略

1. **單元測試**：測試 SidebarContext 的狀態邏輯
2. **元件測試**：測試 Sidebar、TopBar 的渲染
3. **整合測試**：測試導航項目的路由跳轉
4. **E2E 測試**：測試側邊欄展開/收合的互動

## 遷移計畫

1. 建立新元件（不影響現有功能）
2. 在 layout.tsx 整合 AppShell
3. 移除各頁面的 Navbar 引用
4. 移除舊的 Navbar 元件
5. 調整 Studio 頁面的佈局
