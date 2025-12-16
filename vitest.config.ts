import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/agua_clara";
process.env.NEXT_PUBLIC_APP_NAME ??= "Água Clara";
process.env.NEXT_PUBLIC_APP_DESCRIPTION ??= "Sistema de Monitoramento de Água";
process.env.AUTH_SECRET ??= "test_secret";
process.env.AUTH_GOOGLE_ID ??= "test_google_id";
process.env.AUTH_GOOGLE_SECRET ??= "test_google_secret";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": resolve(rootDir, "src/test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["**/*.d.ts", ".next/**", "drizzle/**", "scripts/**"],
    },
  },
});
