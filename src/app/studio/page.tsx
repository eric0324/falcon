"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewPanel } from "@/components/preview-panel";
import { DeployDialog } from "@/components/deploy-dialog";
import { ChatMessage } from "@/components/chat-message";
import { useToast } from "@/components/ui/use-toast";
import { ToolCallDisplay, ToolCall } from "@/components/tool-call-display";
import { ModelSelector } from "@/components/model-selector";
import { FileUpload, FileList, UploadedFile } from "@/components/file-upload";
import { DataSourceSelector } from "@/components/data-source-selector";
import { ModelId, defaultModel } from "@/lib/ai/models";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolDescription, setToolDescription] = useState("");
  const [toolCategory, setToolCategory] = useState("");
  const [toolTags, setToolTags] = useState<string[]>([]);
  const [toolVisibility, setToolVisibility] = useState("PRIVATE");

  // Enhancement state
  const [selectedModel, setSelectedModel] = useState<ModelId>(defaultModel);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);

  // Conversation persistence
  const [convId, setConvId] = useState<string | null>(searchParams.get("id"));

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasCode = code.length > 0;

  // Load existing tool for editing
  useEffect(() => {
    if (editId) {
      fetch(`/api/tools/${editId}`)
        .then((res) => res.json())
        .then((tool) => {
          setToolName(tool.name);
          setToolDescription(tool.description || "");
          setCode(tool.code);
          setToolCategory(tool.category || "");
          setToolTags(tool.tags || []);
          setToolVisibility(tool.visibility || "PRIVATE");
          setSelectedDataSources(tool.allowedSources || []);
          if (tool.conversation?.messages) {
            setMessages(tool.conversation.messages);
          }
        })
        .catch(() => {
          toast({
            title: "錯誤",
            description: "無法載入工具",
            variant: "destructive",
          });
        });
    }
  }, [editId, toast]);

  // Load existing conversation from URL
  useEffect(() => {
    const loadId = searchParams.get("id");
    if (!loadId || editId) return;

    fetch(`/api/conversations/${loadId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((conv) => {
        setMessages(conv.messages || []);
        if (conv.model) setSelectedModel(conv.model);
        if (conv.dataSources?.length) setSelectedDataSources(conv.dataSources);
        // Extract code from last assistant message
        const lastAssistant = [...(conv.messages || [])]
          .reverse()
          .find((m: { role: string }) => m.role === "assistant");
        if (lastAssistant) {
          const extracted = extractCode(lastAssistant.content);
          if (extracted) setCode(extracted);
        }
      })
      .catch(() => {
        toast({
          title: "錯誤",
          description: "無法載入對話",
          variant: "destructive",
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Extract code from response - handles both markdown and plain code
  const extractCode = useCallback((text: string): string | null => {
    // Check if text starts with markdown code block
    if (text.trim().startsWith('```')) {
      // Find the end of first line (language identifier)
      const firstLineEnd = text.indexOf('\n');
      if (firstLineEnd === -1) return null;

      // Find the closing ```
      const codeEnd = text.lastIndexOf('```');
      if (codeEnd <= firstLineEnd) return null;

      // Extract code between
      return text.substring(firstLineEnd + 1, codeEnd).trim();
    }

    // Try regex for code blocks in the middle of text
    const match = text.match(/```(?:jsx|tsx|javascript|js|react)?\s*\n?([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Return null if no markdown found (code is already clean)
    return null;
  }, []);

  // Parse AI SDK data stream format
  const parseDataStreamLine = useCallback((line: string): { type: string; data: unknown } | null => {
    if (!line.trim()) return null;

    // Format: "type:json_data"
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return null;

    const type = line.substring(0, colonIndex);
    const jsonStr = line.substring(colonIndex + 1);

    try {
      const data = JSON.parse(jsonStr);
      return { type, data };
    } catch {
      return null;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setCurrentToolCalls([]);

    // Prepare files for API
    const filesToSend = uploadedFiles.map((f) => ({
      name: f.name,
      type: f.type,
      base64: f.base64,
    }));

    // Clear uploaded files after sending
    setUploadedFiles([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          model: selectedModel,
          files: filesToSend.length > 0 ? filesToSend : undefined,
          dataSources: selectedDataSources.length > 0 ? selectedDataSources : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";
      const toolCallsMap = new Map<string, ToolCall>();

      if (reader) {
        console.log('[Studio] Starting stream read...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[Studio] Stream done');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('[Studio] Received chunk:', chunk);
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            console.log('[Studio] Processing line:', line);
            const parsed = parseDataStreamLine(line);
            if (!parsed) {
              console.log('[Studio] Could not parse line');
              continue;
            }

            const { type, data } = parsed;
            console.log('[Studio] Parsed:', type, data);

            switch (type) {
              case "0": // Text content
                assistantMessage += data as string;
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === "assistant") {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, content: assistantMessage },
                    ];
                  } else {
                    return [...prev, { role: "assistant", content: assistantMessage }];
                  }
                });

                // Extract code for preview
                const extractedCode = extractCode(assistantMessage);
                if (extractedCode) {
                  setCode(extractedCode);
                }
                break;

              case "9": { // Tool call start
                const toolData = data as { toolCallId: string; toolName: string; args: Record<string, unknown> };
                const toolCall: ToolCall = {
                  id: toolData.toolCallId,
                  name: toolData.toolName,
                  args: toolData.args,
                  status: "calling",
                };
                toolCallsMap.set(toolCall.id, toolCall);
                setCurrentToolCalls(Array.from(toolCallsMap.values()));
                break;
              }

              case "a": { // Tool result
                const resultData = data as { toolCallId: string; result: unknown };
                const existing = toolCallsMap.get(resultData.toolCallId);
                if (existing) {
                  existing.status = "completed";
                  existing.result = resultData.result;
                  toolCallsMap.set(existing.id, existing);
                  setCurrentToolCalls(Array.from(toolCallsMap.values()));

                  // Handle updateCode tool result
                  if (existing.name === "updateCode" && typeof resultData.result === "object" && resultData.result) {
                    const result = resultData.result as { code?: string };
                    if (result.code) {
                      // Extract code from markdown if present
                      const extracted = extractCode(result.code);
                      const finalCode = extracted || result.code;
                      setCode(finalCode);
                    }
                  }
                }
                break;
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer) {
          const parsed = parseDataStreamLine(buffer);
          if (parsed?.type === "0") {
            assistantMessage += parsed.data as string;
          }
        }

        // Update final message with tool calls
        if (toolCallsMap.size > 0) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: assistantMessage, toolCalls: Array.from(toolCallsMap.values()) },
              ];
            }
            return prev;
          });
        }
      }

      // Auto-save conversation
      if (assistantMessage) {
        const finalMessages: Message[] = [
          ...messages,
          { role: "user", content: userMessage },
          {
            role: "assistant",
            content: assistantMessage,
            ...(toolCallsMap.size > 0
              ? { toolCalls: Array.from(toolCallsMap.values()) }
              : {}),
          },
        ];

        try {
          if (!convId && !editId) {
            const createRes = await fetch("/api/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: finalMessages,
                model: selectedModel,
                dataSources:
                  selectedDataSources.length > 0
                    ? selectedDataSources
                    : undefined,
              }),
            });
            if (createRes.ok) {
              const conv = await createRes.json();
              setConvId(conv.id);
              router.replace(`/studio?id=${conv.id}`, { scroll: false });
            }
          } else if (convId) {
            await fetch(`/api/conversations/${convId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: finalMessages,
                model: selectedModel,
                dataSources:
                  selectedDataSources.length > 0
                    ? selectedDataSources
                    : undefined,
              }),
            });
          }
        } catch {
          // Auto-save failure is non-critical
        }
      }
    } catch {
      toast({
        title: "錯誤",
        description: "無法取得回應，請重試。",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setCurrentToolCalls([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDeploy = async (data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    visibility: string;
    allowedSources: string[];
  }) => {
    try {
      const endpoint = editId ? `/api/tools/${editId}` : "/api/tools";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          tags: data.tags,
          visibility: data.visibility,
          allowedSources: data.allowedSources,
          code,
          messages,
          conversationId: convId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save tool");
      }

      const tool = await res.json();

      toast({
        title: editId ? "工具已更新" : "工具已發布",
        description: `「${data.name}」已${editId ? "更新" : "發布"}成功。`,
      });

      router.push(`/tool/${tool.id}`);
    } catch {
      toast({
        title: "錯誤",
        description: "儲存失敗，請重試。",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCode("");
    setToolName("");
    setToolDescription("");
    setToolCategory("");
    setToolTags([]);
    setToolVisibility("PRIVATE");
    setSelectedDataSources([]);
    setUploadedFiles([]);
    setConvId(null);
    router.replace("/studio", { scroll: false });
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-semibold">
            {editId ? "編輯工具" : "Studio"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          {hasCode && (
            <Button
              size="sm"
              onClick={() => setShowDeployDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              {editId ? "儲存" : "發布"}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div className={`${hasCode ? "w-1/2 border-r" : "w-full max-w-4xl mx-auto"} flex flex-col transition-all duration-300`}>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  <p className="text-lg font-medium mb-2">有什麼我可以幫你的？</p>
                  <p className="text-sm">問我任何問題、查詢資料，或描述你想建立的工具。</p>
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className="space-y-2">
                  <ChatMessage
                    message={message}
                    isStreaming={isLoading && index === messages.length - 1 && message.role === "assistant"}
                  />
                  {/* Show tool calls for this message */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="ml-10 space-y-2">
                      {message.toolCalls.map((toolCall) => (
                        <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Show current tool calls while streaming */}
              {isLoading && currentToolCalls.length > 0 && (
                <div className="ml-10 space-y-2">
                  {currentToolCalls.map((toolCall) => (
                    <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
                  ))}
                </div>
              )}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && currentToolCalls.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>思考中...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t">
            {/* File preview */}
            {uploadedFiles.length > 0 && (
              <FileList files={uploadedFiles} onRemove={handleRemoveFile} />
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 pt-2">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="問點什麼，或描述你想要的功能..."
                  className="min-h-[80px] pr-12 resize-none"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 mt-2">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                <FileUpload
                  files={uploadedFiles}
                  onChange={setUploadedFiles}
                  disabled={isLoading}
                />
                <DataSourceSelector
                  value={selectedDataSources}
                  onChange={setSelectedDataSources}
                  disabled={isLoading}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Preview Panel - only shown when code exists */}
        {hasCode && (
          <div className="w-1/2 h-full">
            <PreviewPanel code={code} />
          </div>
        )}
      </div>

      <DeployDialog
        open={showDeployDialog}
        onOpenChange={setShowDeployDialog}
        onDeploy={handleDeploy}
        defaultName={toolName}
        defaultDescription={toolDescription}
        defaultCategory={toolCategory}
        defaultTags={toolTags}
        defaultVisibility={toolVisibility}
        defaultAllowedSources={selectedDataSources}
        isEditing={!!editId}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
