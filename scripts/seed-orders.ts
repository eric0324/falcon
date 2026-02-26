/**
 * 鯨魚購物網 - 50 萬筆訂單壓力測試 seed script
 *
 * 用法: bunx tsx scripts/seed-orders.ts
 *
 * 連線到 Docker 的 mysql_test 容器 (root 帳號)，
 * 批次插入 500,000 筆 orders 和約 125 萬筆 order_items。
 */

import mysql from "mysql2/promise";

// ── 設定 ──────────────────────────────────────────
const TOTAL_ORDERS = 500_000;
const ORDER_BATCH = 5_000; // 每次 INSERT 的 orders 數
const ITEM_BATCH = 10_000; // 每次 INSERT 的 order_items 數

const USER_COUNT = 8;
const PRODUCT_COUNT = 10;

const PRODUCT_PRICES = [590, 1290, 2490, 1890, 890, 490, 1590, 3290, 1990, 890];

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const ADDRESSES = [
  "台北市信義區松仁路100號",
  "新北市板橋區文化路200號",
  "台中市西屯區台灣大道300號",
  "高雄市前鎮區中山二路400號",
  "台南市東區崇明路500號",
  "桃園市中壢區中央西路600號",
  "新竹市東區光復路700號",
  "台北市大安區忠孝東路四段800號",
  "新北市永和區中正路900號",
  "台中市北屯區文心路1000號",
  "高雄市左營區博愛二路1100號",
  "台南市安平區安平路1200號",
  "桃園市桃園區中正路1300號",
  "新竹縣竹北市光明六路1400號",
  "嘉義市西區中山路1500號",
];

// 訂單時間範圍：2024-01-01 ~ 2026-02-26 (約 2 年)
const START_TS = new Date("2024-01-01").getTime();
const END_TS = new Date("2026-02-26").getTime();

// ── 工具函式 ──────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(): Date {
  return new Date(START_TS + Math.random() * (END_TS - START_TS));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ── 主程式 ─────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "root",
    database: "whale_shop",
  });

  console.log("已連線到 whale_shop 資料庫");

  // 暫停外鍵檢查與 unique 檢查，大幅加速 INSERT
  await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
  await conn.execute("SET UNIQUE_CHECKS = 0");
  await conn.execute("SET autocommit = 0");

  // 取得目前最大 order id，避免衝突
  const [rows] = await conn.execute("SELECT COALESCE(MAX(id), 0) AS maxId FROM orders");
  const startOrderId = (rows as any)[0].maxId + 1;

  console.log(`起始 order id: ${startOrderId}`);
  console.log(`目標：${TOTAL_ORDERS.toLocaleString()} 筆訂單`);
  console.log("");

  const t0 = Date.now();
  let totalItems = 0;

  // 預先產生所有訂單和明細，分批寫入
  let orderValues: string[] = [];
  let itemValues: string[] = [];
  let currentOrderId = startOrderId;

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    const userId = randInt(1, USER_COUNT);
    const status = randPick(STATUSES);
    const address = randPick(ADDRESSES);
    const createdAt = formatDate(randDate());

    // 每筆訂單 1~5 個商品
    const itemCount = randInt(1, 5);
    let orderTotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const productId = randInt(1, PRODUCT_COUNT);
      const quantity = randInt(1, 3);
      const price = PRODUCT_PRICES[productId - 1];
      orderTotal += price * quantity;

      itemValues.push(
        `(${currentOrderId},${productId},${quantity},${price})`
      );

      // 批次寫入 order_items
      if (itemValues.length >= ITEM_BATCH) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${itemValues.join(",")}`
        );
        totalItems += itemValues.length;
        itemValues = [];
      }
    }

    orderValues.push(
      `(${currentOrderId},${userId},${orderTotal.toFixed(2)},'${status}','${address}','${createdAt}')`
    );

    currentOrderId++;

    // 批次寫入 orders
    if (orderValues.length >= ORDER_BATCH) {
      await conn.execute(
        `INSERT INTO orders (id, user_id, total, status, shipping_address, created_at) VALUES ${orderValues.join(",")}`
      );
      await conn.execute("COMMIT");

      const progress = ((i + 1) / TOTAL_ORDERS * 100).toFixed(1);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r  訂單: ${(i + 1).toLocaleString()} / ${TOTAL_ORDERS.toLocaleString()} (${progress}%) | ${elapsed}s`);

      orderValues = [];
    }
  }

  // 寫入剩餘的 orders
  if (orderValues.length > 0) {
    await conn.execute(
      `INSERT INTO orders (id, user_id, total, status, shipping_address, created_at) VALUES ${orderValues.join(",")}`
    );
  }

  // 寫入剩餘的 order_items
  if (itemValues.length > 0) {
    await conn.execute(
      `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${itemValues.join(",")}`
    );
    totalItems += itemValues.length;
  }

  await conn.execute("COMMIT");

  // 恢復檢查
  await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
  await conn.execute("SET UNIQUE_CHECKS = 1");
  await conn.execute("SET autocommit = 1");

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log("");
  console.log("========== 完成 ==========");
  console.log(`  訂單數: ${TOTAL_ORDERS.toLocaleString()}`);
  console.log(`  明細數: ${totalItems.toLocaleString()}`);
  console.log(`  耗時:   ${elapsed} 秒`);

  // 驗證
  const [orderCount] = await conn.execute("SELECT COUNT(*) AS cnt FROM orders");
  const [itemCount] = await conn.execute("SELECT COUNT(*) AS cnt FROM order_items");
  console.log("");
  console.log("========== 驗證 ==========");
  console.log(`  orders 總筆數:      ${(orderCount as any)[0].cnt.toLocaleString()}`);
  console.log(`  order_items 總筆數: ${(itemCount as any)[0].cnt.toLocaleString()}`);

  await conn.end();
}

main().catch((err) => {
  console.error("錯誤:", err);
  process.exit(1);
});
