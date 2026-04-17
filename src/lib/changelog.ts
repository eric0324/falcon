export interface ChangelogEntry {
  version: string;
  /** 發布日期 YYYY-MM-DD */
  date: string;
  /** 一句話標題，兩邊共用 */
  title: string;
  /** What's New dialog 用：一段話總結這版有什麼新功能 */
  summary: string;
  /** Settings changelog 用：條列式項目 */
  items: string[];
  /** 是否在 What's New dialog 顯示，預設 true */
  showDialog?: boolean;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "v0.26.0",
    date: "2026-04-17",
    title: "AI 終於會畫圖了",
    summary:
      "接了 Google Imagen 4 和 OpenAI GPT-Image-1，現在可以跟 AI 說「畫一隻在打瞌睡的貓」，它真的會畫，丟一張照片叫它改也行。",
    items: [
      "新增圖片生成：文字生圖、上傳圖檔後請 AI 改圖",
      "兩家 provider 任你選（Imagen 4 / GPT-Image-1），預設不選，要畫再挑",
      "AI 會讀空氣調整比例和品質：講「16:9 海報」就橫式，講「高品質」就切高品質，沒提就用預設",
      "圖片鎖在 private S3 bucket，用 presigned URL 顯示，連結到期會自己重簽",
      "每張圖的費用自動入帳到 TokenUsage",
    ],
  },
  {
    version: "v0.25.1",
    date: "2026-04-17",
    title: "新增 Claude Opus 4.7 模型",
    summary:
      "模型選單新增 Claude Opus 4.7，與現有 Opus 4.6 並列，使用者可自行選擇。",
    items: [
      "新增：Claude Opus 4.7 模型，API 定價 $5/$25 per 1M tokens",
    ],
    showDialog: false,
  },
  {
    version: "v0.25.0",
    date: "2026-04-16",
    title: "從 Google Drive 匯入知識庫",
    summary:
      "知識庫支援從 Google Drive 匯入 Docs 與 Sheets。文件會自動切成知識點，試算表則每一列為一個知識點，方便用於 FAQ 與客服話術。",
    items: [
      "新增：知識庫詳情頁加入「從 Google Drive 匯入」按鈕",
      "新增：支援 Google Docs（自動 chunking）與 Google Sheets（每列一個知識點）",
      "新增：搜尋結果按最近修改倒序，顯示檔名、所在資料夾、最後修改時間",
      "新增：未連結 Google Drive 時，會引導使用者一鍵授權",
      "新增:「載入更多」按鈕方便瀏覽超過 25 筆的結果",
    ],
  },
  {
    version: "v0.24.3",
    date: "2026-04-16",
    title: "Notion 匯入體驗小改",
    summary:
      "Notion 匯入彈窗的搜尋結果現在會顯示所在資料夾、icon、「在 Notion 開啟」連結，同名頁面更容易區分。",
    items: [
      "改善：Notion 匯入彈窗放大，間距調整",
      "改善：搜尋結果按最近編輯倒序",
      "新增：每筆顯示 icon、所在資料夾",
      "新增：「在 Notion 開啟」連結",
      "新增：「載入更多」按鈕，可瀏覽超過 25 筆結果",
    ],
    showDialog: false,
  },
  {
    version: "v0.24.2",
    date: "2026-04-16",
    title: "修正引導 tour 與新功能公告同時出現",
    summary: "修正第一次進入時，引導 tour 跟新功能公告會同時跳出來打架的問題。",
    items: [
      "修正：引導 tour 自動開啟時，本次 page-load 不再顯示新功能公告，避免兩個彈窗重疊",
    ],
    showDialog: false,
  },
  {
    version: "v0.24.1",
    date: "2026-04-14",
    title: "修正工具無法下載檔案",
    summary: "修正工具在 preview 或執行時，按下載（例如匯出 CSV）沒有反應的問題。",
    items: [
      "修正：工具 iframe 放寬 sandbox 設定，允許觸發檔案下載與 window.open",
    ],
    showDialog: false,
  },
  {
    version: "v0.24.0",
    date: "2026-04-14",
    title: "新手引導 Tour",
    summary:
      "第一次用 Falcon 不知道怎麼開始？現在五大功能頁都有互動式引導，會直接指著實際按鈕帶你走一遍。",
    items: [
      "新增：首頁／對話／技能／工具／知識庫五頁的互動式引導 tour",
      "新增：首次進入該頁會自動跳 tour，之後隨時可點「？幫助」重新播放",
      "新增：每個 tour 結尾可一鍵前往下一個功能頁，繼續探索",
      "改善：新使用者第一次進站時，會先跑 tour，What's New 彈窗順延到之後再顯示",
    ],
  },
  {
    version: "v0.23.1",
    date: "2026-04-14",
    title: "修正使用者訊息換行顯示",
    summary: "修正聊天中使用者訊息的換行與空白會跑掉的問題。",
    items: [
      "修正：使用者訊息內的換行、空白原樣保留，不再被吃掉",
    ],
    showDialog: false,
  },
  {
    version: "v0.23.0",
    date: "2026-04-09",
    title: "網頁抓取",
    summary:
      "貼個網址，AI 就能幫你讀網頁內容！不管是看文章、抓產品資訊、還是比較不同網頁，直接問就好。",
    items: [
      "網頁抓取：AI 可以直接讀取網頁內容，回答你關於網頁的問題",
      "修正：工具使用 AI 處理文字時不再容易逾時",
      "修正：工具預覽時外部資料庫存取權限的問題",
    ],
  },
  {
    version: "v0.22.0",
    date: "2026-04-09",
    title: "智慧資料來源建議",
    summary:
      "不知道要開哪個資料來源？現在 AI 會自動判斷你的問題需要哪些資料來源，直接在對話中推薦，一鍵開啟後自動重新查詢。",
    items: [
      "智慧資料來源建議：AI 自動偵測並推薦需要的資料來源",
      "新增 Claude Opus 4.6 模型支援",
      "對話訊息一鍵複製：hover 訊息即可複製內容",
      "修正：Markdown 分隔線導致內容被截斷的問題",
    ],
  },
  {
    version: "v0.21.0",
    date: "2026-04-02",
    title: "文件撰寫模式",
    summary:
      "AI 現在能直接幫你撰寫 Markdown 文件，像是報告、企劃、信件，右側即時預覽並可下載。",
    items: [
      "文件模式：請 AI 寫報告/企劃/信件時，右側顯示 Markdown 預覽 + 下載按鈕",
      "改善：AI 思考中仍可輸入文字，不再鎖定輸入框",
    ],
  },
  {
    version: "v0.20.2",
    date: "2026-04-02",
    title: "Preview 全螢幕 + 收合",
    summary:
      "對話中的工具預覽面板新增全螢幕和收合功能，全螢幕讓你專注檢視工具效果，收合讓你有更多空間跟 AI 對話。",
    items: [
      "Preview 全螢幕：點擊放大按鈕，預覽撐滿整個畫面，按 ESC 或右上角按鈕退出",
      "Preview 收合：點擊收合按鈕，預覽縮到側邊，聊天區自動撐滿",
    ],
    showDialog: false,
  },
  {
    version: "v0.20.1",
    date: "2026-03-31",
    title: "Meta Ads 新增預算與影片指標",
    summary:
      "Meta Ads 查詢新增日預算、總預算和影片 25% 觀看次數欄位，方便分析廣告預算分配和影片成效。",
    items: [
      "Meta Ads：新增 daily_budget / lifetime_budget（日預算 / 總預算）",
      "Meta Ads：新增 video_p25_watched_actions（影片觀看達 25%）",
    ],
    showDialog: false,
  },
  {
    version: "v0.20.0",
    date: "2026-03-31",
    title: "知識庫上線",
    summary:
      "全新知識庫功能！上傳 PDF、Excel、CSV 文件，自動轉為知識點。在對話中選取知識庫即可進行 RAG 問答，AI 會根據知識庫內容回答並附上引用來源。",
    items: [
      "知識庫：建立知識庫，上傳文件自動解析為知識點",
      "知識點審核：人工審核後才會進行向量化，確保品質",
      "RAG 問答：在對話中選取知識庫，AI 根據知識點回答並附引用",
      "系統提示詞：每個知識庫可設定專屬提示詞，引導 AI 回答風格",
      "評價系統：使用者可對知識庫評分（1-5 星）+ 評論",
      "成員管理：管理員 / 貢獻者 / 檢視者三種角色",
    ],
  },
  {
    version: "v0.19.1",
    date: "2026-03-31",
    title: "編輯工具體驗修正",
    summary:
      "修正編輯工具時會開啟新對話的問題，現在會正確回到原始對話繼續編輯。如果原始對話曾被刪除，也會自動還原。",
    items: [
      "修正：編輯工具現在會回到原始對話，不再開啟新對話",
      "修正：已刪除的工具對話在編輯時自動還原，Sidebar 即時更新",
    ],
    showDialog: false,
  },
  {
    version: "v0.19.0",
    date: "2026-03-27",
    title: "工具資料庫上線",
    summary:
      "工具終於能存資料了！做表單、記錄、清單類的工具，資料會自動保存到資料庫，重新整理也不會消失。",
    items: [
      "工具資料庫：工具可以建立自己的資料表，支援新增、查詢、修改、刪除",
      "個人/共用資料：預設全部人共用資料，也可以切換為只看自己的資料",
      "資料表檢視：在工具詳情頁可以查看資料表內容，支援分頁瀏覽",
    ],
  },
  {
    version: "v0.18.0",
    date: "2026-03-27",
    title: "工具自動儲存草稿",
    summary:
      "AI 幫你寫工具的時候，系統會自動建立草稿，不用等到部署才存。Notion 搜尋也變聰明了，不再找不到東西。",
    items: [
      "工具自動草稿：AI 產生程式碼時自動建立草稿，預覽階段就能完整使用所有功能",
      "Notion 搜尋改善：新增跨所有資料庫搜尋，同時搜尋資料庫頁面和獨立頁面",
    ],
  },
  {
    version: "v0.17.0",
    date: "2026-03-26",
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
    date: "2026-03-24",
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
    date: "2026-03-24",
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
    date: "2026-03-20",
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
    date: "2026-03-20",
    title: "工具重新發布修正",
    summary:
      "之前編輯工具後重新發布會失敗，現在修好了。同一個對話再次發布會直接更新原本的工具，不會再出現錯誤。",
    items: ["修正工具重新發布時 unique constraint 錯誤"],
  },
  {
    version: "v0.13.0",
    date: "2026-03-20",
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
    date: "2026-03-09",
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
    date: "2026-03-09",
    title: "改善了工具預覽視窗",
    summary:
      "對話和預覽之間多了一條可以左右拖拉的分隔線，想看對話多一點、還是預覽大一點，自己拉就好。",
    items: ["對話與預覽面板之間新增可拖拉的分隔線，自由調整寬度"],
  },
  {
    version: "v0.10.0",
    date: "2026-03-09",
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
    date: "2026-03-09",
    title: "資料庫掃描修復",
    summary: "資料庫掃描不會再莫名其妙掉線了，transaction 逾時的問題修好了。",
    items: ["修正資料庫掃描 transaction 逾時"],
  },
  {
    version: "v0.9.2",
    date: "2026-03-09",
    title: "對話 Token 修復",
    summary: "聊太久不會再爆炸了，token 超過 200k 限制的問題修好了。",
    items: ["修正對話 token 超過 200k 限制的問題"],
  },
  {
    version: "v0.9.1",
    date: "2026-03-03",
    title: "自訂送出快捷鍵",
    summary: "Enter 送出還是換行？現在你說了算。",
    items: ["可自訂訊息送出快捷鍵"],
  },
  {
    version: "v0.9.0",
    date: "2026-03-05",
    title: "更聰明的對話標題",
    summary:
      "對話標題終於會自己取名了，不再是一堆「新對話」。覺得 AI 取的名字不夠酷？點一下就能改。",
    items: ["標題下拉選單 + sidebar 重新命名改用 Dialog"],
  },
  {
    version: "v0.8.2",
    date: "2026-03-09",
    title: "重新整理了大語言模型清單",
    summary:
      "現在的太古老了，我們嘗試重新整理新的名單",
    items: ["現在的太古老了，我們嘗試重新整理新的名單 (Gemini 3.5 還在 Preview ，要再等等)"],
  },
  {
    version: "v0.8.1",
    date: "2026-03-05",
    title: "標題顯示修正",
    summary:
      "標題太長會把按鈕擠到外太空的問題修好了，現在最多 15 個字，乖乖待在該待的地方。",
    items: ["限制標題最長 15 字，修正溢出問題"],
  },
  {
    version: "v0.8.0",
    date: "2026-03-05",
    title: "更方便的管理對話",
    summary:
      "現在你可以直接在左側更好地管理對話，重新命名、刪除對話、加入星號。",
    items: ["對話列表支援管理對話，重新命名、刪除對話、加入星號"],
  },
  {
    version: "v0.7.0",
    date: "2026-03-03",
    title: "YouTube 整合",
    summary:
      "歡迎新來源 YouTube！直接問 Falcon 你的頻道數據，不用再自己爬後台。",
    items: ["YouTube 資料來源整合"],
  },
  {
    version: "v0.6.0",
    date: "2026-02-05",
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
    date: "2026-02-05",
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
    date: "2026-02-05",
    title: "廣告數據系列",
    summary:
      "投廣告的人有福了！Meta Ads 數據直接串進來，成效、受眾、花費一問就有，不用再自己翻報表。",
    items: ["Meta Ads (Facebook / Instagram) 資料來源整合"],
  },
  {
    version: "v0.3.0",
    date: "2026-02-05",
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
    date: "2026-02-05",
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
    date: "2026-01-20",
    title: "Falcon 正式上線",
    summary:
      "Falcon 來了！跟 AI 聊天、建立自己的小工具、逛逛別人做了什麼 - 你的企業瑞士刀來了！",
    items: ["AI 對話功能", "工具建立與部署", "Marketplace 工具市集"],
  },
];

export const CURRENT_VERSION = changelog[0].version;
