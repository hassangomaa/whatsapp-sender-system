FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web
RUN npm install
WORKDIR /app/apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3010
ARG NEXT_PUBLIC_WEB_URL=http://localhost:3011
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL
RUN npm run build
CMD ["npm", "start"]
