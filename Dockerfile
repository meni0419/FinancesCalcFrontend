# Этап 1: Сборка приложения
FROM node:23 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Этап 2: Финальный образ
FROM node:23
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/build ./build
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]