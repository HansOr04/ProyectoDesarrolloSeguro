FROM node:18-alpine
WORKDIR /app/services/auth-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/auth-service
COPY services/auth-service/package*.json ./
RUN npm install --omit=dev
COPY services/auth-service/ .

RUN mkdir -p logs
EXPOSE 5001
CMD ["node", "src/server.js"]
