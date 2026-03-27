export interface ChangelogEntry {
  version: string;
  /** 一句話標題，兩邊共用 */
  title: string;
  /** What's New dialog 用：一段話總結這版有什麼新功能 */
  summary: string;
  /** Settings changelog 用：條列式項目 */
  items: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "v0.18.0",
    title: "工具自動儲存草稿",
    summary:
      "AI 幫你寫工具的時候，系統會自動建立草稿，不用等到部署才存。Notion 搜尋也變聰明了，不再找不到東西。",
    items: [
      "工具自動草稿：AI 產生程式碼時自動建立草稿，預覽階段就能完整使用所有功能",
      "Notion 搜尋大升級：新增 searchAll 跨所有資料庫搜尋，改用原生 filter API，不再漏找",
      "Notion 搜尋策略改善：同時搜尋資料庫頁面和獨立頁面，一次找齊",
    ],
  },
  {
    version: "v0.17.0",
    title: "工具也能用 AI 了",
    summary:
      "現在你做的工具可以呼叫 AI 來處理文字了！摘要、翻譯、資訊萃取、分類，全部內建，不用額外設定。",
    items: [
      "工具內建 AI 文字處理：摘要、翻譯、萃取、分類四種操作",
      "所有 AI 模型皆可選用，預設使用 Claude Haiku",
      "平台內建能力，所有工具直接可用，不需要選擇資料來源",
    ],
  },
  {
    version: "v0.16.0",
    title: "Vimeo 資料來源",
    summary:
      "現在可以在聊天室串接 Vimeo，查詢影片清單、資料夾、影片詳情，還能查看觀看分析。讓 AI 幫你整理影片表現！",
    items: [
      "新增 Vimeo 資料來源，支援查詢影片、資料夾、影片詳情",
      "支援 Vimeo Analytics：觀看次數、觀眾國家分布、裝置類型、嵌入網域等",
      "已發布的工具也能透過 bridge 存取 Vimeo 資料",
    ],
  },
  {
    version: "v0.15.0",
    title: "手機版大改版",
    summary:
      "用手機開 Falcon 不會再跑版了！側邊欄、首頁、聊天室、工具頁全部重新調整過，小螢幕上也能順暢使用。",
    items: [
      "手機版側邊欄改為 overlay 模式，不再擠壓內容空間",
      "新增手機版頂部導覽列，一鍵開啟側邊欄",
      "首頁分類頁籤支援水平捲動，不再被裁切",
      "聊天室預覽面板在手機上改為上下堆疊顯示",
      "工具列在手機上自動換行，不再溢出畫面",
      "所有頁面的間距與文字大小針對小螢幕最佳化",
    ],
  },
  {
    version: "v0.14.0",
    title: "對話更穩定了",
    summary:
      "之前聊太久會出現 413 錯誤，因為每次都把整段對話歷史送出去。現在改成由伺服器從資料庫載入歷史，你的訊息只傳新的那一則，再長的對話都不會爆了。",
    items: [
      "Chat API 改為 server 端從資料庫載入對話歷史，解決長對話 413 錯誤",
      "新增 appendMessages 機制，訊息直接在 server 端寫入資料庫",
      "移除客戶端 auto-save，減少不必要的 API 呼叫",
    ],
  },
  {
    version: "v0.13.1",
    title: "工具重新發布修正",
    summary:
      "之前編輯工具後重新發布會失敗，現在修好了。同一個對話再次發布會直接更新原本的工具，不會再出現錯誤。",
    items: ["修正工具重新發布時 unique constraint 錯誤"],
  },
  {
    version: "v0.13.0",
    title: "Skills 技能系統",
    summary:
      "想讓 AI 變身後端工程師、行銷顧問、或數據分析師？現在你可以建立自己的 Skill，定義 AI 的角色和行為，還能公開分享給其他人使用。",
    items: [
      "新增 Skill 系統：建立、編輯、刪除自定義 AI 技能",
      "在聊天工具列一鍵啟用 Skill，AI 會依照指定角色回應",
      "支援公開分享 Skill，瀏覽其他人建立的技能",
      "Skill 可綁定所需的資料來源，啟用時自動開啟",
    ],
  },
  {
    version: "v0.12.0",
    title: "深色模式登場",
    summary:
      "眼睛終於可以休息了！現在正式支援深色模式，而且會自動記住你的偏好。你也可以跟隨系統設定，白天亮、晚上暗，全自動。",
    items: [
      "新增深色模式，支援亮色 / 暗色 / 跟隨系統三種模式",
      "新增主題切換選項",
    ],
  },
  {
    version: "v0.11.0",
    title: "改善了工具預覽視窗",
    summary:
      "對話和預覽之間多了一條可以左右拖拉的分隔線，想看對話多一點、還是預覽大一點，自己拉就好。",
    items: ["對話與預覽面板之間新增可拖拉的分隔線，自由調整寬度"],
  },
  {
    version: "v0.10.0",
    title: "工具群組可見度",
    summary:
      "以前工具一發布，同群組的人全都看得到，想藏也藏不住。\n\n現在你可以親手挑選哪些群組能看到，終於不用擔心實驗性小工具被其他夥伴發現了。\n\n對了！現在 Meta Ads 可以看得更廣更深了！",
    items: [
      "工具新增群組可見度設定，部署時可指定 allowedGroups",
      "Meta Ads 支援 adset / ad 層級查詢",
    ],
  },
  {
    version: "v0.9.3",
    title: "資料庫掃描修復",
    summary: "資料庫掃描不會再莫名其妙掉線了，transaction 逾時的問題修好了。",
    items: ["修正資料庫掃描 transaction 逾時"],
  },
  {
    version: "v0.9.2",
    title: "對話 Token 修復",
    summary: "聊太久不會再爆炸了，token 超過 200k 限制的問題修好了。",
    items: ["修正對話 token 超過 200k 限制的問題"],
  },
  {
    version: "v0.9.1",
    title: "自訂送出快捷鍵",
    summary: "Enter 送出還是換行？現在你說了算。",
    items: ["可自訂訊息送出快捷鍵"],
  },
  {
    version: "v0.9.0",
    title: "更聰明的對話標題",
    summary:
      "對話標題終於會自己取名了，不再是一堆「新對話」。覺得 AI 取的名字不夠酷？點一下就能改。",
    items: ["標題下拉選單 + sidebar 重新命名改用 Dialog"],
  },
  {
    version: "v0.8.2",
    title: "重新整理了大語言模型清單",
    summary:
      "現在的太古老了，我們嘗試重新整理新的名單",
    items: ["現在的太古老了，我們嘗試重新整理新的名單 (Gemini 3.5 還在 Preview ，要再等等)"],
  },
  {
    version: "v0.8.1",
    title: "標題顯示修正",
    summary:
      "標題太長會把按鈕擠到外太空的問題修好了，現在最多 15 個字，乖乖待在該待的地方。",
    items: ["限制標題最長 15 字，修正溢出問題"],
  },
  {
    version: "v0.8.0",
    title: "更方便的管理對話",
    summary:
      "現在你可以直接在左側更好地管理對話，重新命名、刪除對話、加入星號。",
    items: ["對話列表支援管理對話，重新命名、刪除對話、加入星號"],
  },
  {
    version: "v0.7.0",
    title: "YouTube 整合",
    summary:
      "歡迎新來源 YouTube！直接問 Falcon 你的頻道數據，不用再自己爬後台。",
    items: ["YouTube 資料來源整合"],
  },
  {
    version: "v0.6.0",
    title: "外部資料庫",
    summary:
      "想直接問你自己的資料庫？現在可以了！接上 PostgreSQL 或 MySQL，Falcon 幫你查資料、寫報表，不用再自己敲 SQL。",
    items: [
      "支援連接外部 PostgreSQL 資料庫",
      "支援連接外部 MySQL 資料庫",
      "支援 REST API 資料來源",
    ],
  },
  {
    version: "v0.5.0",
    title: "網站數據系列",
    summary:
      "想知道網站流量怎麼樣？GA4 跟 Plausible 都接好了，直接問 Falcon 就能看到你的網站表現。",
    items: [
      "Google Analytics 4 (GA4) 資料來源整合",
      "Plausible Analytics 資料來源整合",
    ],
  },
  {
    version: "v0.4.0",
    title: "廣告數據系列",
    summary:
      "投廣告的人有福了！Meta Ads 數據直接串進來，成效、受眾、花費一問就有，不用再自己翻報表。",
    items: ["Meta Ads (Facebook / Instagram) 資料來源整合"],
  },
  {
    version: "v0.3.0",
    title: "團隊協作系列",
    summary:
      "把你們團隊常用的工具都接進來了！Notion 查文件、Slack 找訊息、Asana 看任務、GitHub 追 PR，通通問 Falcon 就好。",
    items: [
      "Notion 資料來源整合",
      "Slack 資料來源整合",
      "Asana 資料來源整合",
      "GitHub 資料來源整合",
    ],
  },
  {
    version: "v0.2.0",
    title: "Google 全家餐",
    summary:
      "一口氣把 Google 家族搬進來了！Sheets、Drive、Calendar、Gmail，你的 Google 資料現在都能直接問 Falcon。",
    items: [
      "Google Sheets 資料來源整合",
      "Google Drive 資料來源整合",
      "Google Calendar 資料來源整合",
      "Gmail 資料來源整合",
    ],
  },
  {
    version: "v0.1.0",
    title: "Falcon 正式上線",
    summary:
      "Falcon 來了！跟 AI 聊天、建立自己的小工具、逛逛別人做了什麼 - 你的企業瑞士刀來了！",
    items: ["AI 對話功能", "工具建立與部署", "Marketplace 工具市集"],
  },
];

export const CURRENT_VERSION = changelog[0].version;
