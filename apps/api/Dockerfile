# Imagen de producción de la API (construir desde la raíz del monorepo):
#   docker build -f apps/api/Dockerfile -t portfolio-api .
FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pnpm install --frozen-lockfile --filter @portfolio/api... \
 && node_modules/.bin/tsc -p packages/schemas/tsconfig.json \
 && cd apps/api && ../../node_modules/.bin/prisma generate && ../../node_modules/.bin/tsc -p tsconfig.build.json

FROM node:24-bookworm-slim
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy && node dist/main.js"]
