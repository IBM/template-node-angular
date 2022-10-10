FROM registry.access.redhat.com/ubi8/nodejs-16:1-52 as builder

USER default

WORKDIR /opt/app-root/src

COPY --chown=default:root . .

WORKDIR /opt/app-root/src/client
RUN npm install && \
    npm run build
WORKDIR /opt/app-root/src

FROM registry.access.redhat.com/ubi8/nodejs-16-minimal:1-59

USER 1001

WORKDIR /opt/app-root/src

COPY --from=builder --chown=1001:0 /opt/app-root/src/client ./client
COPY --chown=1001:0 public ./public
COPY --chown=1001:0 package.json package-lock.json ./
COPY --chown=1001:0 server ./server

RUN npm install --production

ENV NODE_ENV=production
ENV HOST=0.0.0.0 PORT=3000

EXPOSE 3000/tcp

CMD ["npm", "start"]
