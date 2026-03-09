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
    version: "v0.1.3",
    title: "工具群組可見度",
    summary:
      "以前工具一發布，同群組的人全都看得到，想藏也藏不住。現在你可以親手挑選哪些群組能看到，終於不用擔心實驗性小工具被其他夥伴發現了。\n\n對了！現在 Meta Ads 可以看得更廣更深了！",
    items: [
      "工具新增群組可見度設定，部署時可指定 allowedGroups",
      "Meta Ads 支援 adset / ad 層級查詢",
      "修正對話 token 超過 200k 限制的問題",
      "修正資料庫掃描 transaction 逾時",
    ],
  },
  {
    version: "v0.1.2",
    title: "更聰明的對話標題",
    summary:
      "對話標題終於會自己取名了，不再是一堆「新對話」。覺得 AI 取的名字不夠酷？點一下就能改。",
    items: [
      "標題下拉選單 + sidebar 重新命名改用 Dialog",
      "限制標題最長 15 字，修正溢出問題",
    ],
  },
  {
    version: "v0.1.1",
    title: "YouTube 整合",
    summary:
      "歡迎新來源 YouTube ！直接問 Falcon 你的頻道數據，不用再自己爬後台。另外，Enter 送出還是換行？現在你說了算。",
    items: ["YouTube 資料來源整合", "可自訂訊息送出快捷鍵"],
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
