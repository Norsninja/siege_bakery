import { defineConfig } from "vite";

// 5174 by default so the 2D prototype's dev server (5173) can run alongside.
// PORT env overrides, matching the convention established in the 2D project.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5174,
  },
  build: {
    // The engines are ~2.5MB of the 2.8MB bundle (rapier base64-embeds its
    // WASM; three is ~700KB) and they change only on dependency bumps.
    // Split them out so an app-code change re-ships a few KB through the
    // friend's tunnel, not the whole engine stack (audit 2026-07-07).
    rollupOptions: {
      output: {
        // Function form: vite 8's rolldown does not take the object form.
        manualChunks(id: string): string | undefined {
          if (id.includes("@dimforge")) return "rapier";
          if (/node_modules[/\\]three[/\\]/.test(id)) return "three";
          return undefined;
        },
      },
    },
  },
});
