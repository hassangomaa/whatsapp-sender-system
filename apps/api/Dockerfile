FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install
RUN npm run db:generate
RUN npm run build -w @whatsapp-sender/contracts
RUN npm run build -w @whatsapp-sender/database
RUN npm run build -w @whatsapp-sender/api
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
