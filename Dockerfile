# Build do front (Vite) — variáveis VITE_* são embutidas no bundle nesta etapa
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Opcional: variáveis VITE_* — configure como Build Args no deploy (ex.: Dokploy)
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

# Opcional no Dokploy: defina build-arg CACHEBUST (ex.: hash do commit ou timestamp) para ignorar cache antigo da etapa de build
ARG CACHEBUST=1
RUN echo "cachebust=${CACHEBUST}" && npm run build

# Imagem final: só nginx + arquivos estáticos
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
