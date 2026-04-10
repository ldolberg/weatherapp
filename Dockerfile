# Build frontend
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Run Express + Supabase Postgres + cron
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY lib ./lib

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
