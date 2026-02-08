import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "../",
  resolve: {
    conditions: ["@convex-dev/component-source"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
