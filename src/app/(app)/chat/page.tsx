"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Loader2, Save } from "lucide-react";
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
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");

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

  // Conversation persistence
  const [convId, setConvId] = useState<string | null>(searchParams.get("id"));
  const [convTitle, setConvTitle] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fix preview errors
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorRetryCount, setErrorRetryCount] = useState(0);
  const lastCodeRef = useRef<string>("");
  const MAX_ERROR_RETRIES = 2;

  const hasCode = code.length > 0;

  // Reset state when navigating to /chat without id (new conversation)
  useEffect(() => {
    const currentId = searchParams.get("id");
    const currentEditId = searchParams.get("edit");

    if (!currentId && !currentEditId) {
      // Reset all state for new conversation
      setMessages([]);
      setInput("");
      setCode("");
      setCurrentToolCalls([]);
      setToolName("");
      setToolDescription("");
      setToolCategory("");
      setToolTags([]);
      setToolVisibility("PRIVATE");
      setConvId(null);
      setConvTitle(null);
      setUploadedFiles([]);
    }
  }, [searchParams]);

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
          if (tool.conversation?.messages) {
            setMessages(tool.conversation.messages);
          }
        })
        .catch(() => {
          toast({
            title: t("toast.error"),
            description: t("toast.loadToolError"),
            variant: "destructive",
          });
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (conv.title) setConvTitle(conv.title);
        if (conv.model) setSelectedModel(conv.model);

        // Extract code from messages - check tool calls first, then content
        const messages = conv.messages || [];
        let foundCode: string | null = null;

        // Search backwards through messages
        for (let i = messages.length - 1; i >= 0 && !foundCode; i--) {
          const msg = messages[i];
          if (msg.role === "assistant") {
            // First check tool calls for updateCode result
            if (msg.toolCalls) {
              for (const toolCall of msg.toolCalls) {
                if (toolCall.name === "updateCode" && toolCall.result?.code) {
                  const extracted = extractCode(toolCall.result.code);
                  foundCode = extracted || toolCall.result.code;
                  break;
                }
              }
            }
            // If no tool call code, try extracting from content
            if (!foundCode && msg.content) {
              const extracted = extractCode(msg.content);
              if (extracted) foundCode = extracted;
            }
          }
        }

        if (foundCode) setCode(foundCode);
      })
      .catch(() => {
        toast({
          title: t("toast.error"),
          description: t("toast.loadConversationError"),
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const parsed = parseDataStreamLine(line);
            if (!parsed) continue;

            const { type, data } = parsed;

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
                    console.log("[Debug] updateCode result:", result);
                    if (result.code) {
                      // Extract code from markdown if present
                      const extracted = extractCode(result.code);
                      const finalCode = extracted || result.code;
                      console.log("[Debug] Final code length:", finalCode.length);
                      console.log("[Debug] Final code preview:", finalCode.substring(0, 200));
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
              }),
            });
            if (createRes.ok) {
              const conv = await createRes.json();
              setConvId(conv.id);
              if (conv.title) setConvTitle(conv.title);
              router.push(`/chat?id=${conv.id}`);
            }
          } else if (convId) {
            await fetch(`/api/conversations/${convId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: finalMessages,
                model: selectedModel,
              }),
            });
          }
        } catch {
          // Auto-save failure is non-critical
        }
      }
    } catch {
      toast({
        title: t("toast.error"),
        description: t("toast.responseError"),
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

  // Handle preview errors - auto request fix from AI
  const handlePreviewError = useCallback((error: string | null) => {
    setPreviewError(error);

    // Reset retry count when code changes
    if (code !== lastCodeRef.current) {
      lastCodeRef.current = code;
      setErrorRetryCount(0);
    }
  }, [code]);

  // Auto-fix preview errors
  useEffect(() => {
    if (!previewError || isLoading || errorRetryCount >= MAX_ERROR_RETRIES) return;

    const autoFix = async () => {
      setErrorRetryCount((prev) => prev + 1);

      const fixMessage = `Preview 出現錯誤，請修正程式碼：\n\n\`\`\`\n${previewError}\n\`\`\``;

      setMessages((prev) => [...prev, { role: "user", content: fixMessage }]);
      setIsLoading(true);
      setCurrentToolCalls([]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: fixMessage }],
            model: selectedModel,
          }),
        });

        if (!res.ok) throw new Error("Failed to get response");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let buffer = "";
        const toolCallsMap = new Map<string, ToolCall>();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const parsed = parseDataStreamLine(line);
              if (!parsed) continue;

              const { type, data } = parsed;

              switch (type) {
                case "0":
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

                  const extractedCode = extractCode(assistantMessage);
                  if (extractedCode) {
                    setCode(extractedCode);
                  }
                  break;

                case "9": {
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

                case "a": {
                  const resultData = data as { toolCallId: string; result: unknown };
                  const existing = toolCallsMap.get(resultData.toolCallId);
                  if (existing) {
                    existing.status = "completed";
                    existing.result = resultData.result;
                    toolCallsMap.set(existing.id, existing);
                    setCurrentToolCalls(Array.from(toolCallsMap.values()));

                    if (existing.name === "updateCode" && typeof resultData.result === "object" && resultData.result) {
                      const result = resultData.result as { code?: string };
                      if (result.code) {
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
      } catch {
        // Auto-fix failure is non-critical
      } finally {
        setIsLoading(false);
        setCurrentToolCalls([]);
      }
    };

    // Small delay before auto-fix
    const timer = setTimeout(autoFix, 1000);
    return () => clearTimeout(timer);
  }, [previewError, isLoading, errorRetryCount, messages, selectedModel, parseDataStreamLine, extractCode]);

  const handleDeploy = async (data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    visibility: string;
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
        title: editId ? t("toast.toolUpdated") : t("toast.toolPublished"),
        description: t("toast.toolSaveSuccess", {
          name: data.name,
          action: editId ? t("toast.toolUpdated") : t("toast.toolPublished")
        }),
      });

      router.push(`/tool/${tool.id}`);
    } catch {
      toast({
        title: t("toast.error"),
        description: t("toast.saveError"),
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between shrink-0 bg-background">
        <h1 className="font-semibold truncate">
          {editId ? t("title.edit") : convTitle || t("title.new")}
        </h1>
        <div className="flex items-center gap-2">
          {hasCode && (
            <Button
              size="sm"
              onClick={() => setShowDeployDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              {editId ? tCommon("save") : tCommon("deploy")}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div className={`${hasCode ? "w-1/2 border-r" : "flex-1"} flex flex-col transition-all duration-300`}>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  <p className="text-lg font-medium mb-2">{t("welcome.title")}</p>
                  <p className="text-sm">{t("welcome.description")}</p>
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
                  <span>{t("thinking")}</span>
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
                  placeholder={t("input.placeholder")}
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
              </div>
            </form>
          </div>
        </div>

        {/* Preview Panel - only shown when code exists */}
        {hasCode && (
          <div className="flex-1 h-full">
            <PreviewPanel code={code} onError={handlePreviewError} />
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
