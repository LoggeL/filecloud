FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# WebDAV sidecar (plain Node.js, port 3001)
COPY --from=builder /app/webdav-handler.js ./webdav-handler.js
# bcryptjs not traced by Next.js standalone — copy explicitly for both servers
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
RUN mkdir -p /data/uploads
ENV NODE_ENV=production
EXPOSE 3000 3001
# Run both Next.js (port 3000) and WebDAV sidecar (port 3001)
# Use shell form so runtime env vars from Dokploy are available
CMD node server.js & node webdav-handler.js & wait -n
