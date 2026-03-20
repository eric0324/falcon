# Design: Skill System

## Database

### Prisma Schema

```prisma
model Skill {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                String
  description         String
  prompt              String   @db.Text
  requiredDataSources String[] @default([])
  category            String   @default("other")  // analytics, marketing, project-management, writing, other
  visibility          String   @default("private") // private, public
  usageCount          Int      @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([userId])
  @@index([visibility, category])
  @@index([visibility, usageCount(sort: Desc)])
}
```

在 `User` model 加入 relation：
```prisma
skills Skill[]
```

## API Routes

### GET /api/skills

查詢公開 skills（+ 自己的）。

```ts
// Query params: ?category=xxx&search=xxx
// Returns: Skill[] with user.name
// Sort: usageCount desc
// Includes: 自己的所有 skills + 他人的 public skills
```

### GET /api/skills/mine

查詢自己的 skills。

```ts
// Returns: Skill[] sorted by updatedAt desc
```

### POST /api/skills

```ts
// Body: { name, description, prompt, requiredDataSources?, category, visibility }
// Validation: zod schema
// Returns: created Skill
```

### PUT /api/skills/[id]

```ts
// Body: partial { name, description, prompt, requiredDataSources, category, visibility }
// Auth: skill.userId === session.user.id
// Returns: updated Skill
```

### DELETE /api/skills/[id]

```ts
// Auth: skill.userId === session.user.id
// Returns: 204
```

### POST /api/skills/[id]/use

```ts
// Increments usageCount by 1 (fire-and-forget from frontend)
// Returns: 200
```

## Frontend Components

### 1. SkillSelector (`src/components/skill-selector.tsx`)

位置：聊天工具列，DataSourceSelector 旁邊。

```
DropdownMenu
├── Trigger: Button (ghost, sm, h-8)
│   ├── Wand2 icon (h-3.5 w-3.5)
│   ├── "Skills"
│   └── ChevronDown
└── Content (w-96)
    ├── Search Input
    ├── Separator
    ├── "我的 Skills" section
    │   └── SkillItem[] (name, description, category badge)
    ├── Separator
    └── "公開 Skills" section (grouped by category)
        └── SkillItem[] (name, description, author, usageCount)
```

**Props:**
```ts
interface SkillSelectorProps {
  onSelect: (skill: { prompt: string; requiredDataSources: string[] }) => void;
  disabled?: boolean;
}
```

**行為：**
- 選取 skill 時呼叫 `onSelect`，由 chat page 處理 prompt 填入和 data source 啟用
- 呼叫 `POST /api/skills/[id]/use` 記錄使用次數
- 使用 SWR 或 fetch 取得 skill 列表

### 2. SkillManager Page (`src/app/(app)/skills/page.tsx`)

Sidebar 新增「Skills」導航項目。

```
Page
├── Header: "我的 Skills" + "新增" Button
├── Skill Cards Grid
│   └── SkillCard
│       ├── name, description
│       ├── category badge, visibility badge
│       ├── usageCount
│       └── Edit / Delete buttons
└── Create/Edit Dialog
    ├── name input
    ├── description textarea
    ├── prompt textarea (with char count)
    ├── category select
    ├── requiredDataSources multi-select (reuse DataSourceSelector pattern)
    └── visibility toggle (private / public)
```

### 3. Chat Page Integration

在 `src/app/(app)/chat/page.tsx`：

```ts
// 工具列新增 SkillSelector
<SkillSelector
  onSelect={(skill) => {
    setInput(skill.prompt);
    if (skill.requiredDataSources.length > 0) {
      setSelectedDataSources(prev => [
        ...new Set([...prev, ...skill.requiredDataSources])
      ]);
    }
  }}
  disabled={isLoading || isQuotaBlocked}
/>
```

## Sidebar 修改

```ts
const navItems = [
  { href: "/chat", labelKey: "nav.chat", icon: Plus, neverActive: true },
  { href: "/skills", labelKey: "nav.skills", icon: Wand2, neverActive: false },
  { href: "/tools", labelKey: "nav.tools", icon: Wrench, neverActive: false },
];
```

## i18n Keys

```json
{
  "nav.skills": "Skills",
  "skills.title": "我的 Skills",
  "skills.create": "新增 Skill",
  "skills.edit": "編輯 Skill",
  "skills.delete": "刪除 Skill",
  "skills.deleteConfirm": "確定要刪除此 Skill？",
  "skills.name": "名稱",
  "skills.description": "描述",
  "skills.prompt": "Prompt",
  "skills.category": "分類",
  "skills.visibility": "可見度",
  "skills.private": "私人",
  "skills.public": "公開",
  "skills.requiredDataSources": "需要的資料來源",
  "skills.usageCount": "使用次數",
  "skills.mySkills": "我的 Skills",
  "skills.publicSkills": "公開 Skills",
  "skills.search": "搜尋 Skills...",
  "skills.empty": "尚未建立任何 Skill",
  "skills.categories.analytics": "數據分析",
  "skills.categories.marketing": "行銷",
  "skills.categories.project-management": "專案管理",
  "skills.categories.writing": "寫作",
  "skills.categories.other": "其他"
}
```
