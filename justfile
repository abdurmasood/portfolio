# List available commands
[private]
default:
    @just --list

# Install dependencies
install:
    pnpm install

# Start the dev server
dev:
    pnpm dev

# Build for production
build:
    pnpm build

# Serve the production build
start:
    pnpm start

# Lint the project
lint:
    pnpm lint

# Run the tests with coverage
test:
    pnpm test

# Delete the Next.js build output
clean:
    rm -rf .next
