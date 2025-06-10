FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

RUN npm run build  # Assuming you have a build step; adjust if needed

CMD ["npm", "start"] 