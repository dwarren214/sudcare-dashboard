import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    pool: "forks",
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/": path.resolve(__dirname, "src") + "/",
    },
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
