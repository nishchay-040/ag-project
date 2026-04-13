# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Only prod deps in final image; install everything here to allow deterministic install
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && cp -R node_modules /tmp/prod_node_modules \
 && npm install

COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache tini

COPY --from=build /tmp/prod_node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/seeds ./seeds
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
