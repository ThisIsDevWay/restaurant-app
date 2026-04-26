"use server";

import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import {
  createFixture,
  updateFixture,
  deleteFixture,
  upsertFixtureLayout,
} from "@/db/queries/floor-fixtures";
import { revalidatePath } from "next/cache";

const fixtureSchema = v.object({
  type: v.picklist([
    "wall_h", "wall_v", "door", "door_double", "window", "bar_counter",
    "kitchen_pass", "cashier", "column", "stairs", "bathroom", "bathroom_m",
    "bathroom_f", "plant", "divider", "text_label",
  ]),
  label: v.optional(v.union([v.string(), v.null_()])),
  gridCol: v.pipe(v.number(), v.integer(), v.minValue(1)),
  gridRow: v.pipe(v.number(), v.integer(), v.minValue(1)),
  colSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
  rowSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(14)),
  rotation: v.picklist([0, 90, 180, 270]),
});

export const createFixtureAction = adminActionClient
  .schema(fixtureSchema)
  .action(async ({ parsedInput }) => {
    // Transform null to undefined or keep it, since label is text
    const fixture = await createFixture({
      ...parsedInput,
      label: parsedInput.label ?? null,
    });
    revalidatePath("/admin/tables");
    return { success: true, fixture };
  });

export const updateFixtureAction = adminActionClient
  .schema(v.intersect([
    v.partial(fixtureSchema),
    v.object({
      id: v.string(),
    }),
  ]))
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    const fixture = await updateFixture(id, data as any);
    revalidatePath("/admin/tables");
    return { success: true, fixture };
  });

export const deleteFixtureAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput }) => {
    await deleteFixture(parsedInput.id);
    revalidatePath("/admin/tables");
    return { success: true };
  });

export const saveFixtureLayoutAction = adminActionClient
  .schema(v.object({
    updates: v.array(v.object({
      id: v.string(),
      gridCol: v.number(),
      gridRow: v.number(),
      colSpan: v.number(),
      rowSpan: v.number(),
      rotation: v.picklist([0, 90, 180, 270]),
    }))
  }))
  .action(async ({ parsedInput }) => {
    await upsertFixtureLayout(parsedInput.updates);
    revalidatePath("/admin/tables");
    return { success: true };
  });
