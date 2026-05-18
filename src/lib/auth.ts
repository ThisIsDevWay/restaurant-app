import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    // signIn: only validate Google users against the DB.
    // Credentials are already validated in authorize().
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const [dbUser] = await db
          .select({ id: users.id, image: users.image, name: users.name })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        if (!dbUser) return false;
        // Backfill Google profile fields if missing
        const updates: Record<string, string> = {};
        if (user.image && !dbUser.image) updates.image = user.image;
        if (user.name && !dbUser.name) updates.name = user.name;
        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, dbUser.id));
        }
        return true;
      }
      return true;
    },

    // JWT: extend base callback. For Google users, resolve DB id/role by email.
    // For all logged-in users on subsequent calls, re-validate role from DB.
    async jwt(params) {
      const { token, user, account } = params;

      // Call base jwt (sets id/role for credentials)
      let baseToken = token;
      if (authConfig.callbacks?.jwt) {
        baseToken = (await authConfig.callbacks.jwt(params)) || token;
      }

      // Google sign-in: lookup our DB user by email and override id/role
      if (user && account?.provider === "google" && user.email) {
        try {
          const [dbUser] = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);
          if (dbUser) {
            baseToken.id = dbUser.id;
            baseToken.role = dbUser.role;
          }
        } catch (err) {
          console.error("JWT Google DB lookup failed:", err);
        }
      }

      // Subsequent calls (no `user`): re-validate role from DB so role changes propagate
      if (!user && baseToken.id && process.env.NEXT_RUNTIME !== "edge") {
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
  if (!["admin", "waiter", "cashier"].includes(session.user.role)) {
    redirect("/login");
  }
  return session;
};

export const requireCashierOrAdmin = async () => {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!["admin", "cashier"].includes(session.user.role)) {
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
