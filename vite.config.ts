import { defineConfig } from "vite";

// 5174 by default so the 2D prototype's dev server (5173) can run alongside.
// PORT env overrides, matching the convention established in the 2D project.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5174,
  },
});
