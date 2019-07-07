# ---- Build ----
FROM node:12 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Release ----
FROM node:12 AS release
WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir dist
COPY --from=0 /app/dist ./dist/

EXPOSE 3004
RUN mkdir uploads
VOLUME [ "/app/uploads" ]
ENTRYPOINT [ "npm", "start"]
