import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths work under the GitHub Pages repository URL and custom domains.
  base: "./",
  assetsInclude: ["**/*.glb"],
  build: { assetsInlineLimit: 0 },
});
