# ──────────────────────────────────────────────
# Stage 1 — Backend build
# ──────────────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build && npm prune --production


# ──────────────────────────────────────────────
# Stage 2 — Frontend build
# ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
RUN yarn build


# ──────────────────────────────────────────────
# Stage 3 — Backend runtime
# ──────────────────────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package.json ./package.json

EXPOSE 9022
CMD ["node", "dist/main.js"]


# ──────────────────────────────────────────────
# Stage 4 — Frontend runtime
# ──────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=frontend-build /app/frontend/.next/standalone ./
COPY --from=frontend-build /app/frontend/.next/static ./.next/static
COPY --from=frontend-build /app/frontend/public ./public

EXPOSE 3000
CMD ["node", "server.js"]