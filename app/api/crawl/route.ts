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

async function cleanupViolationScreenshots() {
  const screenshotDir = path.join(process.cwd(), 'public', 'violation-screenshots');
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
  
  // Get all CSS files and their contents before modifying the HTML
  const cssFiles = await page.evaluate(() => {
    return Array.from(document.styleSheets).map(sheet => {
      try {
        if (sheet.href) {
          return {
            href: sheet.href,
            rules: Array.from(sheet.cssRules || []).map(rule => rule.cssText)
          };
        } else {
          // Handle inline stylesheets
          return {
            href: null,
            rules: Array.from(sheet.cssRules || []).map(rule => rule.cssText)
          };
        }
      } catch (e) {
        console.error('Error accessing stylesheet:', e);
        return null;
      }
    }).filter((item): item is { href: string | null; rules: string[] } => item !== null);
  });

  // Create a CSS directory
  const cssDir = path.join(tempDir, 'css');
  fs.mkdirSync(cssDir, { recursive: true });

  // Save all CSS files and collect their new paths
  const cssPaths = new Map<string, string>();
  let cssContent = '';

  // First, add all external CSS
  for (const cssFile of cssFiles) {
    if (cssFile.href) {
      try {
        const cssUrl = new URL(cssFile.href);
        const cssFilename = path.basename(cssUrl.pathname) || 'style.css';
        const cssPath = path.join('css', cssFilename);
        const fullCssPath = path.join(tempDir, cssPath);
        
        // Combine all rules into a single CSS file
        const fileContent = cssFile.rules.join('\n');
        fs.writeFileSync(fullCssPath, fileContent);
        
        // Store the mapping of original URL to new path
        cssPaths.set(cssFile.href, cssPath);
        
        // Add to combined CSS content
        cssContent += `/* From ${cssFile.href} */\n${fileContent}\n\n`;
      } catch (error) {
        console.error(`Error saving CSS file ${cssFile.href}:`, error);
      }
    } else {
      // Handle inline stylesheets
      cssContent += `/* Inline styles */\n${cssFile.rules.join('\n')}\n\n`;
    }
  }

  // Save the combined CSS file
  const combinedCssPath = path.join('css', 'combined.css');
  const fullCombinedCssPath = path.join(tempDir, combinedCssPath);
  fs.writeFileSync(fullCombinedCssPath, cssContent);

  // Modify the HTML to use the combined CSS file
  let modifiedHtml = html;
  
  // Remove all existing style and link tags
  modifiedHtml = modifiedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  modifiedHtml = modifiedHtml.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/g, '');
  
  // Add the combined CSS file
  modifiedHtml = modifiedHtml.replace('</head>', `<link rel="stylesheet" href="${combinedCssPath}"></head>`);

  // Save all images
  const images = await page.evaluate(() => {
    return Array.from(document.images).map(img => img.src);
  });

  // Create an images directory
  const imgDir = path.join(tempDir, 'images');
  fs.mkdirSync(imgDir, { recursive: true });

  for (const imgUrl of images) {
    try {
      const response = await page.goto(imgUrl, { 
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      if (response && response.ok()) {
        const buffer = await response.buffer();
        const imgFilename = path.basename(new URL(imgUrl).pathname);
        const imgPath = path.join('images', imgFilename);
        const fullImgPath = path.join(tempDir, imgPath);
        fs.writeFileSync(fullImgPath, buffer);
        
        // Update image references in HTML
        modifiedHtml = modifiedHtml.replace(
          new RegExp(`src=["']${imgUrl}["']`, 'g'),
          `src="${imgPath}"`
        );
      }
    } catch (error) {
      console.error(`Error saving image ${imgUrl}:`, error);
    }
  }

  // Save the final HTML
  fs.writeFileSync(path.join(tempDir, 'index.html'), modifiedHtml);

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

    // Add highlight to the element using a more reliable approach
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) {
        // Store original styles
        const originalOutline = element.style.outline;
        const originalOutlineOffset = element.style.outlineOffset;
        const originalPosition = element.style.position;
        
        // Apply highlight styles
        element.style.outline = '3px dashed #ff0000';
        element.style.outlineOffset = '2px';
        element.style.position = 'relative';
        
        // Create a container for the label
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-25px';
        container.style.left = '0';
        container.style.zIndex = '1000';
        
        // Create the label
        const label = document.createElement('div');
        label.textContent = 'Accessibility Violation';
        label.style.background = '#ff0000';
        label.style.color = 'white';
        label.style.padding = '2px 8px';
        label.style.fontSize = '12px';
        label.style.borderRadius = '3px';
        
        // Add label to container
        container.appendChild(label);
        
        // Insert container before the element
        if (element.parentNode) {
          element.parentNode.insertBefore(container, element);
        }
        
        // Store references for cleanup
        (window as any).__violationHighlight = {
          element,
          container,
          originalStyles: {
            outline: originalOutline,
            outlineOffset: originalOutlineOffset,
            position: originalPosition
          }
        };
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

    // Clean up the highlight and label
    await page.evaluate(() => {
      const highlight = (window as any).__violationHighlight;
      if (highlight) {
        // Restore original styles
        highlight.element.style.outline = highlight.originalStyles.outline;
        highlight.element.style.outlineOffset = highlight.originalStyles.outlineOffset;
        highlight.element.style.position = highlight.originalStyles.position;
        
        // Remove the container
        if (highlight.container && highlight.container.parentNode) {
          highlight.container.parentNode.removeChild(highlight.container);
        }
        
        // Clean up the reference
        delete (window as any).__violationHighlight;
      }
    });

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
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
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
          '--window-size=1920,1080'
        ],
        ignoreHTTPSErrors: true
      });

      // Create a new page for the local copy
      localPage = await browser.newPage();
      
      // Load the local copy
      const response = await localPage.goto(localUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      if (!response) {
        throw new Error('Failed to load local file');
      }

      // Wait for the page to be fully loaded
      await localPage.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 10000 });

      // Inject axe-core into the local copy
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
          pingWaitTime: 2000,
          resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable']
        });
      });

      // Run the analysis on the local copy
      const results = await localPage.evaluate(() => {
        return new Promise<any>((resolve, reject) => {
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
            reject(error);
          });
        });
      });

      // Capture screenshots for violations
      for (const violation of results.violations) {
        for (const node of violation.nodes) {
          try {
            // Convert target array to CSS selector
            const selector = node.target.join(' > ');
            
            // Take screenshot without modifying the DOM
            const element = await localPage.$(selector);
            if (element) {
              const box = await element.boundingBox();
              if (box) {
                const screenshotDir = path.join(process.cwd(), 'public', 'violation-screenshots');
                if (!fs.existsSync(screenshotDir)) {
                  fs.mkdirSync(screenshotDir, { recursive: true });
                }

                const filename = `${generateSafeFilename(selector)}.png`;
                const fullPath = path.join(screenshotDir, filename);

                // Add padding around the element
                const padding = 20;
                await localPage.screenshot({
                  path: fullPath,
                  clip: {
                    x: Math.max(0, box.x - padding),
                    y: Math.max(0, box.y - padding),
                    width: box.width + (padding * 2),
                    height: box.height + (padding * 2)
                  }
                });

                node.screenshot = `/violation-screenshots/${filename}`;
              }
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
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      
      if (retryCount === maxRetries) {
        return {
          violations: [],
          passes: [],
          incomplete: [],
          nonApplicable: [],
          error: `Failed to run accessibility check after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`
        };
      }
      
      // Clean up before retry
      if (localPage) {
        try {
          await localPage.close();
        } catch (e) {
          console.error('Error closing page:', e);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      // Clean up
      if (localPage) {
        try {
          await localPage.close();
        } catch (e) {
          console.error('Error closing page:', e);
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

  return {
    violations: [],
    passes: [],
    incomplete: [],
    nonApplicable: [],
    error: 'Failed to run accessibility check after all retries'
  };
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

    log(`Navigating to ${url}`);
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
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

    // Wait for the page to be fully loaded with a shorter timeout
    try {
      await Promise.race([
        page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 15000 }), // Reduced from 30000 to 15000
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Page load timeout')), 15000)
        )
      ]);
    } catch (error) {
      console.log(`Page load timeout for ${url}, continuing anyway...`);
    }

    // Take screenshot if requested
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
    
    // Collect links if requested
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

    // Run accessibility check if requested
    let accessibilityResults: CrawlResult['accessibilityResults'] | undefined;
    if (checkAccessibility && !pageClosed) {
      try {
        log(`Starting accessibility check for ${url}`);
        const startTime = Date.now();
        
        // Create temp directory for accessibility check
        const tempDir = path.join(process.cwd(), 'temp', crypto.randomBytes(16).toString('hex'));
        fs.mkdirSync(tempDir, { recursive: true });
        
        try {
          // Run accessibility check on the local copy with a shorter timeout
          accessibilityResults = await Promise.race([
            runAccessibilityCheckOnLocalCopy(page, tempDir, wcagLevels),
            new Promise<CrawlResult['accessibilityResults']>((_, reject) => 
              setTimeout(() => reject(new Error('Accessibility check timeout')), 120000) // 2 minute timeout
            )
          ]);
          
          const endTime = Date.now();
          log(`Accessibility check completed for ${url} in ${(endTime - startTime) / 1000} seconds`);
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
      
      // Clean up violation screenshots if accessibility check is enabled
      if (checkAccessibility) {
        log('Cleaning up old violation screenshots');
        await cleanupViolationScreenshots();
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
            
            try {
              // Add timeout for the entire batch
              const batchResults = await Promise.race<Array<CrawlResult | null>>([
                Promise.all(
                  batch.map(async (urlToCrawl) => {
                    if (visited.has(urlToCrawl)) return null;
                    
                    try {
                      return await Promise.race([
                        crawlPage(urlToCrawl, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels, increaseTimeout, slowRateLimit),
                        new Promise<CrawlResult>((_, reject) => 
                          setTimeout(() => reject(new Error('Page crawl timeout')), 180000) // Back to 3 minute timeout
                        )
                      ]);
                    } catch (error) {
                      console.error(`Error crawling ${urlToCrawl}:`, error);
                      return {
                        url: urlToCrawl,
                        links: [],
                        error: error instanceof Error ? error.message : 'Unknown error during crawl'
                      };
                    }
                  })
                ),
                new Promise<Array<CrawlResult | null>>((_, reject) => 
                  setTimeout(() => reject(new Error('Batch processing timeout')), 300000) // Back to 5 minute timeout
                )
              ]);
              
              const validResults = batchResults.filter((r): r is CrawlResult => r !== null);
              results.push(...validResults);
              log(`Completed batch, total results: ${results.length}`);
              
              // Send intermediate results immediately
              await writeResponse({
                newResults: validResults,
                usedSitemap,
                isComplete: false,
                checkedAccessibility: checkAccessibility,
                progress: {
                  current: i + batch.length,
                  total: urlsToCrawl.length
                }
              });
              
              if (!usedSitemap) {
                // Collect all new links from the batch
                const newLinks = new Set<string>();
                validResults.forEach((result: CrawlResult) => {
                  result.links.forEach((link: string) => {
                    if (!visited.has(link)) {
                      newLinks.add(link);
                    }
                  });
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
                  
                  try {
                    // Add timeout for the new batch
                    const newBatchResults = await Promise.race<CrawlResult[]>([
                      Promise.all(
                        newBatch.map(async (link) => {
                          try {
                            return await Promise.race([
                              crawlPage(link, takeScreenshots, visited, baseUrl, true, checkAccessibility, wcagLevels, increaseTimeout, slowRateLimit),
                              new Promise<CrawlResult>((_, reject) => 
                                setTimeout(() => reject(new Error('Page crawl timeout')), 180000) // Back to 3 minute timeout
                              )
                            ]);
                          } catch (error) {
                            console.error(`Error crawling ${link}:`, error);
                            return {
                              url: link,
                              links: [],
                              error: error instanceof Error ? error.message : 'Unknown error during crawl'
                            };
                          }
                        })
                      ),
                      new Promise<CrawlResult[]>((_, reject) => 
                        setTimeout(() => reject(new Error('New batch processing timeout')), 300000) // Back to 5 minute timeout
                      )
                    ]);
                    
                    results.push(...newBatchResults);
                    
                    // Send intermediate results immediately
                    await writeResponse({
                      newResults: newBatchResults,
                      usedSitemap,
                      isComplete: false,
                      checkedAccessibility: checkAccessibility,
                      progress: {
                        current: results.length,
                        total: urlsToCrawl.length + newLinksArray.length
                      }
                    });
                  } catch (error) {
                    console.error('Error processing new batch:', error);
                    await writeResponse({
                      error: `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
                      progress: {
                        current: results.length,
                        total: urlsToCrawl.length + newLinksArray.length
                      }
                    });
                  }
                  
                  // Add a small delay between batches if rate limiting is enabled
                  if (slowRateLimit) {
                    await delay(1000);
                  }
                }
              }
            } catch (error) {
              console.error('Error processing batch:', error);
              await writeResponse({
                error: `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
                progress: {
                  current: results.length,
                  total: urlsToCrawl.length
                }
              });
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