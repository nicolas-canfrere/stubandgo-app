NODE_VERSION = 24.22.1
export NODE_VERSION
# Must match the exact @playwright/test version of package.json (the image carries its browsers).
PLAYWRIGHT_VERSION = 1.64.1
export PLAYWRIGHT_VERSION

API_DIR ?= ../stubandgo

NODE = docker compose run --rm --no-deps node
PLAYWRIGHT = docker compose run --rm --no-deps e2e

.DEFAULT_GOAL := help

.PHONY: help install up down lint typecheck test build api-types api-types-check ci e2e

help: ## List available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-16s %s\n", $$1, $$2}'

install: ## Install npm dependencies from package-lock.json (npm ci)
	$(NODE) npm ci

node_modules: package-lock.json
	$(NODE) npm ci

up: ## Start the Vite dev server on http://localhost:5173
	docker compose up -d

down: ## Stop and remove the dev server
	docker compose down

lint: node_modules ## Run ESLint and check formatting with Prettier
	$(NODE) npm run lint

typecheck: node_modules ## Run the TypeScript compiler without emitting
	$(NODE) npm run typecheck

test: node_modules ## Run the Vitest suite
	$(NODE) npm test

build: node_modules ## Build the production bundle
	$(NODE) npm run build

api-types: node_modules ## Copy the API contract from $(API_DIR) and regenerate src/api/schema.d.ts
	mkdir -p openapi
	cp $(API_DIR)/openapi.yaml openapi/openapi.yaml
	$(NODE) npx openapi-typescript openapi/openapi.yaml -o src/api/schema.d.ts

api-types-check: node_modules ## Fail if src/api/schema.d.ts differs from openapi/openapi.yaml
	$(NODE) sh -c 'npx openapi-typescript openapi/openapi.yaml -o /tmp/schema.check.d.ts >/dev/null && cmp /tmp/schema.check.d.ts src/api/schema.d.ts' \
		|| { echo 'src/api/schema.d.ts is stale: run make api-types'; exit 1; }

ci: lint typecheck api-types-check test build ## Run every quality gate

# No node_modules prerequisite: make up already installs them, and reinstalling under the running
# dev server would break it.
e2e: ## Run the Playwright flow (needs the API stack with app:demo:load, and make up)
	$(PLAYWRIGHT) node e2e/check-stack.ts
	$(PLAYWRIGHT) npx --no-install playwright test
