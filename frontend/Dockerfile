FROM node:20-alpine AS builder

WORKDIR /app

ARG API_BASE_URL=http://localhost:3103
ARG WEBSOCKET_URL=http://localhost:3103

ENV API_BASE_URL=${API_BASE_URL}
ENV WEBSOCKET_URL=${WEBSOCKET_URL}

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY next.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]
