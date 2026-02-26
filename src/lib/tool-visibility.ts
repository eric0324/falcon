import { Prisma, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Build a Prisma where filter for tools visible to a given user.
 * - PRIVATE: only the author (handled separately by caller if needed)
 * - GROUP: author shares at least one Group with the viewer
 * - COMPANY: all authenticated users
 * - PUBLIC: everyone
 */
export function buildVisibilityFilter(userId: string): Prisma.ToolWhereInput {
  return {
    OR: [
      { visibility: Visibility.PUBLIC },
      { visibility: Visibility.COMPANY },
      {
        visibility: Visibility.GROUP,
        author: {
          groups: {
            some: {
              users: {
                some: { id: userId },
              },
            },
          },
        },
      },
    ],
  };
}

/**
 * Check if a specific user can access a specific tool.
 * Returns true if the user is the author or the tool's visibility allows access.
 */
export async function canUserAccessTool(
  tool: { id: string; authorId: string; visibility: Visibility },
  userId: string
): Promise<boolean> {
  // Author always has access
  if (tool.authorId === userId) return true;

  switch (tool.visibility) {
    case Visibility.PUBLIC:
    case Visibility.COMPANY:
      return true;

    case Visibility.GROUP: {
      // Check if viewer and author share at least one Group
      const sharedGroup = await prisma.group.findFirst({
        where: {
          users: { some: { id: tool.authorId } },
          AND: {
            users: { some: { id: userId } },
          },
        },
        select: { id: true },
      });
      return sharedGroup !== null;
    }

    case Visibility.PRIVATE:
    default:
      return false;
  }
}
