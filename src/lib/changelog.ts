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
