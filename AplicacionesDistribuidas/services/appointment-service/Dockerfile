FROM node:18-alpine
WORKDIR /app/services/appointment-service

# Copy shared utilities to maintain relative path ../../../shared
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install --omit=dev

# Copy and install service
WORKDIR /app/services/appointment-service
COPY services/appointment-service/package*.json ./
RUN npm install --omit=dev
COPY services/appointment-service/ .

RUN mkdir -p logs uploads/prescriptions uploads/referrals
EXPOSE 5004
CMD ["node", "src/server.js"]
