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
- **Build & Server**: [Vite](https://vitejs.dev/) with [Nitro](https://nitro.unjs.io/) (configured with the Vercel preset)
- **Database**: Dual-mode PostgreSQL
  - **Local Development**: Embedded [PGLite](https://pglite.dev/) (in-memory WASM Postgres) for instant, zero-configuration local runs.
  - **Production**: PostgreSQL (e.g. Neon, Supabase, AWS RDS) via `DATABASE_URL`.

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

   # Optional: Database connection string for production
   # If omitted, local in-memory PGLite will be used automatically
   # DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
   ```

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
| `npm run build` | Compiles the client, SSR, and Nitro server bundles, then runs migrations |
| `npm run preview` | Runs the production build locally |
| `npm run typecheck` | Runs TypeScript compiler verification (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run format` | Formats source files using Prettier |
| `npm run db:migrate` | Applies pending SQL migrations to `DATABASE_URL` (if configured) |

---

## Project Structure

```
jevls/
├── migrations/          # SQL schema migrations (waitlist table)
├── public/              # Static assets (favicons, OpenGraph images)
├── scripts/
│   ├── migrate.mjs      # Production database migrator
│   └── migration-plan.mjs # Migration runner logic
├── src/
│   ├── components/      # UI components
│   │   ├── tryout.tsx   # Interactive code analysis tryout widget
│   │   ├── waitlist-form.tsx # Waitlist signup form
│   │   └── ui/          # Primitives (buttons, inputs)
│   ├── lib/
│   │   ├── db.ts        # Database client (PGLite / Neon abstraction)
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

## Deployment (Vercel)

This project is pre-configured to deploy on [Vercel](https://vercel.com) using Nitro's Vercel serverless preset.

1. Push your repository to GitHub.
2. Import the repository into your Vercel dashboard.
3. In **Settings > Environment Variables**, add:
   - `TYPESAFE_API_KEY`: Your TypeSafe API key.
   - `DATABASE_URL`: *(Optional)* Your PostgreSQL database connection string (e.g. Neon) for persisting waitlist signups across serverless instances.
4. Deploy! Vercel will automatically run `npm run build` and provision the application.

---

## License

MIT

<!-- Cloudflare preview builds enabled. -->
