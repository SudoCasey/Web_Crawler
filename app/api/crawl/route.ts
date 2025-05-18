import { NextResponse } from 'next/server';
import puppeteer, { Browser, Page, HTTPRequest, HTTPResponse, Dialog } from 'puppeteer';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

// Add runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

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
  increaseTimeout: boolean;
  slowRateLimit: boolean;
  concurrentPages: number;
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
        screenshot?: string;
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
let isCleaningUp = false;
let cleanupPromise: Promise<void> | null = null;

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
  // Wait for any ongoing cleanup to complete
  if (cleanupPromise) {
    await cleanupPromise;
  }

  if (isCleaningUp) {
    throw new Error('Browser pool is currently being cleaned up. Please try again in a moment.');
  }

  if (browserPool.length < MAX_BROWSER_INSTANCES) {
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080'
      ],
      ignoreHTTPSErrors: true,
      timeout: 60000,
      protocolTimeout: 60000
    });
    browserPool.push(browser);
    return browser;
  }
  return browserPool[browserPool.length % MAX_BROWSER_INSTANCES];
}

async function closeAllBrowsers() {
  if (isCleaningUp) {
    return cleanupPromise; // Return existing cleanup promise if cleanup is in progress
  }
  
  isCleaningUp = true;
  console.log('Starting browser cleanup...');
  
  cleanupPromise = (async () => {
    try {
      const closePromises = browserPool.map(async (browser) => {
        try {
          await browser.close();
          console.log('Successfully closed browser instance');
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      });
      
      await Promise.all(closePromises);
      browserPool = [];
      console.log('Browser cleanup completed');
    } catch (error) {
      console.error('Error during browser cleanup:', error);
    } finally {
      isCleaningUp = false;
      cleanupPromise = null;
    }
  })();

  return cleanupPromise;
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

async function cleanupTempDir(tempDir?: string) {
  const dirToClean = tempDir || path.join(process.cwd(), 'temp');
  if (fs.existsSync(dirToClean)) {
    const items = fs.readdirSync(dirToClean);
    for (const item of items) {
      const itemPath = path.join(dirToClean, item);
      try {
        if (fs.lstatSync(itemPath).isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
      } catch (error) {
        console.error(`Error cleaning up temp item ${itemPath}:`, error);
      }
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
let axeCoreSource: string;
try {
  axeCoreSource = readFileSync(
    path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
    'utf-8'
  );
} catch (error) {
  console.error('Error loading axe-core:', error);
  axeCoreSource = ''; // Empty string as fallback
}

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

  // Filter out known problematic CSS files
  const filteredCssFiles = cssFiles.filter(cssUrl => {
    try {
      const url = new URL(cssUrl);
      // Skip disallowed and broken CSS files
      if (url.pathname.includes('/disallowed/') || 
          url.pathname.includes('brokencss.css')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  for (const cssUrl of filteredCssFiles) {
    try {
      const response = await page.goto(cssUrl, { 
        waitUntil: 'networkidle0',
        timeout: 10000 // Add timeout to prevent hanging
      });
      
      if (response && response.ok()) {
        const css = await response.text();
        const cssFilename = path.basename(new URL(cssUrl).pathname);
        fs.writeFileSync(path.join(tempDir, cssFilename), css);
      }
    } catch (error) {
      // Only log errors for non-preflight requests
      if (!(error instanceof Error && error.message.includes('preflight request'))) {
        console.error(`Error saving CSS file ${cssUrl}:`, error);
      }
    }
  }

  // Save all images
  const images = await page.evaluate(() => {
    return Array.from(document.images).map(img => img.src);
  });

  for (const imgUrl of images) {
    try {
      const response = await page.goto(imgUrl, { 
        waitUntil: 'networkidle0',
        timeout: 10000 // Add timeout to prevent hanging
      });
      if (response && response.ok()) {
        const buffer = await response.buffer();
        const imgFilename = path.basename(new URL(imgUrl).pathname);
        fs.writeFileSync(path.join(tempDir, imgFilename), buffer);
      }
    } catch (error) {
      // Only log errors for non-preflight requests
      if (!(error instanceof Error && error.message.includes('preflight request'))) {
        console.error(`Error saving image ${imgUrl}:`, error);
      }
    }
  }

  return tempDir;
}

// Add new function to capture element screenshots
async function captureElementScreenshot(page: Page, selector: string): Promise<string | undefined> {
  try {
    const element = await page.$(selector);
    if (!element) return undefined;

    const screenshotDir = path.join(process.cwd(), 'public', 'violation-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filename = `${generateSafeFilename(selector)}.png`;
    const fullPath = path.join(screenshotDir, filename);

    // Get element position and size
    const box = await element.boundingBox();
    if (!box) return undefined;

    // Add highlight to the element
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) {
        element.style.outline = '3px dashed #ff0000';
        element.style.outlineOffset = '2px';
        element.style.position = 'relative';
        
        // Create and add the label
        const label = document.createElement('div');
        label.textContent = 'Accessibility Violation';
        label.style.position = 'absolute';
        label.style.top = '-25px';
        label.style.left = '0';
        label.style.background = '#ff0000';
        label.style.color = 'white';
        label.style.padding = '2px 8px';
        label.style.fontSize = '12px';
        label.style.borderRadius = '3px';
        label.style.zIndex = '1000';
        
        element.parentNode?.insertBefore(label, element);
      }
    }, selector);

    // Add padding around the element
    const padding = 20;
    await page.screenshot({
      path: fullPath,
      clip: {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding - 25),
        width: box.width + (padding * 2),
        height: box.height + (padding * 2) + 25
      }
    });

    // Remove the highlight and label
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) {
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.position = '';
        
        // Remove the label
        const label = element.previousElementSibling;
        if (label && label.textContent === 'Accessibility Violation') {
          label.remove();
        }
      }
    }, selector);

    return `/violation-screenshots/${filename}`;
  } catch (error) {
    console.error('Error capturing element screenshot:', error);
    return undefined;
  }
}

// Modify the runAccessibilityCheckOnLocalCopy function
async function runAccessibilityCheckOnLocalCopy(page: Page, tempDir: string, wcagLevels: { A: boolean; AA: boolean; AAA: boolean }): Promise<{
  violations: any[];
  passes: any[];
  incomplete: any[];
  nonApplicable: any[];
  error?: string;
}> {
  console.log('Starting accessibility check on local copy...');
  let localPage: Page | null = null;
  let browser: Browser | null = null;
  
  try {
    // First save the page locally
    const tempDirPath = await savePageLocally(page, tempDir);
    const localUrl = `file://${path.join(tempDirPath, 'index.html')}`;
    console.log(`Loading local file: ${localUrl}`);

    // Create a new browser instance for the local copy
    browser = await puppeteer.launch({ 
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
      timeout: 120000,
      protocolTimeout: 120000
    });

    // Create a new page for the local copy
    localPage = await browser.newPage();
    
    // Set longer timeouts for local file loading
    await localPage.setDefaultTimeout(120000);
    await localPage.setDefaultNavigationTimeout(120000);

    // Load the local copy
    const response = await localPage.goto(localUrl, { 
      waitUntil: 'networkidle0',
      timeout: 120000 
    });

    if (!response) {
      throw new Error('Failed to load local file');
    }

    // Enhanced page load verification with increased timeouts
    await Promise.all([
      localPage.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 30000 }),
      
      localPage.waitForFunction(() => {
        return window.performance.getEntriesByType('resource')
          .every(resource => (resource as PerformanceResourceTiming).responseEnd > 0);
      }, { timeout: 30000 }),
      
      localPage.waitForFunction(() => {
        return !document.querySelector('*[style*="animation"]');
      }, { timeout: 15000 }).catch(() => {
        console.log('Animation timeout, continuing anyway...');
      }),
      
      localPage.waitForFunction(() => {
        return Array.from(document.images).every(img => img.complete);
      }, { timeout: 30000 }).catch(() => {
        console.log('Image load timeout, continuing anyway...');
      })
    ]);

    // Inject axe-core into the local copy
    await localPage.addScriptTag({
      content: axeCoreSource,
      id: 'axe-core'
    });

    // Wait for axe to be available
    await localPage.waitForFunction(() => {
      return typeof window.axe !== 'undefined';
    }, { timeout: 30000 });

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
        pingWaitTime: 2000,
        resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable']
      });
    });

    // Run the analysis on the local copy
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
            pingWaitTime: 2000,
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
        setTimeout(() => reject(new Error('Analysis timed out')), 60000)
      )
    ]);

    // Capture screenshots for violations from the local copy
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        try {
          // Convert target array to CSS selector
          const selector = node.target.join(' > ');
          const screenshot = await captureElementScreenshot(localPage, selector);
          if (screenshot) {
            node.screenshot = screenshot;
          }
        } catch (error) {
          console.error('Error capturing violation screenshot:', error);
        }
      }
    }

    // Filter results based on WCAG levels
    const filterByWcagLevel = (result: any) => {
      const tags = result.tags || [];
      const wcagTags = tags.filter((tag: string) => tag.startsWith('wcag2'));
      
      if (wcagTags.length === 0) return true; // Include results without WCAG tags
      
      return wcagTags.some((tag: string) => {
        if (tag.endsWith('a') && wcagLevels.A) return true;
        if (tag.endsWith('aa') && wcagLevels.AA) return true;
        if (tag.endsWith('aaa') && wcagLevels.AAA) return true;
        return false;
      });
    };

    // Map inapplicable results to nonApplicable and filter
    const nonApplicable = results.inapplicable
      .filter(filterByWcagLevel)
      .map(result => ({
        id: result.id,
        impact: result.impact,
        description: result.description,
        help: result.help,
        helpUrl: result.helpUrl,
        tags: result.tags
      }));

    return {
      violations: results.violations.filter(filterByWcagLevel),
      passes: results.passes.filter(filterByWcagLevel),
      incomplete: results.incomplete.filter(filterByWcagLevel),
      nonApplicable
    };
  } catch (error) {
    console.error('Accessibility check failed:', error);
    throw error;
  } finally {
    if (localPage) {
      try {
        await localPage.close();
      } catch (e) {
        console.error('Error closing local page:', e);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
}

// Add common user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

// Add blocked sites detection
const BLOCKED_SITES = new Set([
  'reddit.com',
  'www.reddit.com',
  'udemy.com',
  'www.udemy.com'
]);

async function crawlPage(
  url: string,
  takeScreenshots: boolean,
  visited: Set<string>,
  baseUrl: string,
  collectLinks: boolean,
  checkAccessibility: boolean,
  wcagLevels: { A: boolean; AA: boolean; AAA: boolean },
  increaseTimeout: boolean,
  slowRateLimit: boolean
): Promise<CrawlResult> {
  log(`Starting crawl of ${url}`);
  
  // Check if site is known to block crawlers
  const urlObj = new URL(url);
  if (BLOCKED_SITES.has(urlObj.hostname)) {
    return {
      url,
      links: [],
      error: `This website (${urlObj.hostname}) is known to block web crawlers. Please use their official API or contact them for access.`
    };
  }

  if (visited.has(url)) {
    log(`URL ${url} already visited, skipping`);
    return { url, links: [] };
  }
  
  visited.add(url);
  const browser = await getBrowser();
  const page = await browser.newPage();
  let pageClosed = false;
  
  try {
    // Set timeouts based on the increaseTimeout option
    const timeout = increaseTimeout ? 120000 : 60000; // 120 seconds if increased, 60 seconds default
    await page.setDefaultTimeout(timeout);
    await page.setDefaultNavigationTimeout(timeout);
    
    // Set a random user agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(userAgent);
    
    // Configure page to handle redirects and dialogs
    await page.setRequestInterception(false); // Disable request interception
    
    // Handle JavaScript dialogs
    page.on('dialog', async (dialog: Dialog) => {
      await dialog.dismiss();
    });

    // Set a longer timeout and wait until network is idle
    log(`Navigating to ${url}`);
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Changed from networkidle0 to domcontentloaded
      timeout
    });

    // Handle various HTTP status codes
    const status = response?.status();
    if (status) {
      if (status === 403) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: 'Access forbidden (403). This website is blocking web crawlers. Please use their official API or contact them for access.'
        };
      }
      if (status === 429) {
        await page.close();
        pageClosed = true;
        return {
          url,
          links: [],
          error: 'Too many requests (429). This website is rate limiting access. Please try again later.'
        };
      }
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

    // Check for common anti-bot measures
    const isBlocked = await page.evaluate(() => {
      // Check for common anti-bot elements
      const hasCaptcha = document.querySelector('form[action*="captcha"]') !== null;
      const hasCloudflare = document.querySelector('#cf-please-wait') !== null;
      const hasBotDetection = document.querySelector('form[action*="bot"]') !== null;
      
      return hasCaptcha || hasCloudflare || hasBotDetection;
    });

    if (isBlocked) {
      await page.close();
      pageClosed = true;
      return {
        url,
        links: [],
        error: 'This website has detected automated access and is blocking the crawler. Please use their official API or contact them for access.'
      };
    }

    // Wait for the page to be fully loaded
    try {
      await Promise.race([
        page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 30000 }), // Increased from 5000ms to 30000ms
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Page load timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.log(`Page load timeout for ${url}, continuing anyway...`);
      // Continue execution even if timeout occurs
    }

    // Wait for any dynamic content to load with increased timeout
    try {
      await page.waitForTimeout(5000); // Increased from 2000ms to 5000ms
    } catch (error) {
      console.log(`Dynamic content load timeout for ${url}, continuing anyway...`);
      // Continue execution even if timeout occurs
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

    let accessibilityResults: CrawlResult['accessibilityResults'] | undefined;
    if (checkAccessibility && !pageClosed) {
      try {
        // Create temp directory for accessibility check
        const tempDir = path.join(process.cwd(), 'temp', crypto.randomBytes(16).toString('hex'));
        fs.mkdirSync(tempDir, { recursive: true });
        
        try {
          // Run accessibility check on the local copy
          accessibilityResults = await runAccessibilityCheckOnLocalCopy(page, tempDir, wcagLevels);
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
    
    // If slowRateLimit is enabled, add a delay between requests
    if (slowRateLimit) {
      await delay(2000); // 2 second delay between requests
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
      const { 
        url, 
        takeScreenshots, 
        crawlEntireWebsite, 
        checkAccessibility, 
        wcagLevels,
        increaseTimeout,
        slowRateLimit,
        concurrentPages 
      }: CrawlRequest = await request.json();
      
      if (!url) {
        console.error('No URL provided');
        await writeResponse({ error: 'URL is required' });
        await closeWriter();
        return;
      }

      log(`Starting crawl for URL: ${url}`);
      log('Options:', { 
        takeScreenshots, 
        crawlEntireWebsite, 
        checkAccessibility, 
        wcagLevels,
        increaseTimeout,
        slowRateLimit,
        concurrentPages 
      });

      // Clean up old screenshots and temp files before starting new scan
      if (takeScreenshots) {
        log('Cleaning up old screenshots');
        await cleanupScreenshots();
      }
      
      // Always clean up temp directory at the start of a new scan
      log('Cleaning up temp directory');
      await cleanupTempDir();
      
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
          
          // Process URLs in parallel with the specified concurrency limit
          for (let i = 0; i < urlsToCrawl.length; i += concurrentPages) {
            if (!isClientConnected) {
              log('Client disconnected, stopping crawl');
              break;
            }
            
            const batch = urlsToCrawl.slice(i, i + concurrentPages);
            log(`Processing batch of ${batch.length} URLs with concurrency ${concurrentPages}`);
            const batchResults = await Promise.all(
              batch.map(urlToCrawl => 
                !visited.has(urlToCrawl) ? crawlPage(urlToCrawl, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels, increaseTimeout, slowRateLimit) : null
              )
            );
            
            results.push(...batchResults.filter((r): r is CrawlResult => r !== null));
            log(`Completed batch, total results: ${results.length}`);
            
            // Send only new results in intermediate responses
            await writeResponse({
              newResults: batchResults.filter((r): r is CrawlResult => r !== null),
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
              // Process new links with the specified concurrency
              const newLinksArray = Array.from(newLinks);
              for (let j = 0; j < newLinksArray.length; j += concurrentPages) {
                if (!isClientConnected) {
                  log('Client disconnected, stopping crawl');
                  break;
                }
                
                const newBatch = newLinksArray.slice(j, j + concurrentPages);
                log(`Crawling new batch of ${newBatch.length} links`);
                const newBatchResults = await Promise.all(
                  newBatch.map(link => crawlPage(link, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels, increaseTimeout, slowRateLimit))
                );
                
                results.push(...newBatchResults);
                
                // Send only new results in intermediate responses
                await writeResponse({
                  newResults: newBatchResults,
                  usedSitemap,
                  isComplete: false,
                  checkedAccessibility: checkAccessibility
                });
                
                // Add a small delay between batches if rate limiting is enabled
                if (slowRateLimit) {
                  await delay(1000);
                }
              }
            }
          }
        } else {
          log('Starting single page crawl');
          // Single page crawl
          const result = await crawlPage(
            url, 
            takeScreenshots, 
            visited, 
            baseUrl, 
            false, 
            checkAccessibility, 
            wcagLevels,
            increaseTimeout,
            slowRateLimit
          );
          results.push(result);
          
          // Send only the new result in intermediate response
          await writeResponse({
            newResults: [result],
            usedSitemap,
            isComplete: false,
            checkedAccessibility: checkAccessibility
          });
        }
        
        if (isClientConnected) {
          log('Crawl completed, sending final results');
          // Send final results (full array)
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