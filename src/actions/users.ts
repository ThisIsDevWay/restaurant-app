"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminActionClient } from "@/lib/safe-action";
import bcrypt from "bcryptjs";
import * as v from "valibot";

const roleEnum = v.picklist(["admin", "kitchen", "waiter"] as const);

export const createUserAction = adminActionClient
  .schema(
    v.object({
      name: v.pipe(v.string(), v.minLength(1, "El nombre es requerido")),
      email: v.pipe(v.string(), v.email("Email inválido")),
      role: roleEnum,
      password: v.optional(
        v.pipe(v.string(), v.minLength(8, "Mínimo 8 caracteres"))
      ),
    })
  )
  .action(async ({ parsedInput: { name, email, role, password } }) => {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "Ya existe un usuario con ese email" };
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const [user] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    revalidatePath("/admin/users");
    return { success: true, user };
  });

export const updateUserAction = adminActionClient
  .schema(
    v.object({
      id: v.string(),
      name: v.pipe(v.string(), v.minLength(1, "El nombre es requerido")),
      role: roleEnum,
      password: v.optional(
        v.union([
          v.literal(""),
          v.pipe(v.string(), v.minLength(8, "Mínimo 8 caracteres")),
        ])
      ),
    })
  )
  .action(async ({ parsedInput: { id, name, role, password } }) => {
    const updates: Record<string, unknown> = { name, role };

    if (password && password.length >= 8) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    await db.update(users).set(updates).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  });

export const deleteUserAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput: { id }, ctx }) => {
    // Prevent self-deletion
    if (ctx.user.id === id) {
      return { success: false, error: "No puedes eliminar tu propia cuenta" };
    }
    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  });

export const removeUserPasswordAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput: { id } }) => {
    await db.update(users).set({ passwordHash: null }).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  });
