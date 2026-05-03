import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string | undefined;
        const password = credentials.password as string | undefined;

        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session, account, profile, isNewUser }) {
      // Call base jwt callback
      let baseToken = token;
      if (authConfig.callbacks?.jwt) {
        // @ts-ignore
        baseToken = await authConfig.callbacks.jwt({ token, user, trigger, session, account, profile, isNewUser }) || token;
      }

      if (!user && baseToken.id && process.env.NEXT_RUNTIME !== "edge") {
        // Re-validate role from DB to detect downgraded roles immediately
        try {
          const [dbUser] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, baseToken.id as string))
            .limit(1);

          if (dbUser) {
            baseToken.role = dbUser.role;
          }
        } catch (err) {
          console.error("JWT role revalidation failed:", err);
        }
      }
      return baseToken;
    },
  },
});

export { handlers, auth, signIn, signOut };

export const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    redirect("/login");
  }
  return session;
};

export const requireKitchenOrAdmin = async () => {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!["admin", "kitchen"].includes(session.user.role)) {
    redirect("/login");
  }
  return session;
};

export const requireWaiterOrAdmin = async () => {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!["admin", "waiter"].includes(session.user.role)) {
    redirect("/login");
  }
  return session;
};

declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
