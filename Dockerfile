FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
	&& npm cache clean --force

COPY --chown=node:node package.json package-lock.json elastic-apm-node.cjs knexfile.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node src ./src

ENV NODE_ENV=production \
	ELASTIC_APM_CONFIG_FILE=elastic-apm-node.cjs \
	PORT=4454

USER node

EXPOSE 4454

CMD [ "node", "--experimental-loader", "elastic-apm-node/loader.mjs", "-r", "elastic-apm-node/start.js", "src" ]
