"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Loader2, CornerDownLeft, ChevronDown, Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewPanel } from "@/components/preview-panel";
import { DeployDialog } from "@/components/deploy-dialog";
import { ChatMessage } from "@/components/chat-message";
import { useToast } from "@/components/ui/use-toast";
import { ToolCallDisplay, ToolCall } from "@/components/tool-call-display";
import { ModelSelector } from "@/components/model-selector";
import { DataSourceSelector } from "@/components/data-source-selector";
import { SkillSelector } from "@/components/skill-selector";
import { FileUpload, FileList, UploadedFile } from "@/components/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelId, defaultModel } from "@/lib/ai/models";
import { ToolDataSource } from "@/types/data-source";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

interface CompactInfo {
  compacted: boolean;
  originalCount: number;
  keptCount: number;
}

interface QuotaStatus {
  status: "ok" | "warning" | "blocked";
  currentUsageUsd: number;
  effectiveLimitUsd: number;
  remainingUsd: number;
}

function useIsMobileChat() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { toast } = useToast();
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const tq = useTranslations("quota");
  const isMobileChat = useIsMobileChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [draftToolId, setDraftToolId] = useState<string | null>(null);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolDescription, setToolDescription] = useState("");
  const [toolCategory, setToolCategory] = useState("");
  const [toolTags, setToolTags] = useState<string[]>([]);
  const [toolVisibility, setToolVisibility] = useState("PRIVATE");
  const [toolAllowedGroupIds, setToolAllowedGroupIds] = useState<string[]>([]);

  // Enhancement state
  const [selectedModel, setSelectedModel] = useState<ModelId>(defaultModel);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<{ id: string; name: string; prompt: string; requiredDataSources: string[] } | null>(null);
  const [, setUsedDataSources] = useState<ToolDataSource[]>([]);

  // Conversation persistence
  const [convId, setConvId] = useState<string | null>(searchParams.get("id"));
  const [convTitle, setConvTitle] = useState<string | null>(null);
  const [convStarred, setConvStarred] = useState(false);

  // Header dropdown state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const ts = useTranslations("sidebar.conversation");

  // Auto compact state
  const [compactInfo, setCompactInfo] = useState<CompactInfo | null>(null);

  // Quota state
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);

  // Send mode: true = Enter sends, false = Ctrl/Cmd+Enter sends
  const [enterToSend, setEnterToSend] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("studio:enterToSend") !== "false";
    }
    return true;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Guard: prevent effects from overwriting state during active streaming
  const isSubmittingRef = useRef(false);

  // Auto-fix preview errors
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorRetryCount, setErrorRetryCount] = useState(0);
  const lastCodeRef = useRef<string>("");
  const MAX_ERROR_RETRIES = 2;

  const hasCode = code.length > 0;
  const isQuotaBlocked = quotaStatus?.status === "blocked";

  // Resizable panel
  const [panelRatio, setPanelRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelRatio(Math.min(80, Math.max(20, ratio)));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const resetState = useCallback(() => {
    setMessages([]);
    setInput("");
    setCode("");
    setDraftToolId(null);
    setCurrentToolCalls([]);
    setToolName("");
    setToolDescription("");
    setToolCategory("");
    setToolTags([]);
    setToolVisibility("PRIVATE");
    setToolAllowedGroupIds([]);
    setConvId(null);
    setConvTitle(null);
    setConvStarred(false);
    setUploadedFiles([]);
    setSelectedDataSources([]);
    setUsedDataSources([]);
    setCompactInfo(null);
  }, []);

  // Reset state when navigating to /chat without id (new conversation)
  useEffect(() => {
    if (isSubmittingRef.current) return;
    const currentId = searchParams.get("id");
    const currentEditId = searchParams.get("edit");
    if (!currentId && !currentEditId) resetState();
  }, [searchParams, resetState]);

  // Reset state when "new-chat" event is dispatched (handles same-URL case)
  useEffect(() => {
    const handler = () => resetState();
    window.addEventListener("new-chat", handler);
    return () => window.removeEventListener("new-chat", handler);
  }, [resetState]);

  // Sync title when sidebar renames the current conversation
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, title } = (e as CustomEvent).detail;
      if (id === convId) setConvTitle(title);
    };
    window.addEventListener("conversation-renamed", handler);
    return () => window.removeEventListener("conversation-renamed", handler);
  }, [convId]);

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
          setToolAllowedGroupIds(tool.allowedGroups?.map((g: { id: string }) => g.id) || []);
          setSelectedDataSources(tool.dataSources || []);
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
    if (isSubmittingRef.current) return;
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
        setConvStarred(conv.starred ?? false);
        setSelectedDataSources(conv.dataSources || []);

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

        setCode(foundCode || "");
        setConvId(loadId);

        // Restore draft toolId if conversation has a linked tool
        if (conv.tool?.id) {
          setDraftToolId(conv.tool.id);
        }
      })
      .catch(() => {
        toast({
          title: t("toast.error"),
          description: t("toast.loadConversationError"),
          variant: "destructive",
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    isSubmittingRef.current = true;
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
          message: userMessage,
          model: selectedModel,
          files: filesToSend.length > 0 ? filesToSend : undefined,
          conversationId: convId || undefined,
          dataSources: selectedDataSources.length > 0 ? selectedDataSources : undefined,
          skillPrompt: selectedSkill?.prompt || undefined,
        }),
      });

      if (res.status === 403) {
        const errBody = await res.json().catch(() => null);
        if (errBody?.error === "quota_exceeded") {
          setQuotaStatus(errBody.quota as QuotaStatus);
          setMessages((prev) => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
      }

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";
      let savedConvId = convId;
      let savedTitle: string | undefined;
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
                    const result = resultData.result as { code?: string; toolId?: string };
                    console.log("[Debug] updateCode result:", result);
                    if (result.toolId) setDraftToolId(result.toolId);
                    if (result.code) {
                      const extracted = extractCode(result.code);
                      const finalCode = extracted || result.code;
                      setCode(finalCode);
                    }
                  }

                  // Track used data sources from Google tools
                  if ((existing.name === "googleSearch" || existing.name === "googleWrite") &&
                      typeof resultData.result === "object" && resultData.result) {
                    const result = resultData.result as { usedDataSource?: ToolDataSource };
                    if (result.usedDataSource) {
                      setUsedDataSources((prev) => {
                        // Avoid duplicates by checking resourceId
                        const exists = prev.some(
                          (ds) => ds.type === result.usedDataSource!.type &&
                                  ds.resourceId === result.usedDataSource!.resourceId
                        );
                        if (exists) return prev;
                        return [...prev, result.usedDataSource!];
                      });
                    }
                  }
                }
                break;
              }

              case "i": { // Conversation ID (and title) from server
                const { conversationId: serverConvId, title: serverTitle } = data as { conversationId: string; title?: string };
                if (serverConvId && !savedConvId) {
                  savedConvId = serverConvId;
                  if (serverTitle) savedTitle = serverTitle;
                }
                break;
              }

              case "c": { // Compact event
                const compact = data as CompactInfo;
                setCompactInfo(compact);
                break;
              }

              case "q": { // Quota status
                setQuotaStatus(data as QuotaStatus);
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
            // AI only responded with tool calls, no text — still add assistant message
            return [...prev, { role: "assistant" as const, content: assistantMessage, toolCalls: Array.from(toolCallsMap.values()) }];
          });
        }
      }

      // Update URL if server returned a new conversationId
      if (savedConvId && savedConvId !== convId) {
        setConvId(savedConvId);
        if (savedTitle) setConvTitle(savedTitle);
        window.history.replaceState(null, "", `/chat?id=${savedConvId}`);
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
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (enterToSend) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !enterToSend) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleEnterToSend = (checked: boolean) => {
    setEnterToSend(checked);
    localStorage.setItem("studio:enterToSend", String(checked));
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
            conversationId: convId || undefined,
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
                      const result = resultData.result as { code?: string; toolId?: string };
                      if (result.toolId) setDraftToolId(result.toolId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewError, isLoading, errorRetryCount, messages, selectedModel, parseDataStreamLine, extractCode]);

  const handleDeploy = async (data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    visibility: string;
    allowedGroupIds: string[];
  }) => {
    try {
      // If editing a published tool, or publishing a draft, use PATCH
      const targetId = editId || draftToolId;
      const endpoint = targetId ? `/api/tools/${targetId}` : "/api/tools";
      const method = targetId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          tags: data.tags,
          visibility: data.visibility,
          status: "PUBLISHED",
          allowedGroupIds: data.allowedGroupIds,
          code,
          messages,
          conversationId: convId,
          dataSources: selectedDataSources.length > 0 ? selectedDataSources : undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        if (res.status === 400 && errBody?.error === "code_scan_failed") {
          const findings = errBody.findings as Array<{
            severity: string;
            message: string;
            rule: string;
            line?: number;
          }>;
          const criticalCount = findings.filter((f) => f.severity === "critical").length;
          const messages = findings
            .slice(0, 5)
            .map((f) => `[${f.severity.toUpperCase()}] ${f.message}${f.line ? ` (line ${f.line})` : ""}`)
            .join("\n");
          toast({
            title: t("toast.codeScanFailed", { count: String(criticalCount) }),
            description: messages,
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to save tool");
      }

      const tool = await res.json();

      // Show scan warnings if any
      if (tool.scanWarnings?.length > 0) {
        const warnMessages = (tool.scanWarnings as Array<{ severity: string; message: string; line?: number }>)
          .slice(0, 5)
          .map((f) => `[${f.severity.toUpperCase()}] ${f.message}${f.line ? ` (line ${f.line})` : ""}`)
          .join("\n");
        toast({
          title: t("toast.codeScanWarning", { count: String(tool.scanWarnings.length) }),
          description: warnMessages,
        });
      } else {
        toast({
          title: editId ? t("toast.toolUpdated") : t("toast.toolPublished"),
          description: t("toast.toolSaveSuccess", {
            name: data.name,
            action: editId ? t("toast.toolUpdated") : t("toast.toolPublished")
          }),
        });
      }

      router.push(`/tool/${tool.id}`);
    } catch {
      toast({
        title: t("toast.error"),
        description: t("toast.saveError"),
        variant: "destructive",
      });
    }
  };

  // --- Header dropdown handlers ---
  const handleHeaderStarToggle = async () => {
    if (!convId) return;
    const newStarred = !convStarred;
    setConvStarred(newStarred);
    try {
      await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: newStarred }),
      });
      window.dispatchEvent(new Event("conversation-updated"));
    } catch {
      setConvStarred(!newStarred);
    }
  };

  const handleHeaderRenameStart = () => {
    setEditingTitleValue(convTitle || "");
    setShowRenameDialog(true);
  };

  const handleHeaderRenameSave = async () => {
    setShowRenameDialog(false);
    const newTitle = editingTitleValue.trim();
    if (!newTitle || !convId) return;
    const oldTitle = convTitle;
    setConvTitle(newTitle);
    try {
      await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      window.dispatchEvent(new Event("conversation-updated"));
    } catch {
      setConvTitle(oldTitle);
    }
  };

  const handleHeaderDelete = async () => {
    if (!convId) return;
    setShowDeleteDialog(false);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        window.dispatchEvent(new Event("conversation-updated"));
        router.push("/chat");
      }
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
      <header className="border-b px-4 py-2 flex items-center shrink-0 bg-background">
        <div className="flex items-center gap-1 min-w-0">
          <h1 className="font-semibold truncate">
            {editId ? t("title.edit") : convTitle || t("title.new")}
          </h1>
          {convId && !editId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleHeaderStarToggle}>
                  <Star className={`h-4 w-4 mr-2 ${convStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  {convStarred ? ts("unstar") : ts("star")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHeaderRenameStart}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("editTitle")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteConversation")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Rename dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={editingTitleValue}
            onChange={(e) => setEditingTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleHeaderRenameSave();
            }}
            placeholder={t("editTitlePlaceholder")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleHeaderRenameSave}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteConversation")}</DialogTitle>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t("deleteCancel")}
            </Button>
            <Button variant="destructive" onClick={handleHeaderDelete}>
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className={`flex-1 flex min-h-0 ${isMobileChat ? "flex-col" : "flex-row"}`} ref={containerRef}>
        {/* Chat Panel */}
        <div
          className="flex flex-col min-w-0 min-h-0"
          style={hasCode && !isMobileChat ? { width: `${panelRatio}%` } : { flex: 1 }}
        >
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center text-muted-foreground">
                    <div className="mb-4 text-4xl animate-bounce" style={{ animationIterationCount: 3 }}>
                      👋
                    </div>
                    <p className="text-lg font-medium mb-2">{t("welcome.title")}</p>
                    <p className="text-sm">{t("welcome.description")}</p>
                  </div>
                </div>
              )}
              {compactInfo && (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>對話已自動壓縮 (保留最近 {compactInfo.keptCount} 條訊息)</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isStreamingMessage = isLoading && isLastMessage && message.role === "assistant";
                const isAssistant = message.role === "assistant";

                // For streaming message, show tool calls from currentToolCalls instead
                const toolCallsToShow = isStreamingMessage ? currentToolCalls : (message.toolCalls || []);
                const hasToolCalls = toolCallsToShow.length > 0;

                // User messages
                if (!isAssistant) {
                  return (
                    <div key={index}>
                      <ChatMessage message={message} />
                    </div>
                  );
                }

                // Assistant messages - tool calls then content, no avatar
                return (
                  <div key={index} className="space-y-3 max-w-full sm:max-w-[85%] pl-2 sm:pl-8">
                    {/* Tool calls (thinking steps) */}
                    {hasToolCalls && (
                      <div className="space-y-2">
                        {toolCallsToShow.map((toolCall) => (
                          <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
                        ))}
                      </div>
                    )}

                    {/* Message content */}
                    <ChatMessage
                      message={message}
                      isStreaming={isStreamingMessage}
                      toolCalls={toolCallsToShow}
                    />
                  </div>
                );
              })}
              {/* Show thinking indicator when waiting for first response */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="space-y-2 pl-8">
                  {currentToolCalls.length > 0 ? (
                    <div className="space-y-2">
                      {currentToolCalls.map((toolCall) => (
                        <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("thinking")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t">
            {/* Quota warning/blocked banner */}
            {quotaStatus?.status === "warning" && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                {tq("warning", {
                  used: quotaStatus.currentUsageUsd.toFixed(2),
                  limit: quotaStatus.effectiveLimitUsd.toFixed(2),
                })}
              </div>
            )}
            {quotaStatus?.status === "blocked" && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
                {tq("blocked", {
                  used: quotaStatus.currentUsageUsd.toFixed(2),
                  limit: quotaStatus.effectiveLimitUsd.toFixed(2),
                })}
              </div>
            )}

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
                  placeholder={isQuotaBlocked ? tq("inputDisabled") : t("input.placeholder")}
                  className="min-h-[80px] pr-12 resize-none"
                  disabled={isLoading || isQuotaBlocked}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  disabled={!input.trim() || isLoading || isQuotaBlocked}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                <SkillSelector
                  value={selectedSkill}
                  onSelect={(skill) => {
                    setSelectedSkill(skill);
                    if (skill && skill.requiredDataSources.length > 0) {
                      setSelectedDataSources((prev) =>
                        Array.from(new Set([...prev, ...skill.requiredDataSources]))
                      );
                    }
                  }}
                  disabled={isLoading || isQuotaBlocked}
                />
                <DataSourceSelector
                  value={selectedDataSources}
                  onChange={setSelectedDataSources}
                  disabled={isLoading}
                />
                <FileUpload
                  files={uploadedFiles}
                  onChange={setUploadedFiles}
                  disabled={isLoading}
                />
                <div className="ml-auto flex items-center gap-1.5">
                  <Checkbox
                    id="enter-to-send"
                    checked={enterToSend}
                    onCheckedChange={toggleEnterToSend}
                  />
                  <label
                    htmlFor="enter-to-send"
                    className="text-xs text-muted-foreground cursor-pointer select-none hidden sm:flex items-center gap-1"
                  >
                    <CornerDownLeft className="h-3 w-3" />
                    {t("input.enterToSend")}
                  </label>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Draggable Divider — hidden on mobile */}
        {hasCode && !isMobileChat && (
          <div
            className={`group relative w-1.5 cursor-col-resize shrink-0 flex items-center justify-center ${isDragging ? "bg-primary/30" : "bg-transparent hover:bg-primary/15"}`}
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          >
            <div className={`flex flex-col gap-1 ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            </div>
          </div>
        )}

        {/* Preview Panel - only shown when code exists */}
        {hasCode && (
          <div className={`min-w-0 relative ${isMobileChat ? "h-[50vh] border-t" : "flex-1 h-full"}`}>
            {isDragging && <div className="absolute inset-0 z-50" />}
            <PreviewPanel
              code={code}
              toolId={editId || draftToolId}
              dataSources={selectedDataSources}
              onError={handlePreviewError}
              onShare={() => setShowDeployDialog(true)}
            />
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
        defaultAllowedGroupIds={toolAllowedGroupIds}
        isEditing={!!editId}
        hasAnyDataSource={selectedDataSources.length > 0}
        usesLLM={/execute\(["']llm["']/.test(code)}
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
