import path from "path"
import { readFileSync } from "fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

function getVersion(): string {
  // In Docker, version comes from env var. Locally, read from root package.json.
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION
  try {
    const rootPkg = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
    )
    return rootPkg.version
  } catch {
    return "0.0.0"
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
})
