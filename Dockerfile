# Multi-stage production build for Crypt0 Cr3w Central (CCC)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and frontend configs
COPY package.json ./
COPY ccc/package*.json ./ccc/

# Install frontend dependencies and build
RUN cd ccc && npm ci
COPY ccc/ ./ccc/
RUN cd ccc && npm run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

# Copy server and built static assets
COPY package.json server.js ./
COPY --from=builder /app/ccc/dist ./ccc/dist
RUN mkdir -p /app/data

EXPOSE 8787

CMD ["node", "server.js"]

