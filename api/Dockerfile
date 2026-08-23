FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS pot-provider

ARG BGUTIL_POT_COMMIT=7511309af023b09788dc8f2efc96cc3671291e6c
ARG BGUTIL_POT_SHA256=23a97f0537e278b9b52025b0a911b4459a752450895d4e28ae7dfa673dbd5c8d

WORKDIR /provider
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL "https://codeload.github.com/Brainicism/bgutil-ytdlp-pot-provider/tar.gz/${BGUTIL_POT_COMMIT}" -o /tmp/bgutil-pot-provider.tar.gz \
  && echo "${BGUTIL_POT_SHA256}  /tmp/bgutil-pot-provider.tar.gz" | sha256sum -c - \
  && tar -xzf /tmp/bgutil-pot-provider.tar.gz --strip-components=1 -C /provider \
  && rm -rf /tmp/bgutil-pot-provider.tar.gz /var/lib/apt/lists/*

WORKDIR /provider/server
RUN npm ci --no-audit --no-fund \
  && npx tsc \
  && npm prune --omit=dev \
  && npm cache clean --force

FROM node:22-bookworm-slim AS runtime

ARG BGUTIL_POT_VERSION=1.3.2
ARG BGUTIL_POT_PLUGIN_SHA256=d51cf1c54e487137df749bd8778cceaa62304e6c5054c955b95f028f93ad6d57

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg python3 \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp -o /usr/local/bin/yt-dlp \
  && echo "1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6  /usr/local/bin/yt-dlp" | sha256sum -c - \
  && chmod 0755 /usr/local/bin/yt-dlp \
  && mkdir -p /etc/yt-dlp/plugins \
  && curl -fsSL "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${BGUTIL_POT_VERSION}/bgutil-ytdlp-pot-provider.zip" -o /etc/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip \
  && echo "${BGUTIL_POT_PLUGIN_SHA256}  /etc/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip" | sha256sum -c - \
  && rm -rf /var/lib/apt/lists/*

COPY --from=pot-provider /provider/server/build /opt/bgutil-ytdlp-pot-provider/server/build
COPY --from=pot-provider /provider/server/node_modules /opt/bgutil-ytdlp-pot-provider/server/node_modules
COPY --from=pot-provider /provider/server/package.json /opt/bgutil-ytdlp-pot-provider/server/package.json

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
