import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Build estático (SPA) para hospedagem na Hostinger.
// `npm run build` gera a pasta `dist/`, cujo conteúdo vai para `public_html`.
export default defineConfig({
  plugins: [
    // Precisa vir antes do plugin do React: gera src/routeTree.gen.ts a partir de src/routes.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
});
