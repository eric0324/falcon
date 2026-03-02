/**
 * 匯入外部資料庫 schema 備註（table note + column note）
 *
 * 用法:
 *   bunx tsx scripts/import-schema-notes.ts <csv-path> <database-id>
 *
 * CSV 格式（含標題列）:
 *   "表名","表備註","欄位名","欄位型別","欄位備註"
 *
 * 行為:
 * - 如果 database ID 不存在，會建立一筆 placeholder ExternalDatabase
 * - 對每張 table 執行 upsert，寫入 note
 * - 對每個 column 執行 upsert，寫入 note + dataType
 * - 新建的 table/column 自動連結所有 groups
 * - 已存在的 table/column 只更新 note（不覆蓋 hidden、allowedGroups 等設定）
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

// ── CSV 解析 ──────────────────────────────────────
interface CsvRow {
  tableName: string;
  tableNote: string;
  columnName: string;
  dataType: string;
  columnNote: string;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split("\n").filter((l) => l.trim());
  // 跳過標題列
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    // 處理 CSV：移除引號、處理逗號分隔
    const fields = line.match(/("([^"]*)"|[^,]*)/g) || [];
    const clean = fields.map((f) => f.replace(/^"|"$/g, "").trim());

    return {
      tableName: clean[0] || "",
      tableNote: clean[1] || "",
      columnName: clean[2] || "",
      dataType: clean[3] || "",
      columnNote: clean[4] || "",
    };
  }).filter((r) => r.tableName && r.columnName);
}

// ── 主程式 ──────────────────────────────────────
async function main() {
  const [csvPath, databaseId] = process.argv.slice(2);

  if (!csvPath || !databaseId) {
    console.error("用法: bunx tsx scripts/import-schema-notes.ts <csv-path> <database-id>");
    process.exit(1);
  }

  const content = readFileSync(csvPath, "utf-8");
  // 移除 BOM
  const cleanContent = content.replace(/^\uFEFF/, "");
  const rows = parseCsv(cleanContent);

  console.log(`讀取到 ${rows.length} 筆欄位資料`);

  // 按 table 分組
  const tableMap = new Map<string, { note: string; columns: CsvRow[] }>();
  for (const row of rows) {
    if (!tableMap.has(row.tableName)) {
      tableMap.set(row.tableName, { note: row.tableNote, columns: [] });
    }
    tableMap.get(row.tableName)!.columns.push(row);
  }

  console.log(`共 ${tableMap.size} 張表`);

  // 確認 database 存在
  const db = await prisma.externalDatabase.findUnique({
    where: { id: databaseId },
  });

  if (!db) {
    console.error(`找不到 ExternalDatabase ID: ${databaseId}`);
    console.error("請先在 admin 後台建立資料庫連線，再用該 ID 執行此 script");
    process.exit(1);
  }

  console.log(`目標資料庫: ${db.name} (${db.type})`);

  // 取得所有 groups（新建的 table/column 連結全部 groups）
  const allGroups = await prisma.group.findMany({ select: { id: true } });
  const connectAllGroups = allGroups.map((g) => ({ id: g.id }));
  console.log(`將連結 ${allGroups.length} 個群組`);

  // 逐表 upsert
  let tableCount = 0;
  let columnCount = 0;

  for (const [tableName, { note: tableNote, columns }] of tableMap) {
    // Upsert table
    const existingTable = await prisma.externalDatabaseTable.findUnique({
      where: { databaseId_tableName: { databaseId, tableName } },
    });

    let tableId: string;

    if (existingTable) {
      // 只更新 note
      await prisma.externalDatabaseTable.update({
        where: { id: existingTable.id },
        data: { note: tableNote || null },
      });
      tableId = existingTable.id;
    } else {
      const created = await prisma.externalDatabaseTable.create({
        data: {
          databaseId,
          tableName,
          note: tableNote || null,
          allowedGroups: { connect: connectAllGroups },
        },
      });
      tableId = created.id;
    }

    // Upsert columns
    for (const col of columns) {
      const existingCol = await prisma.externalDatabaseColumn.findUnique({
        where: { tableId_columnName: { tableId, columnName: col.columnName } },
      });

      if (existingCol) {
        await prisma.externalDatabaseColumn.update({
          where: { id: existingCol.id },
          data: {
            note: col.columnNote || null,
            dataType: col.dataType || existingCol.dataType,
          },
        });
      } else {
        await prisma.externalDatabaseColumn.create({
          data: {
            tableId,
            columnName: col.columnName,
            dataType: col.dataType || "varchar",
            note: col.columnNote || null,
            allowedGroups: { connect: connectAllGroups },
          },
        });
      }

      columnCount++;
    }

    tableCount++;
    if (tableCount % 20 === 0) {
      console.log(`  進度: ${tableCount}/${tableMap.size} 表 (${columnCount} 欄位)`);
    }
  }

  console.log(`\n完成！共匯入 ${tableCount} 張表、${columnCount} 個欄位備註`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
