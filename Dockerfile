FROM node:12.16.2

RUN mkdir app

# Install npm production packages
COPY package.json ./app
RUN cd ./app; npm install --production

COPY . ./app

RUN ls -la /etc/mysql

RUN rm -rf /etc/mysql

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

WORKDIR ./app

CMD ["npm", "start"]
