const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
const { URL } = require('url');

// Configuration for anti-bot measures
const THROTTLE_ENABLED = process.env.THROTTLE_ENABLED !== 'false';
const THROTTLE_MIN_MS = parseInt(process.env.THROTTLE_MIN_MS) || 100;
const THROTTLE_MAX_MS = parseInt(process.env.THROTTLE_MAX_MS) || 500;

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

// Function to check if IP is private
function isPrivateIP(hostname) {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];
  
  return privatePatterns.some(pattern => pattern.test(hostname));
}

// Function to apply throttling
async function applyThrottling() {
  if (THROTTLE_ENABLED) {
    const throttleDelay = Math.floor(Math.random() * (THROTTLE_MAX_MS - THROTTLE_MIN_MS)) + THROTTLE_MIN_MS;
    console.log(`⏱️ Throttling request by ${throttleDelay}ms to avoid bot detection`);
    await new Promise(resolve => setTimeout(resolve, throttleDelay));
  }
}

// Main Vercel serverless function
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight' });
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
    return;
  }

  let browser = null;
  let page = null;

  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      res.status(400).json({ 
        error: 'URL parameter is required',
        usage: '/learn?url=<TARGET_URL>'
      });
      return;
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (error) {
      res.status(400).json({ 
        error: 'Invalid URL format',
        details: 'Please provide a valid URL with protocol (http:// or https://)'
      });
      return;
    }

    // Security: Block localhost and private IPs
    if (isPrivateIP(parsedUrl.hostname)) {
      res.status(403).json({ 
        error: 'Access to private IPs is not allowed',
        hostname: parsedUrl.hostname
      });
      return;
    }

    console.log(`🔍 Learning from: ${targetUrl}`);

    // Apply throttling
    await applyThrottling();

    // Launch headless browser with serverless-optimized settings
    console.log('🚀 Launching headless browser...');
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-ipc-flooding-protection',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    // Create new page
    page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set anti-bot headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });

    // Forward client headers if present
    if (req.headers['cookie']) {
      await page.setExtraHTTPHeaders({
        'Cookie': req.headers['cookie']
      });
    }
    if (req.headers['authorization']) {
      await page.setExtraHTTPHeaders({
        'Authorization': req.headers['authorization']
      });
    }
    if (req.headers['referer']) {
      await page.setExtraHTTPHeaders({
        'Referer': req.headers['referer']
      });
    }

    // Navigate to the target URL with timeout
    console.log(`📄 Loading page: ${targetUrl}`);
    
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 25000 // 25 second timeout for Vercel
    });

    // Wait for any remaining dynamic content
    await page.waitForTimeout(1000);

    // Get the full HTML content
    const htmlContent = await page.content();
    
    console.log(`✅ Successfully learned from ${targetUrl} - Content length: ${htmlContent.length} chars`);

    // Set response headers for iframe compatibility
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Return the full HTML content
    res.status(200).send(htmlContent);

  } catch (error) {
    console.error(`❌ Learning error for ${req.query.url}:`, error.message);
    
    let errorMessage = 'Failed to learn from the requested website';
    let statusCode = 500;
    
    if (error.message.includes('Navigation timeout')) {
      errorMessage = 'Page load timeout. The website is taking too long to respond.';
      statusCode = 504;
    } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Website not found. Please check the URL.';
      statusCode = 404;
    } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      errorMessage = 'Connection refused. The website may be down.';
      statusCode = 503;
    } else if (error.message.includes('net::ERR_ABORTED')) {
      errorMessage = 'Request was aborted. The website may have blocked the request.';
      statusCode = 403;
    } else if (error.message.includes('Protocol error')) {
      errorMessage = 'Protocol error occurred while loading the page.';
      statusCode = 502;
    } else if (error.message.includes('Target page, context or browser has been closed')) {
      errorMessage = 'Browser session expired. Please try again.';
      statusCode = 408;
    }
    
    // Add CORS headers to error response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      url: req.query.url,
      statusCode: statusCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Clean up browser resources
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.warn('Warning: Could not close page:', e.message);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Warning: Could not close browser:', e.message);
      }
    }
  }
}
