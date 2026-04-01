/**
 * Mock of `next/navigation` for Vitest.
 */
import { vi } from "vitest";
export const redirect = vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
});
export const useRouter = vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
}));
export const usePathname = vi.fn(() => "/");
export const useSearchParams = vi.fn(() => new URLSearchParams());
