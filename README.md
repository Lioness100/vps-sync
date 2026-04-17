# VPS Sync Webhook Server

Keeps my VPS folders in sync with GitHub automatically via webhooks.

## Quick Start

Install dependencies:

```bash
bun install
```

Create an environment file (see `.env.example`):

```bash
cp .env.example .env
```

Then start:

```bash
bun start
```

Open the dashboard at `http://localhost:3000`.

## Required Environment Variables

- `GITHUB_SECRET` (your GitHub webhook secret for verifying incoming requests)

## Optional Environment Variables

- `PORT` (default: `3000`)

## API Endpoints

- `GET /api/apps` - List all configured apps and their statuses.
