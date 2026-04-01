/**
 * Mock of `next/cache` for Vitest.
 */
import { vi } from "vitest";
export const revalidatePath = vi.fn();
export const revalidateTag = vi.fn();
export const unstable_cache = vi.fn((fn: Function) => fn);
