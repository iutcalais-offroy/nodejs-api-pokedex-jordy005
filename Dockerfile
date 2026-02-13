FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://postgres:jYnCNlKUlOuhiUFsnstUksuuhNkWOVZD@postgres.railway.internal:5432/railway"

RUN npx prisma generate

RUN npm run build

CMD sh -c "node dist/index.js"
