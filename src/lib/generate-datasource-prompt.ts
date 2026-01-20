import { getAccessibleDataSources } from "./permissions";

interface SchemaInfo {
  [tableName: string]: string[];
}

/**
 * Generate a prompt section describing available data sources for the user.
 * Filters tables/columns based on the user's department permissions.
 * @param department - User's department for permission filtering
 * @param allowedSourceNames - Optional array of source names to filter by (user-selected sources)
 */
export async function generateDataSourcePrompt(
  department: string | null | undefined,
  allowedSourceNames?: string[]
): Promise<string> {
  let accessibleSources = await getAccessibleDataSources(department);

  // Filter by user-selected sources if provided
  if (allowedSourceNames && allowedSourceNames.length > 0) {
    accessibleSources = accessibleSources.filter(({ dataSource }) =>
      allowedSourceNames.includes(dataSource.name)
    );
  }

  if (accessibleSources.length === 0) {
    return "";
  }

  let prompt = `\n## 可用的資料源\n\n`;
  prompt += `你可以使用 \`window.companyAPI\` 來查詢以下資料源：\n\n`;

  for (const { dataSource, permission, allowedTables } of accessibleSources) {
    const typeLabel = dataSource.type === "REST_API" ? "REST API" : dataSource.type;

    prompt += `### ${dataSource.displayName} (\`${dataSource.name}\`)\n`;
    prompt += `類型: ${typeLabel}\n`;

    if (dataSource.description) {
      prompt += `說明: ${dataSource.description}\n`;
    }
    prompt += `\n`;

    // Get schema info if available
    const schema = dataSource.schema as SchemaInfo | null;

    if (dataSource.type !== "REST_API" && schema && allowedTables.length > 0) {
      // Get blocked columns (global + department)
      const blockedColumns = new Set([
        ...dataSource.globalBlockedColumns,
        ...permission.readBlockedColumns,
      ]);

      prompt += `**可查詢的資料表：**\n\n`;

      for (const tableName of allowedTables) {
        const columns = schema[tableName];
        if (columns) {
          // Filter out blocked columns
          const visibleColumns = columns.filter((col) => !blockedColumns.has(col));
          prompt += `- \`${tableName}\`: ${visibleColumns.join(", ")}\n`;
        } else {
          prompt += `- \`${tableName}\`\n`;
        }
      }

      prompt += `\n**查詢範例：**\n`;
      prompt += `\`\`\`javascript\n`;
      prompt += `const data = await window.companyAPI.query(\n`;
      prompt += `  '${dataSource.name}',\n`;
      prompt += `  'SELECT * FROM ${allowedTables[0]} LIMIT 10'\n`;
      prompt += `);\n`;
      prompt += `\`\`\`\n\n`;

      if (blockedColumns.size > 0) {
        prompt += `> 注意：某些欄位會根據權限自動過濾，查詢結果中不會包含敏感資料。\n\n`;
      }
    } else if (dataSource.type === "REST_API") {
      const endpoints = dataSource.allowedEndpoints;
      if (endpoints.length > 0) {
        prompt += `**可用的 API：**\n`;
        for (const endpoint of endpoints) {
          prompt += `- \`${endpoint}\`\n`;
        }
        prompt += `\n**呼叫範例：**\n`;
        prompt += `\`\`\`javascript\n`;
        prompt += `const result = await window.companyAPI.call(\n`;
        prompt += `  '${dataSource.name}',\n`;
        prompt += `  '${endpoints[0]}',\n`;
        prompt += `  { /* optional data */ }\n`;
        prompt += `);\n`;
        prompt += `\`\`\`\n\n`;
      }
    }
  }

  prompt += `---\n\n`;
  prompt += `**重要提醒：**\n`;
  prompt += `- 只能使用 SELECT 查詢（不支援 INSERT/UPDATE/DELETE）\n`;
  prompt += `- 使用參數化查詢避免 SQL injection：\`query('db', 'SELECT * FROM users WHERE id = ?', [userId])\`\n`;
  prompt += `- 查詢會在 5 秒後逾時\n`;

  return prompt;
}
