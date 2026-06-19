FROM node:18-alpine
WORKDIR /app/services/analytics-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/analytics-service
COPY services/analytics-service/package*.json ./
RUN npm install --omit=dev
COPY services/analytics-service/ .

RUN mkdir -p logs exports
EXPOSE 5007
CMD ["node", "src/server.js"]
