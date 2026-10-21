import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

// Build estático (SPA) para hospedagem na Hostinger.
// `npm run build` gera a pasta `dist/`, cujo conteúdo vai para `public_html`.
export default defineConfig({
  plugins: [
    // Precisa vir antes do plugin do React: gera src/routeTree.gen.ts a partir de src/routes.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    // Aplicativo instalável (PWA). A tela do app fica em cache no aparelho; os dados do
    // Supabase não, então sempre vêm atualizados. Quando sai uma versão nova, o app avisa
    // (src/components/atualizacao-app.tsx) e só recarrega quando o usuário pede.
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Pulsar",
        short_name: "Pulsar",
        description: "Painel de gestão Pulsar — Financeiro, Comercial, Marketing e Pessoal",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#f5f5f5",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
});
