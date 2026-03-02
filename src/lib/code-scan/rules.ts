export interface ScanFinding {
  severity: "critical" | "warning" | "info";
  category: "security" | "performance" | "quality";
  rule: string;
  message: string;
  line?: number;
  snippet?: string;
}

interface Rule {
  pattern: RegExp;
  severity: ScanFinding["severity"];
  category: ScanFinding["category"];
  rule: string;
  message: string;
}

const rules: Rule[] = [
  // === Security (critical) ===
  {
    pattern: /\beval\s*\(/,
    severity: "critical",
    category: "security",
    rule: "no-eval",
    message: "eval() 可被利用執行任意程式碼",
  },
  {
    pattern: /new\s+Function\s*\(/,
    severity: "critical",
    category: "security",
    rule: "no-new-function",
    message: "new Function() 等同 eval，可執行任意程式碼",
  },
  {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{[^}]*(?:__html\s*:\s*(?!['"`][^'"`]*['"`]))/,
    severity: "critical",
    category: "security",
    rule: "no-dangerous-html",
    message: "dangerouslySetInnerHTML 搭配動態內容可能導致 XSS",
  },
  {
    pattern: /\bdocument\.cookie\b/,
    severity: "critical",
    category: "security",
    rule: "no-document-cookie",
    message: "存取 document.cookie 可能洩漏敏感資料",
  },
  {
    pattern: /\blocalStorage\b/,
    severity: "critical",
    category: "security",
    rule: "no-localstorage",
    message: "iframe sandbox 中不應直接存取 localStorage",
  },
  {
    pattern: /window\.location\.href\s*=/,
    severity: "critical",
    category: "security",
    rule: "no-redirect",
    message: "window.location.href 重導向可能被用於釣魚攻擊",
  },
  {
    pattern: /window\.open\s*\(/,
    severity: "critical",
    category: "security",
    rule: "no-window-open",
    message: "window.open() 可開啟惡意網頁",
  },
  {
    pattern: /\bfetch\s*\(/,
    severity: "critical",
    category: "security",
    rule: "no-fetch",
    message: "fetch() 呼叫外部 URL 可能導致資料外洩",
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    severity: "critical",
    category: "security",
    rule: "no-xhr",
    message: "XMLHttpRequest 呼叫外部 URL 可能導致資料外洩",
  },
  {
    pattern: /parent\.postMessage\s*\(/,
    severity: "critical",
    category: "security",
    rule: "no-parent-postmessage",
    message: "parent.postMessage 嘗試逃逸 iframe sandbox",
  },

  // === Performance (warning) ===
  {
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*\)/,
    severity: "warning",
    category: "performance",
    rule: "useeffect-missing-deps",
    message: "useEffect 缺少 dependency array，每次 render 都會執行",
  },
  {
    pattern: /\bsetInterval\b/,
    severity: "warning",
    category: "performance",
    rule: "setinterval-cleanup",
    message: "setInterval 需在 cleanup 中清除，否則會造成記憶體洩漏",
  },
  {
    pattern: /\bsetTimeout\b/,
    severity: "warning",
    category: "performance",
    rule: "settimeout-cleanup",
    message: "setTimeout 建議在 cleanup 中清除以避免記憶體洩漏",
  },
  {
    pattern: /(?:return|=>)\s*(?:\([\s\S]*?)?\bnew\s+(?:Array|Object)\b/,
    severity: "warning",
    category: "performance",
    rule: "no-new-in-render",
    message: "在 render 中建立 new Array/Object 會導致不必要的重新渲染",
  },

  // === Quality (info) ===
  {
    pattern: /\bconsole\.log\b/,
    severity: "info",
    category: "quality",
    rule: "no-console-log",
    message: "殘留的 console.log 應在發布前移除",
  },
  {
    pattern: /\.then\s*\([^)]*\)\s*(?!\.catch)/,
    severity: "info",
    category: "quality",
    rule: "unhandled-promise",
    message: "Promise 缺少 .catch() 錯誤處理",
  },
];

export function runRuleScan(code: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const lines = code.split("\n");

  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        findings.push({
          severity: rule.severity,
          category: rule.category,
          rule: rule.rule,
          message: rule.message,
          line: i + 1,
          snippet: lines[i].trim().substring(0, 120),
        });
      }
    }
  }

  return findings;
}
