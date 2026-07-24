# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

The canonical command reference lives in [`README.md`](./README.md#common-commands). In short:

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Type-check with tsc --noEmit
npm test           # Run the Jest test suite
```

## Architecture Overview

This is a **Gemini Protocol browser** built with Next.js (Pages Router) that allows users to browse Geminispace through a web interface.

### Core Components

1. **Frontend (`pages/index.tsx`)**:
   - Main browser interface with navigation controls (back/forward/refresh/home)
   - `GemtextRenderer` component that parses and renders Gemtext format
   - URL handling with support for relative URLs and redirects
   - History management for browser-like navigation (`hooks/useGeminiNavigation.ts`)

2. **Backend API (`pages/api/gemini/fetch.ts`)**:
   - Proxy endpoint that fetches content from Gemini servers
   - Uses `@derhuerst/gemini` client library
   - Handles Gemini protocol status codes (20 for success, 30-39 for redirects)
   - Accepts self-signed certificates (standard for Gemini protocol), with trust
     enforced separately via TOFU (`utils/tofu.ts`)

### Key Technical Details

- **Gemini Protocol**: Alternative internet protocol that serves text/gemini content over TLS on port 1965
- **Gemtext Format**: Simple markup language used by Gemini protocol with support for:
  - Headers (# ## ###)
  - Links (=>)
  - Lists (*)
  - Quotes (>)
  - Preformatted text (```)
- **URL Resolution**: The browser handles both absolute and relative Gemini URLs, resolving them against the current URL (`utils/urlResolver.ts`)
- **Styling**: Uses Tailwind CSS for responsive design

### Language & Testing

- The project is written in **TypeScript** (`.ts`/`.tsx`) with `strict` mode
  enabled via `tsconfig.json`. Only the build config files
  (`next.config.mjs`, `postcss.config.mjs`, `tailwind.config.mjs`) remain `.mjs`.
- **Jest** (configured via `next/jest` in `jest.config.mjs`, with Testing
  Library matchers loaded from `jest.setup.ts`) provides the test suite. Run it
  with `npm test`. Tests cover the pure logic in `utils/` (SSRF/`security.ts`,
  TOFU/`tofu.ts`, URL resolution/`urlResolver.ts`) plus a `GemtextRenderer`
  component test. There is no end-to-end/browser suite (it would require a live
  Gemini server).

### Deployment / Security Notes

- This app targets **single-instance** deployment. The rate limiter in
  `utils/security.ts` is in-memory (per process) and reads the client IP from
  the `x-forwarded-for` header, which is appropriate only behind a single
  trusted proxy. A shared store would be needed for horizontal scaling.
- Default home page is set to `gemini://geminiprotocol.net/`
  (`utils/constants.ts`).
