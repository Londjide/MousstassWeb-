FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p logs uploads temp

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
EXPOSE 9229

CMD ["npm", "start"]
