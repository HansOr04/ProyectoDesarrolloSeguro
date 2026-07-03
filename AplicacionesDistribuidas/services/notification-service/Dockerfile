FROM node:18-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && npm install -g pnpm

WORKDIR /app/shared
COPY shared /app/shared
RUN pnpm install --prod

WORKDIR /app/services/notification-service
COPY services/notification-service/package.json ./
RUN pnpm install --prod
COPY services/notification-service/ .

RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5005/health || exit 1
CMD ["node", "src/server.js"]
