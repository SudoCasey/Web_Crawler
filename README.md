# Web Crawler

A modern web crawler built with Next.js, Material-UI, and Puppeteer. This application allows you to crawl websites, take screenshots, and discover all pages within a website.

## Features

- Crawl individual pages or entire websites
- Take full-page screenshots of crawled pages
- Support for sitemap.xml discovery
- Modern, responsive UI built with Material-UI
- Real-time crawling status updates

## Prerequisites

- Node.js 18.x or later
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd web-crawler
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Enter a website URL in the input field
2. Optionally check "Take screenshots" to capture full-page screenshots
3. Optionally check "Crawl entire website" to discover and crawl all pages
4. Click the "Crawl" button to start the crawling process
5. View the results, including screenshots and discovered links

## How it Works

- The crawler first checks for a sitemap.xml file if "Crawl entire website" is enabled
- If a sitemap is found, it uses the URLs listed there
- If no sitemap is found, it recursively discovers and crawls links within the same domain
- Screenshots are saved in the `public/screenshots` directory
- Results are displayed in real-time on the frontend
