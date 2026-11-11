import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    proxy: {"/api/": process.env.SUDOKU_API_ORIGIN || "http://127.0.0.1:5616", ...(process.env.SUDOKU_POINTS_TEST === "true" ? {"/__points-test/":process.env.SUDOKU_API_ORIGIN || "http://127.0.0.1:5652"}: {})},
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
