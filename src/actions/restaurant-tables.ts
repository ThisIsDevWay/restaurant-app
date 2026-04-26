"use server";

import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import {
  createTable,
  updateTable,
  deleteTable,
  regenerateToken,
  upsertTableLayout,
  labelExists,
  updateTablesSortOrder,
} from "@/db/queries/restaurant-tables";
import { updateSettings } from "@/db/queries/settings";
import { revalidatePath } from "next/cache";

const tableSchema = v.object({
  label: v.pipe(v.string(), v.minLength(1, "Requerido"), v.maxLength(50)),
  section: v.pipe(
    v.optional(v.union([v.string(), v.null_()]), "Principal"),
    v.transform((val) => val ?? "Principal")
  ),
  capacity: v.pipe(v.number(), v.minValue(1), v.maxValue(30)),
  shape: v.picklist(["cuadrada", "rectangular", "circular"]),
  rotation: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(315)), 0),
  gridCol: v.pipe(v.number(), v.integer(), v.minValue(1)),
  gridRow: v.pipe(v.number(), v.integer(), v.minValue(1)),
  colSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  rowSpan: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  isActive: v.optional(v.boolean(), true),
});

export const createTableAction = adminActionClient
  .schema(tableSchema)
  .action(async ({ parsedInput }) => {
    // Unique label check
    if (await labelExists(parsedInput.label)) {
      return { success: false, error: `Ya existe una mesa llamada "${parsedInput.label}"` };
    }
    const table = await createTable(parsedInput);
    revalidatePath("/admin/tables");
    return { success: true, table };
  });

export const updateTableAction = adminActionClient
  .schema(v.intersect([
    v.partial(v.omit(tableSchema, ["section", "isActive"])),
    v.object({
      id: v.string(),
      section: v.optional(v.union([v.string(), v.null_()])),
      isActive: v.optional(v.boolean()),
    }),
  ]))
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    // Unique label check (excluding self)
    if (data.label && await labelExists(data.label, id)) {
      return { success: false, error: `Ya existe una mesa llamada "${data.label}"` };
    }
    // Transform null to "Principal" for section if provided
    const updateData = {
      ...data,
      section: data.section === null ? "Principal" : data.section,
    };
    const table = await updateTable(id, updateData as any);
    revalidatePath("/admin/tables");
    return { success: true, table };
  });

export const deleteTableAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput }) => {
    await deleteTable(parsedInput.id);
    revalidatePath("/admin/tables");
    return { success: true };
  });

export const saveTableLayoutAction = adminActionClient
  .schema(v.object({
    updates: v.array(v.object({
      id: v.string(),
      gridCol: v.number(),
      gridRow: v.number(),
      colSpan: v.number(),
      rowSpan: v.number(),
      rotation: v.optional(v.number()),
    }))
  }))
  .action(async ({ parsedInput }) => {
    await upsertTableLayout(parsedInput.updates);
    revalidatePath("/admin/tables");
    return { success: true };
  });

export const regenerateTokenAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput }) => {
    const result = await regenerateToken(parsedInput.id);
    revalidatePath("/admin/tables");
    return { success: true, ...result };
  });

export const updateGridSizeAction = adminActionClient
  .schema(v.object({
    cols: v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(100)),
    rows: v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(100)),
  }))
  .action(async ({ parsedInput }) => {
    await updateSettings({
      tablesGridCols: parsedInput.cols,
      tablesGridRows: parsedInput.rows,
    });
    revalidatePath("/admin/tables");
    return { success: true };
  });

export const saveTableSortOrderAction = adminActionClient
  .schema(v.object({
    orderedIds: v.array(v.string())
  }))
  .action(async ({ parsedInput }) => {
    await updateTablesSortOrder(parsedInput.orderedIds);
    revalidatePath("/admin/tables");
    return { success: true };
  });
