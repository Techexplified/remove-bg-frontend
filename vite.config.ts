import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { renameSync } from "fs";
import path from "path";

function renameToUiHtml() {
  return {
    name: "rename-to-ui-html",
    closeBundle() { renameSync("dist/index.html", "dist/ui.html"); }
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), renameToUiHtml()],
  root: "src-ui",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src-ui") }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    target: "es2017",
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { input: "src-ui/index.html" }
  }
});
