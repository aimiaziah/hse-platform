# Dockerfile for Next.js PWA Inspection App
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install with legacy peer deps for compatibility
# Note: We need dev dependencies for the build stage
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

FROM node:18-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Clean any existing build artifacts
RUN rm -rf .next

# Build the app with increased memory limit for webpack
# DigitalOcean App Platform basic-s has 2GB RAM - use 1.5GB for build (leave 512MB for system)
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_ENV=production

# Run the build
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV PORT 8080

CMD ["node", "server.js"]
