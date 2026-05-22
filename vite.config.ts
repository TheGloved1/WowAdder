import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  if (
    !env.VITE_CURSEFORGE_API_KEY ||
    env.VITE_CURSEFORGE_API_KEY === "your_curseforge_api_key_here"
  ) {
    console.warn(
      "\x1b[33m⚠ WARNING: VITE_CURSEFORGE_API_KEY is not set or is the placeholder value.\n" +
        "  The app will show an API key warning banner at runtime.\n" +
        "  Set it in .env or pass VITE_CURSEFORGE_API_KEY=your_key via environment.\x1b[0m",
    );
  }

  return {
    plugins: [tailwindcss(), react()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
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
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
