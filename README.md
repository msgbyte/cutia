# Cutia

<p>
  Privacy-first, open-source video editing.<br />
  Build, trim, layer, and export directly from your browser.
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](.github/CONTRIBUTING.md)

---

## At a Glance

Cutia is designed for creators who want a clean editing workflow without subscriptions, tracking, or watermark traps.

- Local-first editing mindset
- Timeline-based multi-track workflow
- Real-time preview while editing
- Open-source and contribution-friendly

## Why Cutia Exists

Most lightweight editors are either too limited or progressively locked behind paywalls.  
Cutia focuses on a simple idea: powerful basics should stay accessible.

## What You Can Do

- Arrange clips in a timeline
- Layer video, text, audio, and stickers
- Preview changes in real time
- Export without watermark pressure

## Stack Snapshot

- `Next.js` application in `apps/web`
- `Bun` for dependency management and scripts
- `PostgreSQL + Redis` (optional for frontend-only work)
- `TypeScript` across the project

## Quick Start (Fast Path)

```bash
git clone <your-fork-url>
cd cutia/apps/web
cp .env.example .env.local
bun install
bun dev
```

Open `http://localhost:3000`.

## Full Local Setup (With Services)

Start only the backing services for local development:

```bash
docker compose up redis serverless-redis-http -d
```

Then in `apps/web`:

```bash
cp .env.example .env.local
```

Required env values:

```bash
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="cutia_redis_token"
NODE_ENV="development"
```

Optional TTS env values:

```bash
EXTERNAL_TTS_API_BASE_URL="https://your-tts-provider.example.com/v1"
EXTERNAL_TTS_API_MODEL="your_tts_model"
EXTERNAL_TTS_API_KEY="your_tts_api_key"
```

Cutia prefers `EXTERNAL_TTS_API_*` for external speech synthesis. The legacy
`API_BASE_URL` / `API_MODEL` / `API_KEY` names are still accepted as
compatibility aliases when the namespaced variables are absent.

To verify that the configured provider can actually return audio, run:

```bash
bun --eval 'import { getExternalTtsConfig, synthesizeSpeechWithOpenAiCompatible } from "./src/lib/tts/openai-compatible.ts"; const config = getExternalTtsConfig({ env: process.env }); const audio = await synthesizeSpeechWithOpenAiCompatible({ config, text: "Cutia TTS probe", voice: "default" }); console.log(audio.byteLength);'
```

If you want to verify the route end-to-end from the app directory, run:

```bash
NODE_ENV=development NEXT_PUBLIC_SITE_URL=http://localhost:3000 UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN=cutia_redis_token bun --eval 'import { NextRequest } from "next/server"; import { POST } from "./src/app/api/tts/generate/route.ts"; const request = new NextRequest("http://localhost/api/tts/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Cutia route probe", voice: "default" }) }); const response = await POST(request); console.log(response.status); console.log(await response.text());'
```

To enable authentication, also start PostgreSQL and add these env values:

```bash
docker compose up redis serverless-redis-http postgres -d
```

```bash
DATABASE_URL="postgresql://cutia:cutia@localhost:5432/cutia"
BETTER_AUTH_SECRET="your-generated-secret-here"
```

Generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Run:

```bash
bun run db:migrate
bun run dev
```

## Contributing

Contributions are welcome. Check `.github/CONTRIBUTING.md` before opening a PR.

Current high-impact areas:

- Timeline behavior and interaction quality
- Project management and reliability
- Performance tuning and bug fixing
- UI improvements outside preview internals

Areas currently under active refactor:

- Preview panel internals (fonts/stickers/effects)
- Export pipeline internals

## Docker Deployment

Run the full application with Docker:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

This starts Redis and the web app. To enable authentication, uncomment the PostgreSQL service and related env vars in `docker-compose.yaml`.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmsgbyte%2Fcutia&project-name=cutia&repository-name=cutia)

## License

Released under the [MIT License](LICENSE).

<p align="right">
  <sub><sup>NOTE: fork from opencut (#fca99d6126c31fbb18ed9f1034cee6f940b040e8)</sup></sub>
</p>
