FROM node:18-bullseye-slim

# Install python and build tools for sqlite3 compilation
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Directory for SQLite DB
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 5000

ENV PORT=5000
CMD ["node", "server.js"]
