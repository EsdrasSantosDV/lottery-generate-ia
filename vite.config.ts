import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api-caixa": {
        target: "https://servicebus3.caixa.gov.br",
        changeOrigin: true,
        // Node (proxy) não confia na cadeia do certificado da Caixa em alguns ambientes — só em dev.
        secure: false,
        rewrite: (p) => p.replace(/^\/api-caixa/, "/portaldeloterias/api"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Upstream exige contexto do portal; sem isso costuma retornar 403.
            proxyReq.setHeader("Referer", "https://loterias.caixa.gov.br/");
            proxyReq.setHeader("Origin", "https://loterias.caixa.gov.br");
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
