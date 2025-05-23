# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Architecture Overview

This is a **Gemini Protocol browser** built with Next.js that allows users to browse Geminispace through a web interface.

### Core Components

1. **Frontend (`pages/index.js`)**:
   - Main browser interface with navigation controls (back/forward/refresh/home)
   - `GemtextRenderer` component that parses and renders Gemtext format
   - URL handling with support for relative URLs and redirects
   - History management for browser-like navigation

2. **Backend API (`pages/api/gemini/fetch.js`)**:
   - Proxy endpoint that fetches content from Gemini servers
   - Uses `@derhuerst/gemini` client library
   - Handles Gemini protocol status codes (20 for success, 30-39 for redirects)
   - Accepts self-signed certificates (standard for Gemini protocol)

### Key Technical Details

- **Gemini Protocol**: Alternative internet protocol that serves text/gemini content over TLS on port 1965
- **Gemtext Format**: Simple markup language used by Gemini protocol with support for:
  - Headers (# ## ###)
  - Links (=>)
  - Lists (*)
  - Quotes (>)
  - Preformatted text (```)
- **URL Resolution**: The browser handles both absolute and relative Gemini URLs, resolving them against the current URL
- **Styling**: Uses Tailwind CSS for responsive design

### Development Notes

- No test framework is currently configured
- The project uses JavaScript (not TypeScript)
- Default home page is set to `gemini://geminiprotocol.net/`