# Tasks: Tool Visibility & Permissions

## 1. Visibility Selector
- [ ] 1.1 Create VisibilitySelect component
- [ ] 1.2 Add radio group with options:
  - 🔒 私人 (PRIVATE) - 只有自己
  - 👥 部門 (DEPARTMENT) - 同部門成員
  - 🏢 公司 (COMPANY) - 全公司員工
  - 🌐 公開 (PUBLIC) - 任何人
- [ ] 1.3 Integrate into deploy dialog
- [ ] 1.4 Default to PRIVATE

## 2. Update Tool API
- [ ] 2.1 Accept visibility in POST/PATCH body
- [ ] 2.2 Update GET /api/tools to filter:
  ```typescript
  // User sees:
  // - Their own tools (any visibility)
  // - DEPARTMENT tools from same department
  // - COMPANY tools
  // - PUBLIC tools
  ```
- [ ] 2.3 Validate visibility enum value

## 3. Access Control
- [ ] 3.1 Update tool page access check:
  ```typescript
  function canAccessTool(user, tool) {
    if (tool.visibility === 'PUBLIC') return true;
    if (!user) return false;
    if (tool.authorId === user.id) return true;
    if (tool.visibility === 'COMPANY') return true;
    if (tool.visibility === 'DEPARTMENT') {
      return user.department === tool.author.department;
    }
    return false;
  }
  ```
- [ ] 3.2 Include author's department in tool query
- [ ] 3.3 Return 403 for unauthorized access

## 4. Public Tool Access
- [ ] 4.1 Allow unauthenticated access to PUBLIC tools
- [ ] 4.2 Update middleware to allow /tool/[id] without auth
- [ ] 4.3 Check visibility in page component
- [ ] 4.4 Show login prompt for non-public tools

## 5. Visibility Badge
- [ ] 5.1 Create VisibilityBadge component
- [ ] 5.2 Add to tool cards
- [ ] 5.3 Style each visibility level differently

## 6. Homepage Tabs
- [ ] 6.1 Add tabs: "我的工具" | "部門工具" | "公司工具"
- [ ] 6.2 Filter tool list based on active tab
- [ ] 6.3 Show appropriate empty states
