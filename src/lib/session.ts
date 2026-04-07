import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

/**
 * Get the current user session.
 * Wraps getServerSession with dynamic auth options.
 */
export async function getSession() {
  return getServerSession(await getAuthOptions());
}
