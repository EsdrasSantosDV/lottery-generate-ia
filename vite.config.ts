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
          /** Cabeçalhos que o Chrome manda em fetch(localhost) e que o proxy repassava ao upstream.
           * `Sec-Fetch-Site: same-origin` + Host da Caixa confunde o WAF (parece inconsistência). */
          const stripFromUpstream = [
            "sec-fetch-site",
            "sec-fetch-mode",
            "sec-fetch-dest",
            "sec-fetch-user",
            "sec-ch-ua",
            "sec-ch-ua-mobile",
            "sec-ch-ua-platform",
            "origin",
            "referer",
            "priority",
          ];
          proxy.on("proxyReq", (proxyReq) => {
            for (const h of stripFromUpstream) {
              try {
                proxyReq.removeHeader(h);
              } catch {
                /* ignore */
              }
            }
            // Contexto do portal (o que a API espera).
            proxyReq.setHeader("Referer", "https://loterias.caixa.gov.br/");
            proxyReq.setHeader("Origin", "https://loterias.caixa.gov.br");
            proxyReq.setHeader(
              "User-Agent",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            );
            proxyReq.setHeader("Accept", "application/json, text/plain, */*");
            proxyReq.setHeader("Accept-Language", "pt-BR,pt;q=0.9");
            proxyReq.setHeader("Sec-Fetch-Dest", "empty");
            proxyReq.setHeader("Sec-Fetch-Mode", "cors");
            proxyReq.setHeader("Sec-Fetch-Site", "cross-site");
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
