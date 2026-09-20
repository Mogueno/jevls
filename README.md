# jevls

> **See the cut of your code.**  
> A language server powered by Jev, TypeSafe's System One model. It does not write prose diagnostics — it decides them: category, severity, probability, and structured values an editor or CI pipeline can act on.

---

## Overview

`jevls` explores a new paradigm for developer tooling. Traditional LLM-based coding assistants produce verbose, unstructured paragraphs that are hard for IDEs to parse and act on. `jevls` queries **Jev (TypeSafe System One)** with typed questions, returning:

- **Choice**: One categorized finding from a closed set (e.g. security, logic bug, syntax, clean), paired with full probability distributions.
- **Score**: Rubric ratings (clean to critical) calibrated with confidence scores.
- **Noul**: Precise probabilities that a condition is true (e.g. `security`, `bug`, `secret`, `ready_to_ship`).
- **Targeted Code Blocks**: Fine-grained line-by-line issue localization.

The web app includes an interactive code analyzer playground and an early access waitlist.

---

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) with [TanStack Router](https://tanstack.com/router)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Build & Server**: [Vite](https://vitejs.dev/) with the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), deployed as a native [Cloudflare Worker](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (serverless SQLite), bound to the Worker as `DB`. No connection string or external service — production uses the remote D1 database and local dev gets a local D1 automatically.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher (tested on `v26+`)
- **npm**: `v10+`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mogueno/jevls.git
   cd jevls
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your API key:
   ```env
   # Required for code analysis
   TYPESAFE_API_KEY=your_typesafe_api_key_here
   ```
   The waitlist database (Cloudflare D1) needs no configuration — local dev gets a local D1 automatically.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server on `http://localhost:8080` |
| `npm run build` | Compiles the client and SSR bundles for the Worker |
| `npm run preview` | Runs the production build locally |
| `npm run typecheck` | Runs TypeScript compiler verification (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run format` | Formats source files using Prettier |
| `npm run db:migrate` | Applies SQL migrations to the D1 database via `wrangler d1 execute` (`--remote` for production). Optional: the app applies them itself on first request |

---

## Project Structure

```
jevls/
├── migrations/          # SQL schema migrations (waitlist table)
├── public/              # Static assets (favicons, OpenGraph images)
├── scripts/
│   ├── migrate.mjs      # Manual D1 migrator (wrangler d1 execute)
│   └── migration-plan.mjs # Migration runner logic
├── src/
│   ├── components/      # UI components
│   │   ├── tryout.tsx   # Interactive code analysis tryout widget
│   │   ├── waitlist-form.tsx # Waitlist signup form
│   │   └── ui/          # Primitives (buttons, inputs)
│   ├── lib/
│   │   ├── db.ts        # D1 database access + auto-migrations
│   │   ├── waitlist.ts  # Waitlist RPC server function
│   │   └── jev/         # TypeSafe Jev API integration
│   │       ├── api.server.ts # Server-side Jev API client
│   │       ├── analyze.ts    # Code analyzer RPC function
│   │       ├── blocks.ts     # Code block chunking & line numbering
│   │       ├── constants.ts  # Limits and supported languages
│   │       ├── messages.ts   # Categorization labels & prompts
│   │       ├── samples.ts    # Pre-built code samples for tryout
│   │       └── types.ts      # TypeScript interfaces
│   ├── routes/
│   │   ├── __root.tsx   # Root layout shell
│   │   └── index.tsx    # Landing page & tryout playground
│   └── styles.css       # Global styles & Tailwind CSS v4 setup
├── .env.example         # Environment template
└── vite.config.ts       # Vite & Nitro configuration
```

---

## Deployment (Cloudflare Workers)

This project deploys as a native [Cloudflare Worker](https://workers.cloudflare.com/) (Workers Builds builds and deploys `main` from GitHub).

1. The D1 database is declared in `wrangler.jsonc` (`d1_databases`, binding `DB`) — the binding is applied on deploy.
2. Set the `TYPESAFE_API_KEY` secret on the Worker (`wrangler secret put TYPESAFE_API_KEY` or the dashboard).
3. The waitlist schema is applied automatically by the app on first request; `node scripts/migrate.mjs --remote` applies it ahead of traffic if preferred.

---

## License

MIT

<!-- Cloudflare preview builds enabled. -->
