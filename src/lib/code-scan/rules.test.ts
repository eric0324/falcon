import { describe, it, expect } from "vitest";
import { runRuleScan, type ScanFinding } from "./rules";

function findByRule(findings: ScanFinding[], rule: string) {
  return findings.filter((f) => f.rule === rule);
}

describe("runRuleScan", () => {
  // ========== Security (critical) ==========

  describe("security rules", () => {
    it("flags eval()", () => {
      const findings = runRuleScan('const result = eval("1+1");');
      const matches = findByRule(findings, "no-eval");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
      expect(matches[0].category).toBe("security");
      expect(matches[0].line).toBe(1);
    });

    it("flags new Function()", () => {
      const findings = runRuleScan('const fn = new Function("return 1");');
      const matches = findByRule(findings, "no-new-function");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags dangerouslySetInnerHTML with dynamic content", () => {
      const code = '<div dangerouslySetInnerHTML={{ __html: userInput }} />';
      const findings = runRuleScan(code);
      const matches = findByRule(findings, "no-dangerous-html");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags document.cookie", () => {
      const findings = runRuleScan("const c = document.cookie;");
      const matches = findByRule(findings, "no-document-cookie");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags localStorage", () => {
      const findings = runRuleScan('localStorage.setItem("key", "val");');
      const matches = findByRule(findings, "no-localstorage");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags window.location.href redirect", () => {
      const findings = runRuleScan('window.location.href = "http://evil.com";');
      const matches = findByRule(findings, "no-redirect");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags window.open()", () => {
      const findings = runRuleScan('window.open("http://evil.com");');
      const matches = findByRule(findings, "no-window-open");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags fetch()", () => {
      const findings = runRuleScan('fetch("https://api.example.com/data");');
      const matches = findByRule(findings, "no-fetch");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags XMLHttpRequest", () => {
      const findings = runRuleScan("const xhr = new XMLHttpRequest();");
      const matches = findByRule(findings, "no-xhr");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });

    it("flags parent.postMessage()", () => {
      const findings = runRuleScan('parent.postMessage("escape", "*");');
      const matches = findByRule(findings, "no-parent-postmessage");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("critical");
    });
  });

  // ========== Performance (warning) ==========

  describe("performance rules", () => {
    it("flags useEffect without dependency array", () => {
      const code = "useEffect(() => { doSomething() })";
      const findings = runRuleScan(code);
      const matches = findByRule(findings, "useeffect-missing-deps");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("warning");
      expect(matches[0].category).toBe("performance");
    });

    it("does not flag useEffect with dependency array", () => {
      const code = "useEffect(() => { doSomething() }, [dep])";
      const findings = runRuleScan(code);
      const matches = findByRule(findings, "useeffect-missing-deps");
      expect(matches).toHaveLength(0);
    });

    it("flags setInterval", () => {
      const findings = runRuleScan("setInterval(() => tick(), 1000);");
      const matches = findByRule(findings, "setinterval-cleanup");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("warning");
    });

    it("flags setTimeout", () => {
      const findings = runRuleScan("setTimeout(() => run(), 500);");
      const matches = findByRule(findings, "settimeout-cleanup");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("warning");
    });
  });

  // ========== Quality (info) ==========

  describe("quality rules", () => {
    it("flags console.log", () => {
      const findings = runRuleScan('console.log("debug");');
      const matches = findByRule(findings, "no-console-log");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("info");
      expect(matches[0].category).toBe("quality");
    });

    it("flags unhandled promise (.then without .catch)", () => {
      const code = 'getData().then(result => setData(result))';
      const findings = runRuleScan(code);
      const matches = findByRule(findings, "unhandled-promise");
      expect(matches).toHaveLength(1);
      expect(matches[0].severity).toBe("info");
    });
  });

  // ========== Clean code ==========

  describe("clean code", () => {
    it("returns empty findings for safe code", () => {
      const code = `
function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}`;
      const findings = runRuleScan(code);
      expect(findings).toHaveLength(0);
    });
  });

  // ========== Line numbers & snippets ==========

  describe("line tracking", () => {
    it("reports correct line numbers for multi-line code", () => {
      const code = [
        "function App() {",
        "  const x = 1;",
        '  eval("danger");',
        "  return <div />;",
        "}",
      ].join("\n");

      const findings = runRuleScan(code);
      const match = findByRule(findings, "no-eval")[0];
      expect(match.line).toBe(3);
      expect(match.snippet).toContain("eval");
    });

    it("detects multiple issues across lines", () => {
      const code = [
        'eval("a");',
        'console.log("b");',
        'fetch("/api");',
      ].join("\n");

      const findings = runRuleScan(code);
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });

    it("truncates long snippets", () => {
      const longLine = `eval("${"x".repeat(200)}");`;
      const findings = runRuleScan(longLine);
      const match = findByRule(findings, "no-eval")[0];
      expect(match.snippet!.length).toBeLessThanOrEqual(120);
    });
  });
});
