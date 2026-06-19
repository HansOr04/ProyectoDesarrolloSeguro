FROM node:18-alpine
WORKDIR /app/services/followup-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/followup-service
COPY services/followup-service/package*.json ./
RUN npm install --omit=dev
COPY services/followup-service/ .

RUN mkdir -p logs
EXPOSE 5006
CMD ["node", "src/server.js"]
