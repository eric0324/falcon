import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/storage/s3";
import type { Message, MessageAttachment } from "@/types/message";

interface TokenUsageRow {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function toAttachmentsJson(
  attachments: Message["attachments"]
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  // Strip client-only fields (base64, presignedUrl) before persisting.
  const storable = attachments.map((a) => ({
    name: a.name,
    type: a.type,
    size: a.size,
    ...(a.s3Key ? { s3Key: a.s3Key } : {}),
  }));
  return storable as unknown as Prisma.InputJsonValue;
}

async function attachmentsWithUrls(
  raw: unknown
): Promise<MessageAttachment[] | undefined> {
  if (!raw || !Array.isArray(raw)) return undefined;
  const items = raw as MessageAttachment[];
  return Promise.all(
    items.map(async (a) => {
      if (!a.s3Key) return a;
      try {
        const presignedUrl = await getPresignedUrl({ key: a.s3Key });
        return { ...a, presignedUrl };
      } catch {
        return a;
      }
    })
  );
}

/** 依 orderIndex 排序取得 conversation 的所有訊息 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { orderIndex: "asc" },
    include: { tokenUsages: true },
  });

  return Promise.all(
    rows.map(async (r) => {
      const msg: Message = {
        role: r.role as Message["role"],
        content: r.content,
        ...(r.toolCalls ? { toolCalls: r.toolCalls as unknown as Message["toolCalls"] } : {}),
      };
      const row = r as unknown as { attachments?: unknown; tokenUsages: TokenUsageRow[] };
      const attachments = await attachmentsWithUrls(row.attachments);
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments;
      }
      const usages = row.tokenUsages;
      if (usages.length > 0) {
        msg.tokenUsage = {
          model: usages[0].model,
          inputTokens: usages.reduce((sum, u) => sum + u.inputTokens, 0),
          outputTokens: usages.reduce((sum, u) => sum + u.outputTokens, 0),
        };
      }
      return msg;
    })
  );
}

/** 取得 conversation 的訊息數量 */
export async function getMessageCount(conversationId: string): Promise<number> {
  return prisma.conversationMessage.count({ where: { conversationId } });
}

function toToolCallsJson(
  toolCalls: Message["toolCalls"]
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (!toolCalls) return undefined;
  return toolCalls as unknown as Prisma.InputJsonValue;
}

/** 在既有 conversation 末尾追加訊息，回傳新增的 assistant message IDs */
export async function appendMessages(
  conversationId: string,
  messages: Message[]
): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.conversationMessage.aggregate({
      where: { conversationId },
      _max: { orderIndex: true },
    });
    const startIndex = (agg._max.orderIndex ?? -1) + 1;

    await tx.conversationMessage.createMany({
      data: messages.map((m, i) => ({
        conversationId,
        orderIndex: startIndex + i,
        role: m.role,
        content: m.content,
        toolCalls: toToolCallsJson(m.toolCalls),
        attachments: toAttachmentsJson(m.attachments),
      })),
    });

    const assistantMessages = await tx.conversationMessage.findMany({
      where: { conversationId, role: "assistant", orderIndex: { gte: startIndex } },
      select: { id: true },
    });
    return assistantMessages.map((m) => m.id);
  });
}

/** 整批取代 conversation 的訊息（delete + createMany in transaction），回傳 assistant message IDs */
export async function replaceMessages(
  conversationId: string,
  messages: Message[]
): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    await tx.conversationMessage.deleteMany({ where: { conversationId } });
    await tx.conversationMessage.createMany({
      data: messages.map((m, i) => ({
        conversationId,
        orderIndex: i,
        role: m.role,
        content: m.content,
        toolCalls: toToolCallsJson(m.toolCalls),
        attachments: toAttachmentsJson(m.attachments),
      })),
    });
    const assistantMessages = await tx.conversationMessage.findMany({
      where: { conversationId, role: "assistant" },
      select: { id: true },
    });
    return assistantMessages.map((m) => m.id);
  });
}

/** 建立 conversation 並同時寫入訊息 */
export async function createConversationWithMessages(params: {
  title: string;
  model: string | null;
  userId: string;
  messages: Message[];
  dataSources?: string[];
}): Promise<{ conversation: Record<string, unknown>; assistantMessageIds: string[] }> {
  const { title, model, userId, messages, dataSources } = params;

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        title,
        model,
        userId,
        ...(dataSources && dataSources.length > 0 ? { dataSources } : {}),
      },
    });

    if (messages.length > 0) {
      await tx.conversationMessage.createMany({
        data: messages.map((m, i) => ({
          conversationId: conversation.id,
          orderIndex: i,
          role: m.role,
          content: m.content,
          toolCalls: toToolCallsJson(m.toolCalls),
        })),
      });
    }

    const assistantMessages = await tx.conversationMessage.findMany({
      where: { conversationId: conversation.id, role: "assistant" },
      select: { id: true },
    });

    return {
      conversation,
      assistantMessageIds: assistantMessages.map((m) => m.id),
    };
  });
}

/** 將 orphan TokenUsage records 連結到指定的 assistant message */
export async function linkOrphanTokenUsage(
  userId: string,
  conversationMessageId: string
): Promise<void> {
  await prisma.tokenUsage.updateMany({
    where: {
      userId,
      conversationMessageId: null,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    data: { conversationMessageId },
  });
}
