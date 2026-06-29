# Frontend (Next.js) in dev mode so the UI is easy to inspect and tweak.
FROM node:20-slim

WORKDIR /app

# Install deps first for layer caching. We use `npm install` (not `npm ci`) because the
# project pins several packages to "latest", so the lockfile isn't guaranteed in sync.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000
# Bind to 0.0.0.0 so the host can reach the dev server through the mapped port.
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
