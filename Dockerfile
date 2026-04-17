# Stage 1: Build Nakama TypeScript runtime
FROM node:20-alpine AS builder
WORKDIR /build
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npx tsc

# Stage 2: Nakama server with compiled runtime
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2
COPY --from=builder /build/build/main.js /nakama/data/modules/build/main.js
COPY local.yml /nakama/data/local.yml
COPY docker-entrypoint.sh /nakama/docker-entrypoint.sh
RUN chmod +x /nakama/docker-entrypoint.sh
EXPOSE 7350 7351
ENTRYPOINT ["/nakama/docker-entrypoint.sh"]
