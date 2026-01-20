#!/bin/sh
# 設定測試資料源和權限

echo "等待 MySQL 啟動..."
sleep 5

echo "新增 db_main 資料源..."
bunx tsx scripts/datasource.ts add \
  --name db_main \
  --display-name "鯨魚購物資料庫" \
  --description "公司主要營運資料 (MySQL)" \
  --type mysql \
  --host mysql_test \
  --port 3306 \
  --database whale_shop \
  --user readonly \
  --password readonly123 \
  --global-blocked-columns password,personal_id,cost

echo ""
echo "設定部門權限..."

# 客服部門 - 可看 users, orders, products，但不能看 phone
bunx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department 客服 \
  --read-tables users,orders,order_items,products \
  --read-blocked-columns phone

# 行銷部門 - 可看 users, orders, products，但不能看 phone, email
bunx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department 行銷 \
  --read-tables users,orders,order_items,products \
  --read-blocked-columns phone,email

# 財務部門 - 可看所有表
bunx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department 財務 \
  --read-tables users,orders,order_items,products,salaries,expenses

# 預設權限 (*) - 只能看 products
bunx tsx scripts/datasource.ts add-permission \
  --source db_main \
  --department "*" \
  --read-tables products

echo ""
echo "查看資料源設定..."
bunx tsx scripts/datasource.ts show db_main

echo ""
echo "✓ 設定完成！"
echo ""
echo "測試情境："
echo "  - 客服部門：可查 users, orders, products (但 phone 會被過濾)"
echo "  - 行銷部門：可查 users, orders, products (但 phone, email 會被過濾)"
echo "  - 財務部門：可查所有表包含 salaries"
echo "  - 其他部門：只能查 products"
