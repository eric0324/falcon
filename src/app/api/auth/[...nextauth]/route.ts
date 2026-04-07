import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

async function handler(req: Request, ctx: { params: { nextauth: string[] } }) {
  const authOptions = await getAuthOptions();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextAuth(req as any, ctx as any, authOptions);
}

export { handler as GET, handler as POST };
