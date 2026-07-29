import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
});
