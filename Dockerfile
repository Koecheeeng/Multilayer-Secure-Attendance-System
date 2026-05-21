# ---------- Stage 1: Install dependencies ----------
FROM node:20-alpine AS deps

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: Production image ----------
FROM node:20-alpine

LABEL maintainer="Fahreza"
LABEL description="Multilayer Secure Attendance System"

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy backend source and installed dependencies as non-root user
COPY --chown=appuser:appgroup --from=deps /app/backend/node_modules ./backend/node_modules
COPY --chown=appuser:appgroup backend/ ./backend/

# Copy frontend (served statically by Express) as non-root user
COPY --chown=appuser:appgroup frontend/ ./frontend/

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/ || exit 1

WORKDIR /app/backend

CMD ["node", "server.js"]
