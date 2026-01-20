-- 鯨魚購物 (Whale Shop) 測試資料庫
-- 用於測試 API Bridge 功能

-- 使用者表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) DEFAULT 'hashed_password',
  personal_id VARCHAR(20),
  department VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 產品表
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  stock INT DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 訂單表
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 訂單明細表
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 員工薪資表 (敏感資料，只有財務部門可看)
CREATE TABLE salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL,
  bonus DECIMAL(10, 2) DEFAULT 0,
  pay_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 費用報銷表
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========== 插入測試資料 ==========

-- 使用者
INSERT INTO users (name, email, phone, department) VALUES
('小美', 'xiaomei@whale.shop', '0912-345-678', '客服'),
('阿明', 'aming@whale.shop', '0923-456-789', '行銷'),
('小華', 'xiaohua@whale.shop', '0934-567-890', '財務'),
('大偉', 'dawei@whale.shop', '0945-678-901', '工程'),
('小芳', 'xiaofang@whale.shop', '0956-789-012', '客服'),
('志明', 'zhiming@whale.shop', '0967-890-123', '行銷'),
('春嬌', 'chunjiao@whale.shop', '0978-901-234', '財務'),
('阿傑', 'ajie@whale.shop', '0989-012-345', '工程');

-- 產品
INSERT INTO products (name, description, price, cost, stock, category) VALUES
('經典白T', '100%純棉舒適白色T恤', 590, 180, 150, '服飾'),
('牛仔褲', '修身版型丹寧牛仔褲', 1290, 420, 80, '服飾'),
('運動鞋', '輕量透氣慢跑鞋', 2490, 890, 60, '鞋類'),
('後背包', '大容量防水後背包', 1890, 650, 45, '配件'),
('太陽眼鏡', 'UV400偏光太陽眼鏡', 890, 280, 120, '配件'),
('棒球帽', '可調式棒球帽', 490, 150, 200, '配件'),
('皮夾', '真皮短夾', 1590, 520, 55, '配件'),
('手錶', '簡約石英錶', 3290, 1200, 30, '配件'),
('藍牙耳機', '真無線藍牙耳機', 1990, 680, 75, '3C'),
('行動電源', '10000mAh快充行動電源', 890, 320, 100, '3C');

-- 訂單
INSERT INTO orders (user_id, total, status, shipping_address) VALUES
(1, 2080, 'delivered', '台北市信義區松仁路100號'),
(2, 4380, 'shipped', '新北市板橋區文化路200號'),
(3, 1890, 'confirmed', '台中市西屯區台灣大道300號'),
(4, 5780, 'delivered', '高雄市前鎮區中山二路400號'),
(5, 890, 'pending', '台南市東區崇明路500號'),
(1, 3780, 'delivered', '台北市信義區松仁路100號'),
(2, 1290, 'cancelled', '新北市板橋區文化路200號'),
(6, 2490, 'shipped', '桃園市中壢區中央西路600號');

-- 訂單明細
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 2, 590),
(1, 6, 1, 490),
(2, 3, 1, 2490),
(2, 4, 1, 1890),
(3, 4, 1, 1890),
(4, 8, 1, 3290),
(4, 3, 1, 2490),
(5, 5, 1, 890),
(6, 2, 2, 1290),
(6, 9, 1, 1990),
(7, 2, 1, 1290),
(8, 3, 1, 2490);

-- 薪資 (敏感資料)
INSERT INTO salaries (user_id, base_salary, bonus, pay_date) VALUES
(1, 38000, 5000, '2024-01-05'),
(2, 42000, 8000, '2024-01-05'),
(3, 55000, 10000, '2024-01-05'),
(4, 65000, 15000, '2024-01-05'),
(5, 36000, 3000, '2024-01-05'),
(6, 40000, 6000, '2024-01-05'),
(7, 52000, 8000, '2024-01-05'),
(8, 62000, 12000, '2024-01-05');

-- 費用報銷
INSERT INTO expenses (user_id, amount, category, description, status) VALUES
(1, 350, '交通', '拜訪客戶計程車費', 'approved'),
(2, 1200, '餐飲', '客戶餐敘', 'approved'),
(3, 580, '文具', '辦公室文具採購', 'approved'),
(4, 2500, '設備', '外接螢幕', 'pending'),
(5, 180, '交通', '外出洽公捷運費', 'approved'),
(6, 3500, '行銷', '廣告素材製作', 'pending'),
(7, 450, '餐飲', '部門聚餐', 'rejected'),
(8, 890, '書籍', '技術書籍', 'approved');

-- 給 readonly 使用者權限
GRANT SELECT ON whale_shop.* TO 'readonly'@'%';
FLUSH PRIVILEGES;
