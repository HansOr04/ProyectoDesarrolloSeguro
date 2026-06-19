FROM node:18-alpine
WORKDIR /app/services/notification-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/notification-service
COPY services/notification-service/package*.json ./
RUN npm install --omit=dev
COPY services/notification-service/ .

RUN mkdir -p logs
EXPOSE 5005
CMD ["node", "src/server.js"]
