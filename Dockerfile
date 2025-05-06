
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Define environment variable file (optional, if mounting .env in docker-compose)
# ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]
