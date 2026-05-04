import { prisma } from "@/lib/prisma";
import { buildVisibilityFilter } from "@/lib/tool-visibility";

export async function getFavoriteToolIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.toolFavorite.findMany({
    where: { userId },
    select: { toolId: true },
  });
  return new Set(rows.map((r) => r.toolId));
}

interface GetFavoritedToolsOptions {
  take?: number;
}

export async function getFavoritedTools(
  userId: string,
  opts: GetFavoritedToolsOptions = {}
) {
  const { take = 12 } = opts;

  const favorites = await prisma.toolFavorite.findMany({
    where: {
      userId,
      tool: buildVisibilityFilter(userId),
    },
    include: {
      tool: {
        include: {
          author: { select: { id: true, name: true, image: true } },
          stats: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return favorites.map((f) => f.tool);
}
