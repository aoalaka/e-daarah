.PHONY: dev test stop logs db-reset migrate seed-extra deploy stripe

# ============================================
# Local Development (hot reload)
# ============================================

dev: ## Start local dev environment with hot reload
	docker compose up --build -d
	@echo ""
	@echo "  Frontend:  http://localhost:5173"
	@echo "  Backend:   http://localhost:5001"
	@echo "  MySQL:     localhost:3307"
	@echo "  Stripe:    webhooks forwarding to backend"
	@echo ""
	@echo "  Demo admin:   admin@madrasah.com / admin123"
	@echo "  Demo teacher: teacher@madrasah.com / teacher123"
	@echo ""
	@echo "  Stripe webhook secret (update .env.local if testing webhooks):"
	@sleep 3
	@docker compose logs stripe-cli 2>/dev/null | grep "webhook signing secret" | tail -1 || echo "  (Stripe CLI still starting...run 'make stripe' to check)"
	@echo ""

# ============================================
# Production-like Test (nginx, built assets)
# ============================================

test: ## Start prod-like test environment
	docker compose -f docker-compose.test.yml up --build -d
	@echo ""
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:5001"
	@echo "  MySQL:     localhost:3308"
	@echo ""

# ============================================
# Common Commands
# ============================================

stop: ## Stop all containers
	docker compose down
	docker compose -f docker-compose.test.yml down 2>/dev/null || true

logs: ## Follow all container logs
	docker compose logs -f

logs-backend: ## Follow backend logs only
	docker compose logs -f backend

logs-stripe: ## Follow Stripe CLI logs
	docker compose logs -f stripe-cli

# ============================================
# Database
# ============================================

db-reset: ## Destroy and recreate local database (data loss!)
	docker compose down -v
	docker compose up mysql -d
	@echo "Waiting for MySQL to be ready..."
	@sleep 10
	@echo "MySQL reset complete. Run 'make dev' to start everything."

migrate: ## Run database migrations on local dev
	docker compose exec backend npm run migrate

seed-extra: ## Load additional seed data (after migrations)
	docker compose exec mysql mysql -umadrasah_user -pmadrasah_password madrasah_admin < database/seed-after-migrations.sql

# ============================================
# Stripe
# ============================================

stripe: ## Show Stripe CLI webhook forwarding status
	docker compose logs stripe-cli | tail -20

# ============================================
# Deploy
# ============================================

deploy: ## Push to production (Railway auto-deploys from main)
	@echo "Pushing to main branch — Railway will auto-deploy..."
	git push origin main

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
