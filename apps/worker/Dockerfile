FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN npm install
RUN npm run db:generate
RUN npm run build -w @whatsapp-sender/contracts
RUN npm run build -w @whatsapp-sender/database
RUN npm run build -w @whatsapp-sender/worker
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
