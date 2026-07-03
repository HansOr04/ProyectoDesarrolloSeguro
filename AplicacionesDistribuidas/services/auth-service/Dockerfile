FROM node:18-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && npm install -g pnpm

WORKDIR /app/shared
COPY shared /app/shared
RUN pnpm install --prod

WORKDIR /app/services/auth-service
COPY services/auth-service/package.json ./
RUN pnpm install --prod
COPY services/auth-service/ .

RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1
CMD ["node", "src/server.js"]
