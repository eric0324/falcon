FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose port
EXPOSE 3000

# Start development server
CMD ["bun", "run", "dev"]
