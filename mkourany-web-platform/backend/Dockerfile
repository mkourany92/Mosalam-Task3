FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 build-essential default-libmysqlclient-dev pkg-config curl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY src ./src

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "src/index.js"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1