import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { streamText } from "ai";
import { models, ModelId, defaultModel } from "@/lib/ai/models";
import { studioTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

interface FileData {
  name: string;
  type: string;
  base64: string;
}

function buildMessageContent(
  content: string,
  files?: FileData[]
): string | Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> {
  if (!files || files.length === 0) {
    return content;
  }

  const parts: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> = [];

  // Add images first
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      parts.push({
        type: "image",
        image: file.base64,
        mimeType: file.type,
      });
    }
  }

  // Add text files as context
  const textFiles = files.filter((f) => !f.type.startsWith("image/"));
  let textContent = content;
  if (textFiles.length > 0) {
    const fileContext = textFiles
      .map((f) => {
        try {
          return `[檔案: ${f.name}]\n${Buffer.from(f.base64, 'base64').toString('utf-8')}`;
        } catch {
          return `[檔案: ${f.name}] (無法解析)`;
        }
      })
      .join("\n\n");
    textContent = `${content}\n\n附件內容：\n${fileContext}`;
  }

  parts.push({ type: "text", text: textContent });

  return parts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoreMessage = any;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { messages, model, files } = await req.json();

    // Use specified model or default
    const selectedModel = models[(model as ModelId) || defaultModel];

    // Process messages to include files in the last user message
    const processedMessages: CoreMessage[] = messages.map((m: { role: string; content: string }, index: number) => {
      const isLastUserMessage = index === messages.length - 1 && m.role === "user";
      return {
        role: m.role as "user" | "assistant",
        content: isLastUserMessage ? buildMessageContent(m.content, files) : m.content,
      };
    });

    // Create streaming response with tool loop
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const MAX_STEPS = 10;
        const currentMessages = [...processedMessages];
        let step = 0;

        while (step < MAX_STEPS) {
          step++;
          console.log(`[Chat API] Step ${step}`);

          const result = streamText({
            model: selectedModel,
            system: SYSTEM_PROMPT,
            messages: currentMessages,
            tools: studioTools,
          });

          let hasToolCalls = false;
          const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
          const toolResults: Array<{ toolCallId: string; result: unknown }> = [];
          for await (const part of result.fullStream) {
            let line = "";

            switch (part.type) {
              case "text-delta":
                line = `0:${JSON.stringify(part.text)}\n`;
                break;
              case "tool-call":
                hasToolCalls = true;
                toolCalls.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                });
                line = `9:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                })}\n`;
                break;
              case "tool-result":
                toolResults.push({
                  toolCallId: part.toolCallId,
                  result: part.output,
                });
                line = `a:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  result: part.output,
                })}\n`;
                break;
              case "error":
                line = `e:${JSON.stringify({ error: String(part.error) })}\n`;
                break;
            }

            if (line) {
              controller.enqueue(encoder.encode(line));
            }
          }

          // If no tool calls, we're done
          if (!hasToolCalls) {
            console.log(`[Chat API] No tool calls, finishing`);
            break;
          }

          // Add assistant message with tool calls to conversation
          currentMessages.push({
            role: "assistant",
            content: toolCalls.map(tc => ({
              type: "tool-call",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.args,
            })),
          });

          // Add tool message with all results
          currentMessages.push({
            role: "tool",
            content: toolResults.map(tr => {
              const toolCall = toolCalls.find(tc => tc.toolCallId === tr.toolCallId);
              return {
                type: "tool-result",
                toolCallId: tr.toolCallId,
                toolName: toolCall?.toolName || "",
                output: {
                  type: "text",
                  value: JSON.stringify(tr.result),
                },
              };
            }),
          });

          console.log(`[Chat API] Tool calls processed, continuing loop`);
          console.log(`[Chat API] Current messages:`, JSON.stringify(currentMessages, null, 2));
        }

        controller.close();
      },
    });

    return new Response(stream, {
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
