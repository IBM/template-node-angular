FROM registry.access.redhat.com/ubi8/nodejs-12:1-77

RUN mkdir app

# Install npm production packages
COPY package.json ./app
RUN cd ./app; npm install --production

COPY . ./app

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

WORKDIR ./app

USER root

RUN dnf -y update-minimal --security --sec-severity=Important --sec-severity=Critical && dnf clean all

COPY ./licenses /licenses

USER default

LABEL name="React UI Patterns" \
      vendor="IBM" \
      version="v1.0.0" \
      release="1" \
      summary="This is an example of a container image." \
      description="This container image will deploy a React Node App"

CMD ["npm", "start"]
