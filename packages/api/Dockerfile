# Production Dockerfile for BookPost API
FROM node:20-alpine

# Install build dependencies for native modules and sharp
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for tsx)
RUN npm install

# Copy source
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server using tsx (TypeScript execution)
CMD ["npx", "tsx", "src/index.ts"]
