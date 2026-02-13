FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

RUN npx prisma generate

RUN npm run build

CMD sh -c "node dist/index.js"
