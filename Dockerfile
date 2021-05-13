FROM registry.access.redhat.com/ubi8/nodejs-14:1-28.1618434924

WORKDIR /opt/app-root/src/app

# Install npm production packages
COPY package.json .
RUN npm install --production

COPY . .

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000




## Uncomment the below line to update image security content if any
# USER root
# RUN dnf -y update-minimal --security --sec-severity=Important --sec-severity=Critical && dnf clean all

COPY ./licenses /licenses

USER default

LABEL name="ibm/template-node-angular" \
      vendor="IBM" \
      version="1" \
      release="28.1618434924" \
      summary="This is an example of a container image." \
      description="This container image will deploy a Angular App"

CMD ["npm", "start"]
