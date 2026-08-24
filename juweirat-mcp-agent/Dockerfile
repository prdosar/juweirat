# syntax=docker/dockerfile:1.7
#
# Image de l'agent conversationnel Juweirat.
# Bundle juweirat-mcp + juweirat-mcp-agent : l'agent spawn le mcp en subprocess stdio.
#
# Contexte de build : racine du monorepo (voir docker-compose.yml)
#   docker compose build juweirat-mcp-agent

# ─── Stage 1 : build juweirat-mcp ────────────────────────────────────────────
FROM node:20-alpine AS mcp-build
WORKDIR /build
COPY juweirat-mcp/package.json juweirat-mcp/package-lock.json ./
RUN npm ci --fetch-timeout=600000 --fetch-retries=5
COPY juweirat-mcp/tsconfig.json ./
COPY juweirat-mcp/src ./src
RUN npm run build

# ─── Stage 2 : build juweirat-mcp-agent ──────────────────────────────────────
FROM node:20-alpine AS agent-build
WORKDIR /build
COPY juweirat-mcp-agent/package.json juweirat-mcp-agent/package-lock.json ./
RUN npm ci --fetch-timeout=600000 --fetch-retries=5
COPY juweirat-mcp-agent/tsconfig.json ./
COPY juweirat-mcp-agent/src ./src
RUN npm run build

# ─── Stage 3 : runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production

# juweirat-mcp : deps prod + dist compilé.
WORKDIR /app/juweirat-mcp
COPY juweirat-mcp/package.json juweirat-mcp/package-lock.json ./
RUN npm ci --omit=dev --fetch-timeout=600000 --fetch-retries=5
COPY --from=mcp-build /build/dist ./dist

# juweirat-mcp-agent : deps prod + dist compilé.
WORKDIR /app/juweirat-mcp-agent
COPY juweirat-mcp-agent/package.json juweirat-mcp-agent/package-lock.json ./
RUN npm ci --omit=dev --fetch-timeout=600000 --fetch-retries=5
COPY --from=agent-build /build/dist ./dist

# Pointe l'agent sur le mcp bundlé dans la même image.
ENV MCP_SERVER_ENTRY=/app/juweirat-mcp/dist/index.js

EXPOSE 3010
CMD ["node", "dist/index.js"]
