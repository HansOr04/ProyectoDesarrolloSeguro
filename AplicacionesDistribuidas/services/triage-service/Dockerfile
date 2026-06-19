FROM node:18-alpine
WORKDIR /app/services/triage-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/triage-service
COPY services/triage-service/package*.json ./
RUN npm install --omit=dev
COPY services/triage-service/ .

RUN mkdir -p logs
EXPOSE 5003
CMD ["node", "src/server.js"]
