
### Development workflow
- **Never push directly to production without local testing**
- Local dev: `make dev` → frontend at localhost:5173, backend at localhost:5001 (hot reload)
- Prod-like test: `make test` → frontend at localhost:3000, backend at localhost:5001 (nginx, built assets)
- Deploy: `make deploy` (pushes to main → Railway auto-deploys)
- DB reset: `make db-reset` then `make dev`
- Migrations: `make migrate` (runs after `make dev`)
- Secrets are in `.env.local` (gitignored) — never commit secrets
- Docker Compose is for local dev/test only — Railway uses Nixpacks and its own env vars
- When adding new DB columns/tables: update both the migration file AND `database/init.sql`
- When adding seed data for local dev: update `database/seed.sql`

### Design approach
- Design with a mobile-first approach prioritizing clean layouts and intuitive navigation
- Use a minimalist aesthetic with ample whitespace and clear visual hierarchy
- Maintain professional appearance through consistent typography and spacing
- Apply a restrained color palette (2-3 colors maximum) avoiding excessive gradients
- Use simple, functional icons sparingly - prefer text labels where practical
- Ensure all interactive elements have appropriate touch targets (minimum 44x44px)
- Implement responsive breakpoints that adapt naturally across device sizes