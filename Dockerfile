FROM registry.access.redhat.com/ubi8/nodejs-10:1

RUN mkdir app

# Install npm production packages
COPY package.json ./app
WORKDIR /app

RUN npm install --production

COPY . .

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

CMD ["npm", "start"]
