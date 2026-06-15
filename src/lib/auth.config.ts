import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // Empty array for Edge compatibility, providers added in auth.ts
  callbacks: {
    // Base JWT callback — edge-compatible (no DB calls).
    // Runs for both initial sign-in (sets id/role from user) and subsequent calls (passes through).
    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id as string) ?? token.id;
        const allowedRoles = ["admin", "kitchen", "waiter", "cashier", "user"];
        if (user.role && allowedRoles.includes(user.role as string)) {
          token.role = user.role as string;
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
} satisfies NextAuthConfig;
