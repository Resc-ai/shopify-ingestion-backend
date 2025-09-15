# Shopify Ingestion Backend

This backend service ingests Shopify store data, syncs it to a PostgreSQL database using **Prisma** and **Supabase**, and exposes analytics/reporting for multi-tenant use.

---

## 🚀 Features

- Shopify data ingestion (customers, orders, checkouts, profiles)
- Multi-tenant onboarding and authentication (API key + email login)
- Data persistence in PostgreSQL via Prisma ORM
- Supabase integration for upsert operations
- Analytics & reporting endpoints (revenue, top customers, etc.)
- Webhook handling for Shopify events (`orders_create`, `checkouts_create`)
- Forecasting service integration (SARIMA for revenue prediction)

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd ingestion-backend
```

### 2. Install dependencies

```sh
npm install
```

### 3. Configure environment variables

Create a `.env` file and add:

```
PORT=5000
DATABASE_URL=<your-postgres-connection-string>
DIRECT_URL=<your-direct-postgres-url>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
```

### 4. Database setup

```sh
npx prisma generate
npx prisma migrate deploy
```

### 5. Start the server

```sh
npm start
```

---

## 📡 API Endpoints

### Tenant Management

- `POST /tenants/onboard` — Onboard a new tenant
- `POST /tenants/login` — Tenant login

### Shopify Data

- `GET /shopify/customers` — Fetch customers
- `GET /shopify/orders` — Fetch orders
- `GET /shopify/checkouts` — Fetch checkouts
- `GET /shopify/profile` — Fetch store profile

### Reports

- `GET /reports` — Revenue, top customers, etc.

### Webhooks

- `POST /webhooks/shopify/orders_create`
- `POST /webhooks/shopify/checkouts_create`

---

## 📂 Workspace Structure

```
package.json
server.js
middleware/
  └── authenticateTenant.js
prisma/
  └── schema.prisma
routes/
  ├── profile.js
  ├── reports.js
  ├── shopify.js
  ├── tenants.js
  └── webhooks.js
services/
  ├── prismaService.js
  ├── shopifyService.js
  └── supabaseService.js
utils/
  ├── forecast.js
  ├── prismaClient.js
  └── supabase.js
```

---

## ⚠️ Known Limitations & Assumptions

- Shopify API version hardcoded to `2023-10`
- Multi-tenant: isolated by `tenant_id` (UUID)
- Supabase used for upsert operations; Prisma for most queries
- Webhooks require raw body parsing for HMAC verification
- Authentication: API key-based (default) + password login supported
- Forecasting uses an external Python SARIMA service
- BigInt Handling: converted to strings in JSON responses
- No automated tests included
- No rate limiting on Shopify API calls
- Error handling is basic (may need production hardening)
- Assumes Shopify store URLs are unique per tenant
- Assumes valid `line_items` in checkouts webhook

---

## ✅ Assumptions

- You have valid credentials for PostgreSQL, Supabase, and Shopify
- Shopify webhooks are configured to point to `/webhooks` endpoints
- Prisma schema matches your database structure

---
