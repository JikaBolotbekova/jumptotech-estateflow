FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app

# Pick up patched Alpine OS packages (openssl/musl/zlib etc.) released after this base image was built.
RUN apk update && apk upgrade --no-cache

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY migrations ./migrations

# The npm CLI (and its bundled tar/pacote/sigstore/minimatch) is only needed to install
# dependencies in the "deps" stage above — remove it from the runtime image since the
# container only ever runs `node src/server.js`, shrinking the attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn*

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
