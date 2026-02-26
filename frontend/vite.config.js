import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:5050", // use 127.0.0.1 to avoid IPv6/localhost quirks
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
