NODE_VERSION = 24.22.1
export NODE_VERSION

NODE = docker compose run --rm --no-deps node

.DEFAULT_GOAL := help

.PHONY: help install up down lint typecheck test build ci

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-14s %s\n", $$1, $$2}'

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

ci: lint typecheck test build ## Run every quality gate
