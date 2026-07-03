# DealDesk AI

Revenue workflow foundation for a DealDesk AI hackathon build.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
```

## Environment

Do not hardcode Alibaba Cloud, Qwen, deployment, or proof-link values in source code. Put runtime values in environment variables or config files, and keep `.env*` files out of version control.

## Architecture Baseline

This repo starts from Next.js 16 App Router, TypeScript, Tailwind CSS, and shadcn/ui. Workflow, policy, adapters, persistence, and telemetry belong under `src/server/*`; `src/app` should stay thin and call application services when later stories add behavior.
