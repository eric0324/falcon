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
import { InitialSetupDialog, ToolSetup } from "@/components/initial-setup-dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(!editId);
  const [toolName, setToolName] = useState("");
  const [toolDescription, setToolDescription] = useState("");
  const [toolCategory, setToolCategory] = useState("");
  const [toolTags, setToolTags] = useState<string[]>([]);
  const [toolVisibility, setToolVisibility] = useState("PRIVATE");
  const [toolAllowedSources, setToolAllowedSources] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing tool for editing
  useEffect(() => {
    if (editId) {
      fetch(`/api/tools/${editId}`)
        .then((res) => res.json())
        .then((tool) => {
          console.log("[Studio] Loaded tool:", tool);
          console.log("[Studio] Conversation:", tool.conversation);
          setToolName(tool.name);
          setToolDescription(tool.description || "");
          setCode(tool.code);
          setToolCategory(tool.category || "");
          setToolTags(tool.tags || []);
          setToolVisibility(tool.visibility || "PRIVATE");
          setToolAllowedSources(tool.allowedSources || []);
          // Load conversation messages
          if (tool.conversation?.messages) {
            console.log("[Studio] Setting messages:", tool.conversation.messages);
            setMessages(tool.conversation.messages);
          }
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to load tool for editing",
            variant: "destructive",
          });
        });
    }
  }, [editId, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Extract code from Claude's response
  const extractCode = useCallback((text: string): string | null => {
    // Look for code block
    const match = text.match(/```(?:jsx|tsx|javascript|js|react)?\s*\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      const extractedCode = match[1].trim();
      console.log("Extracted code:", extractedCode.substring(0, 100) + "...");
      return extractedCode;
    }
    console.log("No code block found in:", text.substring(0, 200));
    return null;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          currentCode: code,
          allowedSources: toolAllowedSources,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              // Create new array with updated last message (immutable update)
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: assistantMessage }
              ];
            } else {
              return [...prev, { role: "assistant", content: assistantMessage }];
            }
          });

          // Try to extract code in real-time for preview
          const extractedCode = extractCode(assistantMessage);
          if (extractedCode) {
            console.log("Setting code to preview, length:", extractedCode.length);
            setCode(extractedCode);
          }
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
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
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save tool");
      }

      const tool = await res.json();

      toast({
        title: editId ? "Tool updated" : "Tool deployed",
        description: `Your tool "${data.name}" has been ${editId ? "updated" : "deployed"} successfully.`,
      });

      router.push(`/tool/${tool.id}`);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save tool. Please try again.",
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
    setToolAllowedSources([]);
    setShowInitialSetup(true);
  };

  const handleInitialSetup = (setup: ToolSetup) => {
    setToolName(setup.name);
    setToolDescription(setup.description);
    setToolAllowedSources(setup.allowedSources);
    setShowInitialSetup(false);
  };

  const handleCancelSetup = () => {
    router.push("/");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-semibold">
            {editId ? "編輯工具" : toolName || "新工具"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button
            size="sm"
            onClick={() => setShowDeployDialog(true)}
            disabled={!code}
          >
            <Save className="h-4 w-4 mr-2" />
            {editId ? "儲存" : "發布"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div className="w-1/2 border-r flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && !showInitialSetup && (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-lg font-medium mb-2">開始建立「{toolName}」</p>
                  <p className="text-sm">
                    描述你想要的功能，我會幫你產生程式碼。
                  </p>
                  {toolAllowedSources.length > 0 && (
                    <p className="text-xs mt-2">
                      已選擇資料源：{toolAllowedSources.join("、")}
                    </p>
                  )}
                </div>
              )}
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>產生中...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想要的功能..."
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
          </form>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 h-full">
          <PreviewPanel code={code} />
        </div>
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
        defaultAllowedSources={toolAllowedSources}
        isEditing={!!editId}
      />

      <InitialSetupDialog
        open={showInitialSetup}
        onConfirm={handleInitialSetup}
        onCancel={handleCancelSetup}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <StudioContent />
    </Suspense>
  );
}
