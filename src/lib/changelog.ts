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
    version: "v0.29.0",
    date: "2026-05-05",
    title: "AI 開始記得你",
    summary:
      "對話中說「記住⋯」「以後都⋯」「我喜歡⋯」這類話，Falcon 會自動記下偏好、規則與背景，下次新對話會自動帶入相關記憶，不用每次重交代一次。記憶可以到使用者選單的「我的記憶」管理。",
    items: [
      "新 Memory / SuggestedMemory 表，記憶分四類：偏好、背景、規則、事實",
      "主動擷取：偵測到關鍵字後 Haiku 結構化存成記憶，stream 即時回 toast「已記住」",
      "被動擷取：對話結束 fire-and-forget 跑 Haiku 找候選記憶（不阻塞回應）",
      "召回：每則新訊息做 embedding 找最相關 5 條塞進 system prompt，總長上限 2000 字元",
      "管理頁 /memory：按類型分組顯示，可編輯 / 刪除",
      "config.ts 加 process.env fallback，避免 dev 環境 Voyage API key 沒寫進 SystemConfig 時 embedding 靜默失敗",
    ],
    showDialog: true,
  },
  {
    version: "v0.28.0",
    date: "2026-05-04",
    title: "太好了！可以收藏喜歡的工具了",
    summary:
      "全站工具卡片右上多了愛心按鈕，點一下就能收藏。同時，首頁也多一個「我的收藏」tab ，可以更快速的找到你所愛的工具",
    items: [
      "新 ToolFavorite 表，per-user-per-tool 唯一、cascade delete",
      "首頁、category、search、leaderboard 一次 query 收藏 id set 給整頁卡片",
    ],
    showDialog: true,
  },
  {
    version: "v0.27.6",
    date: "2026-04-24",
    title: "首頁 tour 第一步教你念 Falcon",
    summary:
      "首頁導覽的第一步新增發音教學：顯示 Falcon 的音標，點喇叭按鈕可播放發音，想聽幾次都行。",
    items: [
      "marketplace tour 第一步改為 PronunciationWelcome 元件",
      "音檔放在 public/audio/falcon.mp3，按鈕每次點都從頭播",
      "i18n 新增 onboarding.marketplace.phonetic 與 playPronunciation",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.5",
    date: "2026-04-22",
    title: "修掉會把對話卡死的 Edit Code",
    summary:
      "某些對話在點 Edit Code 後會卡在 loading、或送訊息直接報錯無法繼續。原因是舊的失敗回合在 DB 留下沒完成的 tool call 和空白訊息，下一輪送到 Anthropic 就被擋。現在讀取歷史時會自動修復這些殘缺紀錄，失敗回合也不再寫進 DB。",
    items: [
      "getMessages 讀取時把未完成的 tool call 治癒成 completed + stub result，前端不再永久轉圈",
      "讀取歷史時空字串內容補 placeholder，避免 Anthropic 回 text content blocks must be non-empty",
      "串流整輪沒產出（無文字、無 tool call）時略過 persist，不再污染對話歷史",
      "串流每步結束補齊缺漏的 tool result，覆蓋 tool-error、maxOutputTokens 截斷、stream 中斷等路徑",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.4",
    date: "2026-04-21",
    title: "簡單問題自動改用 Haiku 回答",
    summary:
      "你選了 Opus / Sonnet 但只問了一句簡單問題時，系統會自動改用 Haiku 回應、在回覆下方標示「自動改用 Haiku」。牽涉到寫程式、分析報告、附檔或對話中已呼叫過工具的訊息，還是會用你選的模型。",
    items: [
      "新增 routeModel() 啟發式：訊息 <200 字、無附件、無工具歷史、無程式/分析/設計/圖片類關鍵字時降級 Haiku",
      "使用者選 Haiku 或非 Anthropic 模型時完全不介入",
      "stream i: 事件帶 actualModel / selectedModel，前端顯示自動改用標籤",
      "費用與 TokenUsage 依實際模型計算",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.3",
    date: "2026-04-20",
    title: "主聊天輸出 token 防呆",
    summary:
      "為主聊天 streamText 加上 per-model 的輸出 token 上限（Haiku / GPT-5 系列 4096、其他 8192），避免 AI 罕見的 runaway 生成把成本燒穿。觸頂時會 warn log 方便觀察。",
    items: [
      "新增 MODEL_MAX_OUTPUT_TOKENS 表與 getDefaultMaxOutputTokens() helper",
      "主 streamText 與工具用盡 fallback streamText 都套用上限",
      'finishReason === "length" 時 console.warn 記錄 step / model / cap',
      "generateConversationTitle 既有 30 tokens 上限不變",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.2",
    date: "2026-04-20",
    title: "大檔案附件不再悶吃 token",
    summary:
      "上傳文本附件時先估算 token：超過 32K 直接擋下並提示；介於 8K ~ 32K 預設自動截斷並在檔案標籤顯示 token 數，點一下可切換「截斷／完整送出」。圖片與二進位附件行為不變。",
    items: [
      "新增 WARN_TOKENS=8_000、HARD_TOKENS=32_000 雙層閾值",
      "CSV 走 csv-smart 截斷（保留 header + 前段 rows），其他文本走 head 截斷",
      "截斷後 prompt 尾端附註「原始 X 行 / Y 字元，保留前 Z 行」",
      "HARD 超標後端直接回 400 attachment_too_large，前端 toast 拒絕",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.1",
    date: "2026-04-20",
    title: "三家 provider prompt caching 折扣全到位",
    summary:
      "Claude 模型對 system prompt 與 tool 定義加上顯式 cache 標記；OpenAI 與 Gemini 走 SDK 自動 / implicit caching。三家的 cache 命中都正確折算到費用統計，避免高估。",
    items: [
      "Claude：system prompt 與最後一個 tool 加 cacheControl: ephemeral；cacheRead 以 0.1x、cacheWrite 以 1.25x 計",
      "OpenAI：自動 caching（prompt ≥ 1024 tokens）；cacheRead 以 0.5x 計",
      "Gemini：implicit caching（2.5 系列預設）；cacheRead 以 0.25x 計",
      "TokenUsage log 新增 noCache / cacheRead / cacheWrite 欄位，便於觀察命中率",
    ],
    showDialog: false,
  },
  {
    version: "v0.27.0",
    date: "2026-04-17",
    title: "不怕 AI 蓋掉你的工具了",
    summary:
      "跟 AI 說「改一下這個按鈕的顏色」，結果整個工具被重寫、原本的功能全消失？現在不會了。AI 會用新的 editCode 工具只動你提到的那段，其他部分原封不動；萬一真的被覆蓋，Preview 旁多了「版本歷史」一鍵還原，回到 20 步內的任一版。",
    items: [
      "新增 editCode：AI 做小改時只局部替換，不再整個檔案重生",
      "每次程式碼更新前自動快照舊版，每個工具保留最近 20 筆",
      "Preview 右上新增「版本歷史」icon，按下看紀錄，點「還原」就能切回該版（還原前會先存當前版，救得回來也後悔得了）",
      "AI 改完程式碼、按還原後 Preview 立即同步，不用重新整理",
      "強化 AI 指引：若真的要用 updateCode 整份重寫，必須逐字保留你沒提到的既有功能",
    ],
  },
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
    items: ["新增：Claude Opus 4.7 模型，API 定價 $5/$25 per 1M tokens"],
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
    summary:
      "修正工具在 preview 或執行時，按下載（例如匯出 CSV）沒有反應的問題。",
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
    items: ["修正：使用者訊息內的換行、空白原樣保留，不再被吃掉"],
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
    summary: "現在的太古老了，我們嘗試重新整理新的名單",
    items: [
      "現在的太古老了，我們嘗試重新整理新的名單 (Gemini 3.5 還在 Preview ，要再等等)",
    ],
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
