FROM node:8-alpine
RUN apk update && apk add git tini
ADD package.json /app/package.json
RUN cd /app && npm install --production
COPY . /app
WORKDIR /app
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "node", "src" ]
