# Web Crawler

A modern web crawler built with Next.js, Material-UI, and Puppeteer. This application allows you to crawl websites, take screenshots, discover all pages within a website, and perform WCAG accessibility testing.

## Features

- Crawl individual pages or entire websites
- Take full-page screenshots of crawled pages
- Support for sitemap.xml discovery
- WCAG 2.2 accessibility testing with multiple compliance levels (A, AA, AAA)
- Advanced crawling settings for performance optimization
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

### Basic Usage

1. Enter a website URL in the input field
2. Configure basic settings:
   - Enable "Take screenshots" to capture full-page screenshots
   - Enable "Crawl entire website" to discover and crawl all pages
   - Select WCAG compliance level (A, AA, or AAA) for accessibility testing
3. Click the "Crawl" button to start the crawling process
4. View the results, including screenshots, accessibility violations, and discovered links

### Advanced Settings

Access advanced settings by clicking the gear icon in the top-right corner:

1. **Concurrent Pages**: Control how many pages are crawled simultaneously (1-5)
   - Higher values increase crawling speed but may impact server performance
   - Lower values are gentler on the target server

2. **Performance Options**:
   - "Increase timeout for slow sites": Extends the timeout duration for slower websites
   - "Slow down rate limiting": Reduces request frequency to avoid overwhelming servers

3. **Display Options**:
   - "Show link discovery information": Displays all discovered links during crawling

### Accessibility Testing

The crawler performs comprehensive WCAG 2.2 accessibility testing with the following features:

- **Multiple Compliance Levels**:
  - Level A: Basic accessibility requirements
  - Level AA: Addresses major, common barriers
  - Level AAA: Highest level of accessibility compliance

- **Detailed Reports**:
  - Violations: Accessibility issues that need to be fixed
  - Passes: Successfully implemented accessibility features
  - Incomplete: Tests that couldn't be completed
  - Non-applicable: Tests that don't apply to the page

- **WCAG Success Criteria**:
  - Each violation is mapped to specific WCAG 2.2 success criteria
  - Includes links to official WCAG documentation
  - Provides detailed explanations and remediation guidance

## How it Works

- The crawler first checks for a sitemap.xml file if "Crawl entire website" is enabled
- If a sitemap is found, it uses the URLs listed there
- If no sitemap is found, it recursively discovers and crawls links within the same domain
- Screenshots are saved in the `public/screenshots` directory
- Accessibility testing is performed using axe-core
- Results are displayed in real-time on the frontend
- Advanced settings allow fine-tuning of crawling behavior and performance
