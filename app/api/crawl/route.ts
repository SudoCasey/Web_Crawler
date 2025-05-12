import { NextResponse } from 'next/server';
import puppeteer, { Browser, Page, HTTPRequest, HTTPResponse, Dialog } from 'puppeteer';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CrawlRequest {
  url: string;
  takeScreenshots: boolean;
  crawlEntireWebsite: boolean;
}

interface CrawlResult {
  url: string;
  screenshot?: string;
  links: string[];
  error?: string;
}

interface CrawlResponse {
  results: CrawlResult[];
  usedSitemap: boolean | null;
  isComplete: boolean;
}

// Add browser pool management
let browserPool: Browser[] = [];
const MAX_BROWSER_INSTANCES = 3;

async function getBrowser(): Promise<Browser> {
  if (browserPool.length < MAX_BROWSER_INSTANCES) {
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-http2',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });
    browserPool.push(browser);
    return browser;
  }
  // Round-robin browser selection
  return browserPool[browserPool.length % MAX_BROWSER_INSTANCES];
}

async function closeAllBrowsers() {
  for (const browser of browserPool) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
  browserPool = [];
}

async function cleanupScreenshots() {
  const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
  if (fs.existsSync(screenshotDir)) {
    const files = fs.readdirSync(screenshotDir);
    for (const file of files) {
      fs.unlinkSync(path.join(screenshotDir, file));
    }
  }
}

async function getSitemapUrls(baseUrl: string): Promise<string[]> {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
    
    await page.goto(sitemapUrl, { waitUntil: 'networkidle0' });
    const content = await page.content();
    
    const urls = new Set<string>();
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      urls.add(match[1]);
    }
    
    await browser.close();
    return Array.from(urls);
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return [];
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateSafeFilename(url: string): string {
  // Create a hash of the URL to use as the base filename
  const hash = crypto.createHash('md5').update(url).digest('hex');
  // Add timestamp to ensure uniqueness
  return `${Date.now()}-${hash}`;
}

async function crawlPage(
  url: string,
  takeScreenshots: boolean,
  visited: Set<string>,
  baseUrl: string,
  collectLinks: boolean
): Promise<CrawlResult> {
  if (visited.has(url)) {
    return { url, links: [] };
  }
  
  visited.add(url);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set a more reasonable timeout
    await page.setDefaultNavigationTimeout(30000);
    
    // Configure page to handle redirects and dialogs
    await page.setRequestInterception(true);
    page.on('request', (request: HTTPRequest) => {
      if (!request.url().startsWith('http')) {
        request.abort();
        return;
      }
      const headers = {
        ...request.headers(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      request.continue({ headers });
    });

    // Handle JavaScript dialogs
    page.on('dialog', async (dialog: Dialog) => {
      await dialog.dismiss();
    });

    // Track redirects
    const redirectChain: string[] = [];
    page.on('response', (response: HTTPResponse) => {
      const status = response.status();
      if (status >= 300 && status < 400) {
        const location = response.headers()['location'];
        if (location) {
          redirectChain.push(location);
        }
      }
    });

    // Set a longer timeout and wait until network is idle
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 // 30 seconds
    });

    // Handle various HTTP status codes
    const status = response?.status();
    if (status) {
      if (status === 304) {
        await page.close();
        return {
          url,
          links: [],
          error: 'Page not modified (304)'
        };
      }
      if (status === 204 || status === 205) {
        await page.close();
        return {
          url,
          links: [],
          error: `No content (${status})`
        };
      }
      if (status === 407) {
        await page.close();
        return {
          url,
          links: [],
          error: 'Proxy authentication required (407)'
        };
      }
      if (status >= 400) {
        await page.close();
        return {
          url,
          links: [],
          error: `HTTP Error ${status}`
        };
      }
    }

    // Check for redirect loops
    if (redirectChain.length > 10) {
      await page.close();
      return {
        url,
        links: [],
        error: 'Too many redirects detected'
      };
    }

    // Check for redirect loops by comparing final URL with original
    const finalUrl = page.url();
    if (finalUrl !== url && visited.has(finalUrl)) {
      await page.close();
      return {
        url,
        links: [],
        error: 'Redirect loop detected'
      };
    }

    // Handle meta refresh redirects
    const metaRefresh = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="refresh"]');
      if (meta) {
        const content = meta.getAttribute('content');
        if (content) {
          const match = content.match(/^\d+;\s*url=(.+)$/i);
          return match ? match[1] : null;
        }
      }
      return null;
    });

    if (metaRefresh) {
      const absoluteMetaRefresh = new URL(metaRefresh, url).toString();
      if (visited.has(absoluteMetaRefresh)) {
        await page.close();
        return {
          url,
          links: [],
          error: 'Meta refresh redirect loop detected'
        };
      }
    }
    
    let screenshotPath: string | undefined;
    if (takeScreenshots) {
      const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      const filename = `${generateSafeFilename(url)}.png`;
      const fullPath = path.join(screenshotDir, filename);
      
      try {
        await page.screenshot({ path: fullPath, fullPage: true });
        screenshotPath = `/screenshots/${filename}`;
      } catch (screenshotError) {
        console.error(`Error taking screenshot of ${url}:`, screenshotError);
      }
    }
    
    let links: string[] = [];
    if (collectLinks) {
      links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:'))
          .map(href => href as string);
      });
      
      const baseUrlObj = new URL(baseUrl);
      const newLinks = new Set<string>();
      
      links.forEach(link => {
        try {
          const absoluteUrl = new URL(link, url).toString();
          if (absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrl)) {
            newLinks.add(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip it
        }
      });
      
      links = Array.from(newLinks);
    }
    
    // After successful crawl, close the page but keep the browser
    await page.close();
    return {
      url,
      screenshot: screenshotPath,
      links,
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    await page.close();
    
    // Handle specific error types
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.message.includes('ERR_TOO_MANY_REDIRECTS')) {
        errorMessage = 'Too many redirects detected';
      } else if (error.message.includes('ERR_ABORTED')) {
        errorMessage = 'Request was aborted';
      } else if (error.message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
        errorMessage = 'HTTP/2 protocol error';
      } else if (error.message.includes('ERR_UNEXPECTED_PROXY_AUTH')) {
        errorMessage = 'Unexpected proxy authentication';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Page load timed out';
      } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Connection refused';
      } else if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
        errorMessage = 'Connection timed out';
      } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = 'Domain name not resolved';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      url, 
      links: [],
      error: errorMessage
    };
  }
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClientConnected = true;

  const writeResponse = async (data: any) => {
    if (!isClientConnected) return;
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
    } catch (error) {
      console.log('Client disconnected, stopping crawl');
      isClientConnected = false;
      return;
    }
  };

  const closeWriter = async () => {
    if (!isClientConnected) return;
    try {
      await writer.close();
    } catch (error) {
      console.log('Error closing writer:', error);
    }
  };

  (async () => {
    try {
      const { url, takeScreenshots, crawlEntireWebsite }: CrawlRequest = await request.json();
      
      if (!url) {
        await writeResponse({ error: 'URL is required' });
        await closeWriter();
        return;
      }

      // Clean up old screenshots before starting new scan
      if (takeScreenshots) {
        await cleanupScreenshots();
      }
      
      const baseUrl = new URL(url).origin;
      const visited = new Set<string>();
      const results: CrawlResult[] = [];
      let usedSitemap: boolean | null = null;
      
      try {
        if (crawlEntireWebsite) {
          const sitemapUrls = await getSitemapUrls(baseUrl);
          usedSitemap = sitemapUrls.length > 0;
          const urlsToCrawl = sitemapUrls.length > 0 ? sitemapUrls : [url];
          
          // Process URLs in parallel with a concurrency limit
          const concurrencyLimit = 3;
          for (let i = 0; i < urlsToCrawl.length; i += concurrencyLimit) {
            if (!isClientConnected) break;
            
            const batch = urlsToCrawl.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
              batch.map(urlToCrawl => 
                !visited.has(urlToCrawl) ? crawlPage(urlToCrawl, takeScreenshots, visited, baseUrl, true) : null
              )
            );
            
            results.push(...batchResults.filter((r): r is CrawlResult => r !== null));
            
            // Send intermediate results
            await writeResponse({
              results,
              usedSitemap,
              isComplete: false
            });
            
            if (!usedSitemap) {
              // Collect all new links from the batch
              const newLinks = new Set<string>();
              batchResults.forEach(result => {
                if (result) {
                  result.links.forEach(link => {
                    if (!visited.has(link)) {
                      newLinks.add(link);
                    }
                  });
                }
              });
              
              // Process new links with delay
              for (const link of Array.from(newLinks)) {
                if (!isClientConnected) break;
                await delay(1000);
                const subResult = await crawlPage(link, takeScreenshots, visited, baseUrl, true);
                results.push(subResult);
                
                await writeResponse({
                  results,
                  usedSitemap,
                  isComplete: false
                });
              }
            }
          }
        } else {
          // Single page crawl
          const result = await crawlPage(url, takeScreenshots, visited, baseUrl, false);
          results.push(result);
          
          await writeResponse({
            results,
            usedSitemap,
            isComplete: false
          });
        }
        
        if (isClientConnected) {
          // Send final results
          await writeResponse({
            results,
            usedSitemap,
            isComplete: true
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Crawl cancelled by client');
        } else {
          console.error('Error during crawl:', error);
          await writeResponse({
            error: 'Internal server error during crawl'
          });
        }
      } finally {
        // Clean up browser instances
        await closeAllBrowsers();
        await closeWriter();
      }
    } catch (error) {
      console.error('Error in crawl API:', error);
      try {
        await writeResponse({
          error: 'Internal server error'
        });
      } catch (e) {
        console.log('Client disconnected, stopping crawl');
      } finally {
        // Ensure browsers are closed even on error
        await closeAllBrowsers();
        await closeWriter();
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
} 