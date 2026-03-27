import { Prisma, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Build a Prisma where filter for tools visible to a given user.
 * - PRIVATE: only the author (handled separately by caller if needed)
 * - GROUP: tool's allowedGroups contains at least one group the viewer belongs to
 * - COMPANY: all authenticated users
 * - PUBLIC: everyone
 */
export function buildVisibilityFilter(userId: string): Prisma.ToolWhereInput {
  return {
    status: "PUBLISHED",
    OR: [
      { visibility: Visibility.PUBLIC },
      { visibility: Visibility.COMPANY },
      {
        visibility: Visibility.GROUP,
        allowedGroups: {
          some: {
            users: {
              some: { id: userId },
            },
          },
        },
      },
      // Author always sees their own tools
      { authorId: userId },
    ],
  };
}

/**
 * Check if a specific user can access a specific tool.
 * Returns true if the user is the author or the tool's visibility allows access.
 */
export async function canUserAccessTool(
  tool: { id: string; authorId: string; visibility: Visibility; status?: string },
  userId: string
): Promise<boolean> {
  // Author always has access
  if (tool.authorId === userId) return true;

  // DRAFT tools are only accessible by author
  if (tool.status === "DRAFT") return false;

  switch (tool.visibility) {
    case Visibility.PUBLIC:
    case Visibility.COMPANY:
      return true;

    case Visibility.GROUP: {
      // Check if any of the tool's allowedGroups contains the viewer
      const matchingGroup = await prisma.group.findFirst({
        where: {
          tools: { some: { id: tool.id } },
          users: { some: { id: userId } },
        },
        select: { id: true },
      });
      return matchingGroup !== null;
    }

    case Visibility.PRIVATE:
    default:
      return false;
  }
}
