FROM node:24-alpine AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:24-alpine AS backend-build
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=backend-build /build/dist ./dist
COPY --from=frontend-build /build/dist ./public
ENV NODE_ENV=production PORT=8103 FRONTEND_DIR=/app/public
EXPOSE 8103
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://localhost:8103/api/health || exit 1
CMD ["node", "dist/index.js"]
