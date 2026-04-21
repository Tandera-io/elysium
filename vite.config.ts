import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_", "PIXELLAB_", "ELEVENLABS_", "OPENAI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  // Exclui o transformers e o onnxruntime-web do pre-bundle do esbuild.
  // Ambos carregam WASM via glue mjs que o esbuild reescreve de forma
  // inconsistente — o sintoma é "Failed to fetch dynamically imported
  // module: blob:..." no load do backend WASM. Se o ORT falhar mesmo
  // assim (dev snapshots do HF são instáveis em WebView2), o KB em
  // `src/lib/kb.ts` cai no modo lexical e a aplicação segue.
  optimizeDeps: {
    exclude: ["@huggingface/transformers", "onnxruntime-web"],
  },
}));
