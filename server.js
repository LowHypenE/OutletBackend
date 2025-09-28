const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration for anti-bot measures
const THROTTLE_ENABLED = process.env.THROTTLE_ENABLED !== 'false'; // Enable by default
const THROTTLE_MIN_MS = parseInt(process.env.THROTTLE_MIN_MS) || 100;
const THROTTLE_MAX_MS = parseInt(process.env.THROTTLE_MAX_MS) || 500;

// Trust proxy for Render hosting (fixes express-rate-limit X-Forwarded-For error)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for learning functionality
    crossOriginEmbedderPolicy: false
}));

// CORS configuration for all frontend domains
app.use(cors({
    origin: [
        'http://localhost:3000', // Local development
        'https://*.onrender.com', // Render frontend domains
        'https://*.netlify.app', // Netlify domains
        'https://*.vercel.app', // Vercel domains
        'https://*.github.io' // GitHub Pages
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Reduced limit for headless browser (more resource intensive)
    message: {
        error: 'Too many learning requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/learn', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global browser instance for performance
let browser = null;

// Initialize browser instance
async function initBrowser() {
    if (browser) return browser;
    
    console.log('🚀 Launching headless browser...');
    
    browser = await puppeteer.launch({
        headless: 'new',
        args: [
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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
    
    console.log('✅ Headless browser ready');
    return browser;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        features: {
            headlessBrowser: true,
            antiBotMeasures: true,
            headerForwarding: true,
            throttling: THROTTLE_ENABLED,
            redirectHandling: true,
            enhancedLogging: true
        }
    });
});

// Main learning endpoint (formerly proxy)
app.get('/learn', async (req, res) => {
    let page = null;
    
    try {
        const targetUrl = req.query.url;
        
        if (!targetUrl) {
            return res.status(400).json({ 
                error: 'URL parameter is required' 
            });
        }

        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch (error) {
            return res.status(400).json({ 
                error: 'Invalid URL format' 
            });
        }

        // Security: Block localhost and private IPs (optional)
        if (isPrivateIP(parsedUrl.hostname)) {
            return res.status(403).json({ 
                error: 'Access to private IPs is not allowed' 
            });
        }

        console.log(`🔍 Learning from: ${targetUrl}`);

        // Optional throttling to reduce anti-bot triggers
        if (THROTTLE_ENABLED) {
            const throttleDelay = Math.floor(Math.random() * (THROTTLE_MAX_MS - THROTTLE_MIN_MS)) + THROTTLE_MIN_MS;
            console.log(`⏱️  Throttling request by ${throttleDelay}ms to avoid bot detection`);
            await new Promise(resolve => setTimeout(resolve, throttleDelay));
        }

        // Initialize browser if not already done
        const browserInstance = await initBrowser();
        
        // Create new page
        page = await browserInstance.newPage();
        
        // Set realistic viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set additional headers to appear more like a real browser
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

        // Navigate to the target URL and wait for full load
        console.log(`📄 Loading page: ${targetUrl}`);
        
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', // Wait for network to be idle for 500ms
            timeout: 30000 // 30 second timeout
        });

        // Wait a bit more for any dynamic content to load
        await page.waitForTimeout(1000);

        // Get the full HTML content
        const htmlContent = await page.content();
        
        // Log successful learning
        console.log(`✅ Successfully learned from ${targetUrl} - Content length: ${htmlContent.length} chars`);

        // Set response headers for iframe compatibility
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'ALLOWALL',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });

        // Return the full HTML content
        res.send(htmlContent);

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
        }
        
        // Return consistent JSON error format
        res.status(statusCode).json({ 
            error: errorMessage,
            url: req.query.url,
            statusCode: statusCode,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        // Clean up page
        if (page) {
            try {
                await page.close();
            } catch (e) {
                console.warn('Warning: Could not close page:', e.message);
            }
        }
    }
});

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

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['/health', '/learn']
    });
});

// Graceful shutdown
async function gracefulShutdown() {
    console.log('🛑 Shutting down gracefully...');
    
    if (browser) {
        try {
            await browser.close();
            console.log('✅ Browser closed');
        } catch (e) {
            console.warn('Warning: Could not close browser:', e.message);
        }
    }
    
    process.exit(0);
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 OutletV1 Learning Backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Learning endpoint: http://localhost:${PORT}/learn?url=<TARGET_URL>`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Trust proxy: ${app.get('trust proxy')}`);
    console.log(`⏱️  Throttling: ${THROTTLE_ENABLED ? `enabled (${THROTTLE_MIN_MS}-${THROTTLE_MAX_MS}ms)` : 'disabled'}`);
    console.log(`🛡️  Anti-bot measures: Headless browser, enhanced headers, random delays`);
    console.log(`🌐 Browser: Headless Chrome with realistic user agent`);
    
    // Initialize browser on startup
    try {
        await initBrowser();
    } catch (error) {
        console.error('❌ Failed to initialize browser:', error.message);
    }
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;