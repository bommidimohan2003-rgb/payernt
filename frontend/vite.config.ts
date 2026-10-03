import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("framer-motion")) return "vendor-animation";
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("leaflet")) return "vendor-leaflet";
            if (id.includes("@tanstack")) return "vendor-tanstack";
          }
        },
      },
    },
  },
  ssr: {
    noExternal: ["firebase", "@firebase/app", "@firebase/auth"],
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/auth"],
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      // Remove COOP restriction so Google Sign-In popup can call window.close/closed on opener
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  plugins: [
    tanstackStart({
      server: { entry: "src/server.ts" },
    }),
    tailwindcss(),
    react(),
    cloudflare({
      viteEnvironment: {
        name: "ssr"
      }
    }),
  ],
});