# EstateFlow

A reference implementation of a containerized full-stack property listing application, built for
the JumpToTech DevOps course. It exercises a complete local development and CI pipeline: a
React/TypeScript frontend served by Nginx, a Node.js/Express API, PostgreSQL for persistence, and
Redis for response caching — all orchestrated with Docker Compose.

## Architecture

```
┌────────────┐      ┌────────────┐      ┌────────────┐
│  Browser   │─────▶│   Nginx    │─────▶│  Express   │
│            │      │ (frontend) │      │ (backend)  │
└────────────┘      └────────────┘      └─────┬──────┘
                      serves React             │
                      static build        ┌────┴────┐
                      proxies /api/*      ▼         ▼
                                    ┌──────────┐ ┌───────┐
                                    │PostgreSQL│ │ Redis │
                                    └──────────┘ └───────┘
```

- **Frontend** — React + TypeScript + Vite, built to static assets and served by Nginx. Nginx also
  reverse-proxies any `/api/*` request to the backend container.
- **Backend** — Node.js + Express REST API exposing `/api/health` and CRUD routes under
  `/api/properties`.
- **PostgreSQL** — persistent storage for property listings. Schema and seed data load
  automatically on first container start via `backend/migrations/001_init.sql`.
- **Redis** — cache-aside layer in front of the properties read endpoints. Every response carries
  an `X-Cache: HIT` or `X-Cache: MISS` header so caching behavior is observable, not just assumed.
  Writes (`POST`/`PUT`/`DELETE`) invalidate the relevant cache keys.

## Prerequisites

- Docker and Docker Compose v2 (`docker compose version`)
- Node.js 20+ and npm (only needed if you want to run the app or tests outside Docker)
- `git`

## Running with Docker Compose

```bash
cp .env.example .env     # adjust ports/credentials if needed — see Troubleshooting below
docker compose config    # sanity-check the compose file
docker compose up --build -d
docker compose ps         # all four services should report "healthy"
```

### Application URLs

With the default `.env` values:

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API (direct) | http://localhost:5000/api |
| Backend API (via frontend proxy) | http://localhost:8080/api |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Reports `db` and `redis` connectivity |
| GET | `/api/properties` | List all properties (cached) |
| GET | `/api/properties/:id` | Get one property (cached) |
| POST | `/api/properties` | Create a property (invalidates list cache) |
| PUT | `/api/properties/:id` | Update a property (invalidates caches) |
| DELETE | `/api/properties/:id` | Delete a property (invalidates caches) |

## Database configuration

Postgres credentials and the database name are controlled entirely by `.env`
(`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). On first start, Docker Compose mounts
`backend/migrations/` into `/docker-entrypoint-initdb.d`, so `001_init.sql` runs automatically to
create the `properties` table and insert a few seed rows. This only happens on a **fresh** volume —
if you need to re-run migrations from scratch, remove the `pgdata` volume (see Cleanup below).

The backend connects using `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`, set automatically
by `docker-compose.yml` from your `.env` values — you don't need to configure these yourself when
running via Compose.

## Running tests locally (outside Docker)

```bash
# Backend — requires reachable Postgres + Redis (e.g. the ones from docker compose up)
cd backend
npm install
PGHOST=localhost PGPORT=5432 PGUSER=estateflow PGPASSWORD=changeme PGDATABASE=estateflow \
  REDIS_URL=redis://localhost:6379 npx jest --runInBand

# Frontend
cd frontend
npm install
npm test            # vitest
npm run lint
npm run build
```

## Troubleshooting

**"address already in use" when running `docker compose up`.** Something on your machine is
already using one of the published ports (5432, 5000, 6379, 8080). Common culprits:
- Port 5000: on macOS, the AirPlay Receiver service often listens here. Either disable it
  (System Settings → General → AirDrop & Handoff) or set `BACKEND_PORT` in `.env` to something
  else (e.g. `5001`).
- Port 5432: a locally installed Postgres server may already be running. Set `POSTGRES_PORT` in
  `.env` to something else (e.g. `5433`) — the containers still talk to each other over the
  internal Docker network regardless of the host port mapping.
- Port 8080: a common default for other local dev servers. Set `FRONTEND_PORT` to something else
  (e.g. `8090`).

**A container is stuck "unhealthy" but the service seems to respond fine from outside.**
Double-check the healthcheck targets `127.0.0.1`, not `localhost`. Inside an Alpine/musl container,
`localhost` can resolve to the IPv6 loopback (`::1`) first; if the service inside the container only
binds its IPv4 socket (Nginx's default `listen 80;` does this), the healthcheck fails with
"Connection refused" even though the service works correctly from the host. This repo's
`docker-compose.yml` healthchecks already use `127.0.0.1` for this reason.

**`role "<user>" does not exist` when connecting from the host.** This means you connected to a
*different* Postgres server than the one in this project — e.g. a native Postgres install on your
machine that happens to also be listening on `127.0.0.1:5432`. Docker's container-to-container
traffic (using the `db` hostname) is unaffected, but host tools (`psql`, test scripts) targeting
`localhost` may land on the wrong server. Fix by changing `POSTGRES_PORT` in `.env` to an unused
port, or by checking what's already bound: `lsof -nP -iTCP:5432 -sTCP:LISTEN`.

**Backend tests time out in `beforeAll`/`afterAll` on a cold run.** Jest's default 5000ms hook
timeout can be too tight the first time dependencies are freshly installed (cold Babel/transform
cache). Re-run with `npx jest --runInBand --testTimeout=30000`, or add `jest.setTimeout(15000)` to
the test file if this becomes a recurring issue in CI.

**Confirming Redis caching is actually working, not just configured.** Call
`GET /api/properties` twice in a row and compare the `X-Cache` response header — the first call
should be `MISS`, the second `HIT`:
```bash
curl -s -D - -o /dev/null http://localhost:8080/api/properties | grep -i x-cache
curl -s -D - -o /dev/null http://localhost:8080/api/properties | grep -i x-cache
```

## Cleanup

```bash
docker compose down          # stop and remove containers + network, keep the Postgres volume
docker compose down -v       # also remove the Postgres volume (destroys all stored data)
```

Use `docker compose down -v` only when you intentionally want a clean slate — it permanently
deletes everything in the `pgdata` volume.
# jumptotech-estateflow
