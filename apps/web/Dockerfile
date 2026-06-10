FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web
RUN npm install
WORKDIR /app/apps/web
RUN npm run build
CMD ["npm", "start"]
