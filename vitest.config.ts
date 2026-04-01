import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Aliases para evitar que next-auth@5-beta explote en entorno jsdom
      "next/server": path.resolve(__dirname, "./tests/__mocks__/next-server.ts"),
      "next/cache": path.resolve(__dirname, "./tests/__mocks__/next-cache.ts"),
      "next/navigation": path.resolve(__dirname, "./tests/__mocks__/next-navigation.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
