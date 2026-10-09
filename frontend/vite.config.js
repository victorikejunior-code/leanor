import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the Vite dev server proxies API + uploaded files
// to the FastAPI backend.
const backend = process.env.VITE_BACKEND_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 39573,
    strictPort: true,
    proxy: {
      "/api": backend,
      "/uploads": backend,
    },
  },
});
