// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version ?? "1.0.0",
      ),
    },
    optimizeDeps: {
      exclude: ["astro:transitions"],
    },
  },
  integrations: [react()],
})
