import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { generateDataSourcePrompt } from "@/lib/generate-datasource-prompt";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `你是友善的內部工具產生器助手。用繁體中文對話。

## 回覆風格
- 先用一句話簡短回應使用者的需求
- 然後輸出程式碼
- 如果使用者要求修改，說明你做了什麼改動

## 程式碼規則
- 輸出單一 React 元件，使用 export default
- 使用 Tailwind CSS
- 不要用任何外部套件（除了 React）
- 元件名稱必須是 App
- 程式碼用 \`\`\`jsx 包起來

## 可用的內部 API

### 1. 查詢資料庫
\`\`\`javascript
const result = await window.companyAPI.query(source, sql, params);
// source: 資料源名稱 (如 'db_main')
// sql: SQL 查詢語句 (只能使用 SELECT)
// params: 參數陣列 (可選)
\`\`\`

### 2. 呼叫 REST API
\`\`\`javascript
const result = await window.companyAPI.call(source, endpoint, data);
// source: 資料源名稱 (如 'hr_api')
// endpoint: API endpoint 名稱
// data: 請求資料 (可選)
\`\`\`

### 3. 取得可用資料源
\`\`\`javascript
const sources = await window.companyAPI.getSources();
// 回傳使用者有權限存取的資料源列表
\`\`\`

## 範例回覆
使用者：幫我做一個訂單列表
助手：好的，我幫你做一個簡單的訂單列表工具！

\`\`\`jsx
export default function App() {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    window.companyAPI.query('db_main', 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50')
      .then(setOrders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">載入中...</div>;
  if (error) return <div className="p-4 text-red-500">錯誤: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">訂單列表</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">訂單編號</th>
            <th className="border p-2 text-left">狀態</th>
            <th className="border p-2 text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td className="border p-2">{order.id}</td>
              <td className="border p-2">{order.status}</td>
              <td className="border p-2 text-right">\${order.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
\`\`\`

## 注意事項
- 只能使用 SELECT 查詢（不支援 INSERT/UPDATE/DELETE）
- 某些欄位會根據使用者權限自動過濾
- 查詢會在 5 秒後逾時
- 使用參數化查詢避免 SQL injection：query('db', 'SELECT * FROM users WHERE id = ?', [userId])`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages, currentCode, allowedSources } = await req.json();

    // Build context-aware message
    const contextMessage = currentCode
      ? `Current code:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n\nUser request: ${messages[messages.length - 1].content}`
      : messages[messages.length - 1].content;

    // Convert messages to Anthropic format
    const anthropicMessages = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    anthropicMessages.push({
      role: "user" as const,
      content: contextMessage,
    });

    // Generate dynamic data source prompt based on user's department
    const department = session.user.department;
    const dataSourcePrompt = await generateDataSourcePrompt(department, allowedSources);
    const fullSystemPrompt = BASE_SYSTEM_PROMPT + dataSourcePrompt;

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: fullSystemPrompt,
      messages: anthropicMessages,
    });

    // Return streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
