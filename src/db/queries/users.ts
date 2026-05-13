"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "kitchen" | "waiter";
  hasPassword: boolean;
  createdAt: Date;
};

export async function getAllUsers(): Promise<UserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      hasPassword: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return rows.map((r) => ({
    ...r,
    hasPassword: r.hasPassword !== null,
  }));
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      hasPassword: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;
  return { ...row, hasPassword: row.hasPassword !== null };
}
