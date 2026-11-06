# ─── مهیار گپ — بیلد سبک دو مرحله‌ای برای Railway ───
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund && npx prisma generate
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server/index.js"]
