import { NextResponse } from 'next/server';
import puppeteer, { Browser, Page, HTTPRequest, HTTPResponse, Dialog } from 'puppeteer';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

interface CrawlRequest {
  url: string;
  takeScreenshots: boolean;
  crawlEntireWebsite: boolean;
  checkAccessibility: boolean;
  wcagLevels: {
    A: boolean;
    AA: boolean;
    AAA: boolean;
  };
}

interface CrawlResult {
  url: string;
  screenshot?: string;
  links: string[];
  error?: string;
  accessibilityResults?: {
    violations: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
      nodes: Array<{
        html: string;
        target: string[];
        failureSummary: string;
      }>;
    }>;
    passes: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
    incomplete: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
    nonApplicable: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
    error?: string;
  };
}

interface CrawlResponse {
  results: CrawlResult[];
  usedSitemap: boolean | null;
  isComplete: boolean;
  checkedAccessibility: boolean;
}

// Add browser pool management
let browserPool: Browser[] = [];
const MAX_BROWSER_INSTANCES = 3;

// Add debug flag at the top of the file
const DEBUG = false;

// Helper function for logging
function log(message: string, data?: any) {
  if (DEBUG) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}

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
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-prompt-on-repost',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--password-store=basic',
        '--use-mock-keychain',
        '--window-size=1920,1080'
      ],
      ignoreHTTPSErrors: true,
      timeout: 60000, // Increase timeout to 60 seconds
      protocolTimeout: 60000 // Increase protocol timeout to 60 seconds
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

// Add type declarations at the top of the file
declare global {
  interface Window {
    axe: {
      configure: (config: any) => void;
      run: (context: Document, options: any) => Promise<any>;
    };
  }
}

// Read axe-core source at runtime instead of importing it
const axeCoreSource = readFileSync(
  path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

const execAsync = promisify(exec);

async function savePageLocally(page: Page, url: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', crypto.randomBytes(16).toString('hex'));
  fs.mkdirSync(tempDir, { recursive: true });

  // Save the HTML
  const html = await page.content();
  fs.writeFileSync(path.join(tempDir, 'index.html'), html);

  // Save all CSS files
  const cssFiles = await page.evaluate(() => {
    return Array.from(document.styleSheets).map(sheet => {
      try {
        return sheet.href;
      } catch {
        return null;
      }
    }).filter((href): href is string => href !== null);
  });

  for (const cssUrl of cssFiles) {
    try {
      const response = await page.goto(cssUrl, { waitUntil: 'networkidle0' });
      if (response) {
        const css = await response.text();
        const cssFilename = path.basename(new URL(cssUrl).pathname);
        fs.writeFileSync(path.join(tempDir, cssFilename), css);
      }
    } catch (error) {
      console.error(`Error saving CSS file ${cssUrl}:`, error);
    }
  }

  // Save all images
  const images = await page.evaluate(() => {
    return Array.from(document.images).map(img => img.src);
  });

  for (const imgUrl of images) {
    try {
      const response = await page.goto(imgUrl, { waitUntil: 'networkidle0' });
      if (response) {
        const buffer = await response.buffer();
        const imgFilename = path.basename(new URL(imgUrl).pathname);
        fs.writeFileSync(path.join(tempDir, imgFilename), buffer);
      }
    } catch (error) {
      console.error(`Error saving image ${imgUrl}:`, error);
    }
  }

  return tempDir;
}

async function cleanupTempDir(tempDir: string) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up temp directory ${tempDir}:`, error);
  }
}

async function runAccessibilityCheckOnLocalCopy(page: Page, tempDir: string): Promise<{
  violations: any[];
  passes: any[];
  incomplete: any[];
  nonApplicable: any[];
  error?: string;
}> {
  console.log('Starting accessibility check on local copy...');
  let localPage: Page | null = null;
  
  try {
    // Create a new browser instance specifically for the local copy
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-http2',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-prompt-on-repost',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--password-store=basic',
        '--use-mock-keychain',
        '--window-size=1920,1080'
      ],
      ignoreHTTPSErrors: true,
      timeout: 60000,
      protocolTimeout: 60000
    });

    try {
      // Create a new page for the local copy
      localPage = await browser.newPage();
      
      // Set longer timeouts for local file loading
      await localPage.setDefaultTimeout(60000);
      await localPage.setDefaultNavigationTimeout(60000);

      // Load the local HTML file
      const localUrl = `file://${path.join(tempDir, 'index.html')}`;
      console.log(`Loading local file: ${localUrl}`);
      
      const response = await localPage.goto(localUrl, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });

      if (!response) {
        throw new Error('Failed to load local file');
      }

      // Enhanced page load verification
      await Promise.all([
        // Wait for the page to be fully loaded
        localPage.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 10000 }),
        
        // Wait for any pending network requests
        localPage.waitForFunction(() => {
          return window.performance.getEntriesByType('resource')
            .every(resource => (resource as PerformanceResourceTiming).responseEnd > 0);
        }, { timeout: 10000 }),
        
        // Wait for any pending animations
        localPage.waitForFunction(() => {
          return !document.querySelector('*[style*="animation"]');
        }, { timeout: 5000 }).catch(() => {
          console.log('Animation timeout, continuing anyway...');
        }),
        
        // Wait for any pending images
        localPage.waitForFunction(() => {
          return Array.from(document.images).every(img => img.complete);
        }, { timeout: 10000 }).catch(() => {
          console.log('Image load timeout, continuing anyway...');
        })
      ]);

      // Inject axe-core
      await localPage.addScriptTag({
        content: axeCoreSource,
        id: 'axe-core'
      });

      // Wait for axe to be available
      await localPage.waitForFunction(() => {
        return typeof window.axe !== 'undefined';
      }, { timeout: 10000 });

      // Configure axe-core
      await localPage.evaluate(() => {
        window.axe.configure({
          rules: [
            { id: 'color-contrast', enabled: true },
            { id: 'document-title', enabled: true },
            { id: 'html-has-lang', enabled: true },
            { id: 'image-alt', enabled: true },
            { id: 'link-name', enabled: true },
            { id: 'meta-viewport', enabled: true }
          ],
          performanceTimer: true,
          pingWaitTime: 1000,
          resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable']
        });
      });

      // Run the analysis
      const results = await Promise.race([
        localPage.evaluate(() => {
          return new Promise<{ 
            violations: any[]; 
            passes: any[]; 
            incomplete: any[];
            inapplicable: any[];
          }>((resolve, reject) => {
            if (!window.axe) {
              reject(new Error('axe-core not available'));
              return;
            }

            window.axe.run(document, {
              resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'],
              pingWaitTime: 1000,
              performanceTimer: true
            }).then((results: any) => {
              resolve({
                violations: results.violations || [],
                passes: results.passes || [],
                incomplete: results.incomplete || [],
                inapplicable: results.inapplicable || []
              });
            }).catch((error: Error) => {
              console.error('Error during analysis:', error);
              reject(error);
            });
          });
        }),
        new Promise<{ 
          violations: any[]; 
          passes: any[]; 
          incomplete: any[];
          inapplicable: any[];
        }>((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timed out')), 20000)
        )
      ]);

      // Map inapplicable results to nonApplicable
      const nonApplicable = results.inapplicable.map(result => ({
        id: result.id,
        impact: result.impact,
        description: result.description,
        help: result.help,
        helpUrl: result.helpUrl,
        tags: result.tags
      }));

      return {
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        nonApplicable
      };
    } finally {
      // Clean up the local page and browser
      if (localPage) {
        await localPage.close();
      }
      await browser.close();
    }
  } catch (error) {
    console.error('Accessibility check failed:', error);
    return {
      violations: [],
      passes: [],
      incomplete: [],
      nonApplicable: [],
      error: error instanceof Error ? error.message : 'Unknown error during accessibility check'
    };
  }
}

async function crawlPage(
  url: string,
  takeScreenshots: boolean,
  visited: Set<string>,
  baseUrl: string,
  collectLinks: boolean,
  checkAccessibility: boolean,
  wcagLevels: { A: boolean; AA: boolean; AAA: boolean }
): Promise<CrawlResult> {
  log(`Starting crawl of ${url}`);
  if (visited.has(url)) {
    log(`URL ${url} already visited, skipping`);
    return { url, links: [] };
  }
  
  visited.add(url);
  const browser = await getBrowser();
  const page = await browser.newPage();
  let pageClosed = false;
  
  try {
    // Set longer timeouts
    await page.setDefaultTimeout(60000);
    await page.setDefaultNavigationTimeout(60000);
    
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

    // Set a longer timeout and wait until network is idle
    log(`Navigating to ${url}`);
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 // 60 seconds
    });

    // Handle various HTTP status codes
    const status = response?.status();
    if (status) {
      if (status === 304) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: 'Page not modified (304)'
        };
      }
      if (status === 204 || status === 205) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: `No content (${status})`
        };
      }
      if (status === 407) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: 'Proxy authentication required (407)'
        };
      }
      if (status >= 400) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: `HTTP Error ${status}`
        };
      }
    }

    // Wait for the page to be fully loaded
    await page.waitForFunction(() => {
      return document.readyState === 'complete';
    }, { timeout: 5000 });

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

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

    let accessibilityResults: CrawlResult['accessibilityResults'] | undefined;
    if (checkAccessibility && !pageClosed) {
      try {
        // Save the page locally
        const tempDir = await savePageLocally(page, url);
        
        try {
          // Run accessibility check on the local copy
          accessibilityResults = await runAccessibilityCheckOnLocalCopy(page, tempDir);
        } finally {
          // Clean up the temporary directory
          await cleanupTempDir(tempDir);
        }
      } catch (accessibilityError) {
        console.error('Accessibility check failed:', accessibilityError);
        accessibilityResults = {
          violations: [],
          passes: [],
          incomplete: [],
          nonApplicable: [],
          error: accessibilityError instanceof Error ? accessibilityError.message : 'Unknown error during accessibility check'
        };
      }
    }
    
    // After successful crawl, close the page but keep the browser
    if (!pageClosed) {
      await page.close();
      pageClosed = true;
    }
    
    return {
      url,
      screenshot: screenshotPath,
      links,
      accessibilityResults,
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    if (!pageClosed) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('Error closing page:', closeError);
      }
    }
    
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
  log('Received crawl request');
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClientConnected = true;

  const writeResponse = async (data: any) => {
    if (!isClientConnected) return;
    try {
      log('Writing response:', JSON.stringify(data));
      await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
    } catch (error) {
      console.error('Error writing response:', error);
      isClientConnected = false;
      return;
    }
  };

  const closeWriter = async () => {
    if (!isClientConnected) return;
    try {
      log('Closing writer');
      await writer.close();
    } catch (error) {
      console.error('Error closing writer:', error);
    }
  };

  (async () => {
    try {
      log('Parsing request body');
      const { url, takeScreenshots, crawlEntireWebsite, checkAccessibility, wcagLevels }: CrawlRequest = await request.json();
      
      if (!url) {
        console.error('No URL provided');
        await writeResponse({ error: 'URL is required' });
        await closeWriter();
        return;
      }

      log(`Starting crawl for URL: ${url}`);
      log('Options:', { takeScreenshots, crawlEntireWebsite, checkAccessibility, wcagLevels });

      // Clean up old screenshots before starting new scan
      if (takeScreenshots) {
        log('Cleaning up old screenshots');
        await cleanupScreenshots();
      }
      
      const baseUrl = new URL(url).origin;
      const visited = new Set<string>();
      const results: CrawlResult[] = [];
      let usedSitemap: boolean | null = null;
      
      try {
        if (crawlEntireWebsite) {
          log('Starting full website crawl');
          const sitemapUrls = await getSitemapUrls(baseUrl);
          usedSitemap = sitemapUrls.length > 0;
          log(`Sitemap found: ${usedSitemap}, URLs to crawl: ${sitemapUrls.length}`);
          const urlsToCrawl = sitemapUrls.length > 0 ? sitemapUrls : [url];
          
          // Process URLs in parallel with a concurrency limit
          const concurrencyLimit = 3;
          for (let i = 0; i < urlsToCrawl.length; i += concurrencyLimit) {
            if (!isClientConnected) {
              log('Client disconnected, stopping crawl');
              break;
            }
            
            const batch = urlsToCrawl.slice(i, i + concurrencyLimit);
            log(`Processing batch of ${batch.length} URLs`);
            const batchResults = await Promise.all(
              batch.map(urlToCrawl => 
                !visited.has(urlToCrawl) ? crawlPage(urlToCrawl, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels) : null
              )
            );
            
            results.push(...batchResults.filter((r): r is CrawlResult => r !== null));
            log(`Completed batch, total results: ${results.length}`);
            
            // Send intermediate results
            await writeResponse({
              results,
              usedSitemap,
              isComplete: false,
              checkedAccessibility: checkAccessibility
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
              
              log(`Found ${newLinks.size} new links to crawl`);
              // Process new links with delay
              for (const link of Array.from(newLinks)) {
                if (!isClientConnected) {
                  log('Client disconnected, stopping crawl');
                  break;
                }
                await delay(1000);
                log(`Crawling new link: ${link}`);
                const subResult = await crawlPage(link, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels);
                results.push(subResult);
                
                await writeResponse({
                  results,
                  usedSitemap,
                  isComplete: false,
                  checkedAccessibility: checkAccessibility
                });
              }
            }
          }
        } else {
          log('Starting single page crawl');
          // Single page crawl
          const result = await crawlPage(url, takeScreenshots, visited, baseUrl, false, checkAccessibility, wcagLevels);
          results.push(result);
          
          await writeResponse({
            results,
            usedSitemap,
            isComplete: false,
            checkedAccessibility: checkAccessibility
          });
        }
        
        if (isClientConnected) {
          log('Crawl completed, sending final results');
          // Send final results
          await writeResponse({
            results,
            usedSitemap,
            isComplete: true,
            checkedAccessibility: checkAccessibility
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          log('Crawl cancelled by client');
        } else {
          console.error('Error during crawl:', error);
          await writeResponse({
            error: 'Internal server error during crawl'
          });
        }
      } finally {
        log('Cleaning up resources');
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
        console.error('Error sending error response:', e);
        // Client disconnected
      } finally {
        log('Cleaning up resources after error');
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