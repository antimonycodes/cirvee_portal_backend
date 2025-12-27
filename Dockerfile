FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for Prisma
RUN apk add --no-cache bash curl openssl

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma/



# Install dependencies with increased timeout and retries using npm ci
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# Generate Prisma client for Linux inside container
RUN ./node_modules/.bin/prisma generate

# Copy rest of the source code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
