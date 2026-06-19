FROM node:18-alpine
WORKDIR /app/services/patient-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/patient-service
COPY services/patient-service/package*.json ./
RUN npm install --omit=dev
COPY services/patient-service/ .

RUN mkdir -p logs
EXPOSE 5002
CMD ["node", "src/server.js"]
