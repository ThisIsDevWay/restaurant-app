import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const { handlers, auth, signIn, signOut } = NextAuth({
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
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        const allowedRoles = ["admin", "kitchen", "user"];
        token.role = allowedRoles.includes(user.role as string)
          ? (user.role as string)
          : "user";
      } else if (token.id && process.env.NEXT_RUNTIME !== "edge") {
        // Re-validate role from DB to detect downgraded roles immediately
        // Skip in Edge (Middleware) to avoid "net" module error
        try {
          const [dbUser] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);

          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch (err) {
          console.error("JWT role revalidation failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
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
