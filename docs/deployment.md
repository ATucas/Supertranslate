# Deployment

## Local

Install Node.js 22+, run `npm install`, then start API, worker, and web as described in the root README. `API_URL` controls worker-to-API communication; `VITE_API_URL` can point the browser at a remote API at build time.

## Docker Compose

Copy `.env.example` to `.env` and run:

```bash
docker compose up --build
```

The API is exposed on port 3000, the web UI on 5173, and the worker talks to the API over the Compose network. Compose waits for the API health check before starting the worker and web services. The API has no database volume because session state is intentionally ephemeral in this increment.

Do not put provider credentials in frontend environment variables. When a real provider is added, configure its secret only on the worker service (prefer a secret manager in production).
