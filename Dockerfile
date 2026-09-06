# Travel API for Railway / container hosts.
# Build context: repository root.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/examples \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
COPY commerce-common ./commerce-common
COPY shopping-agent ./shopping-agent
COPY merchant-agent ./merchant-agent
COPY examples ./examples

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# Railway injects PORT.
CMD ["sh", "-c", "uvicorn travel.api.main:app --app-dir examples --host 0.0.0.0 --port ${PORT:-8000}"]
