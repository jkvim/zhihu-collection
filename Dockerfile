FROM node:6.5
MAINTAINER jkvim "jkvim@outlook.com"
RUN mkdir -p /opt/nodejs
ADD . /opt/nodejs
WORKDIR /opt/nodejs
RUN npm install
RUN node app.js
RUN npm start
EXPOSE 3000
ENTRYPOINT ["node", "worker.js"]
