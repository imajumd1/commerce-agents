# Railway — ACME Travel

Deploy **two services** from [imajumd1/commerce-agents](https://github.com/imajumd1/commerce-agents) (`main`).

## 1. API service (required)

- **Root directory:** `/` (repo root)
- **Builder:** Dockerfile → `Dockerfile` (also set in `railway.toml`)
- **Variables:**

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your key |
| `DEMO_ALLOWED_HOSTS` | `*` |
| `DEMO_CORS_ORIGINS` | your storefront URL, e.g. `https://travel-web-production-xxxx.up.railway.app` |

Generate a public domain for this service in Railway.

## 2. Storefront service

- **Root directory:** `/`
- **Dockerfile path:** `deploy/travel/Dockerfile.web`
- **Build variable** (must be set before/at build):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | public API URL, e.g. `https://travel-api-production-xxxx.up.railway.app` |

Generate a public domain, then put that URL into the API’s `DEMO_CORS_ORIGINS` and redeploy the API if needed.

## Local Docker smoke

```bash
docker build -t travel-api -f Dockerfile .
docker run --rm -e PORT=8000 -e ANTHROPIC_API_KEY -e DEMO_ALLOWED_HOSTS='*' \
  -e DEMO_CORS_ORIGINS='http://localhost:3000' -p 8000:8000 travel-api
```
