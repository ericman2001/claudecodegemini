# Gemini Browser

A web-based browser for exploring Geminispace, built with Next.js and React. This application allows you to browse Gemini protocol content through a familiar web interface.

## What is Gemini?

Gemini is a lightweight internet protocol that sits between Gopher and the Web. It uses a simple text format called Gemtext and is designed to be minimal, privacy-respecting, and easy to implement.

## Features

- 🌐 **Browse Geminispace** - Access Gemini protocol content through your web browser
- 🔄 **Full Navigation** - Browser-style back, forward, refresh, and home buttons
- 📝 **Gemtext Rendering** - Properly formatted display of Gemtext content including:
  - Headers (# ## ###)
  - Links with click navigation
  - Lists and quotes
  - Preformatted text blocks
- 🔗 **Smart URL Handling** - Supports both absolute and relative Gemini URLs
- 📍 **History Management** - Maintains browsing history for easy navigation
- 🔐 **Security Features** - Built-in URL safety checks to prevent malicious requests
- ⚡ **Error Handling** - Clear error messages for failed requests
- 🎨 **Modern UI** - Clean, responsive design using Tailwind CSS

## Architecture Overview

### Frontend
- **Main Entry**: `pages/index.js` - The primary browser interface
- **Components**:
  - `GemtextRenderer` - Parses and renders Gemtext format
  - `NavigationBar` - Browser navigation controls
  - `AddressBar` - URL input and navigation
  - `LoadingSpinner` - Loading state indicator
  - `ErrorAlert` - Error message display
- **Custom Hook**: `useGeminiNavigation` - Manages all navigation state and logic

### Backend
- **API Endpoint**: `pages/api/gemini/fetch.js` - Proxy for Gemini protocol requests
- Uses `@derhuerst/gemini` client library
- Handles Gemini status codes (20 for success, 30-39 for redirects)
- Accepts self-signed certificates (standard for Gemini)

## Getting Started

### Prerequisites
- Node.js 14.0 or later
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd claudecodegemini
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to start browsing Geminispace.

### Production Build

Build for production:

```bash
npm run build
# or
yarn build
```

Start the production server:

```bash
npm start
# or
yarn start
```

## Usage

1. **Navigate to a Gemini URL**: Enter a `gemini://` URL in the address bar
2. **Click Links**: Click on any link in the content to navigate
3. **Use Navigation Controls**:
   - ⬅️ Back: Go to previous page
   - ➡️ Forward: Go forward in history
   - 🔄 Refresh: Reload current page
   - 🏠 Home: Return to default homepage (gemini://geminiprotocol.net/)

## Common Commands

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

## Technical Details

### Gemtext Format Support
The browser supports all standard Gemtext elements:
- Headers (# ## ###)
- Links (=> URL optional text)
- Lists (* list item)
- Quotes (> quoted text)
- Preformatted blocks (```)
- Regular paragraphs

### Security
- URL validation to ensure only Gemini protocol URLs are accessed
- Security checks to prevent accessing potentially harmful URLs
- POST requests used to prevent URL logging in server logs

### Browser Compatibility
Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid and Flexbox
- Fetch API

## Contributing

Contributions are welcome! This project was primarily developed by Claude (Anthropic's AI assistant) with human guidance and debugging assistance. (repo owner's comment: Thanks Claude!)

## Credits

- Primary development by Claude 4 Sonnet
- Human guidance and debugging by the repository owner
- Built with [Next.js](https://nextjs.org/)
- Gemini client library: [@derhuerst/gemini](https://github.com/derhuerst/gemini)
- Icons: [Lucide React](https://lucide.dev/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Plans

- Enhanced styling and themes
- Bookmarks functionality
- Search within Geminispace
- Download Gemini content
- Custom CSS for different Gemini sites
- ~~Mobile app version~~ (repo owner's comment: whoa Claude! Getting a bit ahead of ourselves here. I never said we wanted a mobile app!)