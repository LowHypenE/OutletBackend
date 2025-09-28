const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const cheerio = require('cheerio');
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
    contentSecurityPolicy: false, // Disable CSP for proxy functionality
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
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/proxy', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        features: {
            antiBotMeasures: true,
            headerForwarding: true,
            throttling: THROTTLE_ENABLED,
            redirectHandling: true,
            enhancedLogging: true
        }
    });
});

// Main proxy endpoint
app.get('/proxy', async (req, res) => {
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

        console.log(`Proxying request to: ${targetUrl}`);

        // Build headers to reduce 403 errors - forward client headers and add browser-like defaults
        const requestHeaders = {
            // Default browser-like headers to avoid bot detection
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };

        // Forward client headers if present (helps with authentication and session handling)
        if (req.headers['user-agent']) {
            requestHeaders['User-Agent'] = req.headers['user-agent'];
        }
        if (req.headers['accept']) {
            requestHeaders['Accept'] = req.headers['accept'];
        }
        if (req.headers['accept-language']) {
            requestHeaders['Accept-Language'] = req.headers['accept-language'];
        }
        if (req.headers['cookie']) {
            requestHeaders['Cookie'] = req.headers['cookie'];
        }
        if (req.headers['referer']) {
            requestHeaders['Referer'] = req.headers['referer'];
        }
        if (req.headers['authorization']) {
            requestHeaders['Authorization'] = req.headers['authorization'];
        }

        // Optional throttling to reduce anti-bot triggers (configurable random delay)
        if (THROTTLE_ENABLED) {
            const throttleDelay = Math.floor(Math.random() * (THROTTLE_MAX_MS - THROTTLE_MIN_MS)) + THROTTLE_MIN_MS;
            console.log(`⏱️  Throttling request by ${throttleDelay}ms to avoid bot detection`);
            await new Promise(resolve => setTimeout(resolve, throttleDelay));
        }

        // Fetch the target website with improved headers
        const response = await axios.get(targetUrl, {
            timeout: 30000, // 30 second timeout
            maxRedirects: 10, // Increased redirect limit for better compatibility
            headers: requestHeaders,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
            }
        });

        // Log the response status for monitoring
        console.log(`✅ Proxied ${targetUrl} - Status: ${response.status} ${response.statusText}`);

        // Get content type
        const contentType = response.headers['content-type'] || 'text/html';
        
        // If it's not HTML, stream it directly
        if (!contentType.includes('text/html')) {
            // Set appropriate headers for non-HTML content
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            
            return res.send(response.data);
        }

        // Process HTML content
        const $ = cheerio.load(response.data);
        
        // Remove problematic headers and meta tags
        $('meta[http-equiv="X-Frame-Options"]').remove();
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Content-Type-Options"]').remove();
        
        // Add base tag to handle relative URLs
        $('head').prepend(`<base href="${parsedUrl.origin}/">`);
        
        // Rewrite relative URLs to go through our proxy
        rewriteUrls($, parsedUrl, req);
        
        // Add some CSS to improve iframe display
        $('head').append(`
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    overflow-x: auto;
                }
                /* Hide elements that might cause issues in iframe */
                iframe[src*="facebook.com"],
                iframe[src*="twitter.com"],
                iframe[src*="instagram.com"] {
                    display: none !important;
                }
            </style>
        `);

        // Set response headers
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

        res.send($.html());

    } catch (error) {
        console.error(`❌ Proxy error for ${targetUrl}:`, error.message);
        
        let errorMessage = 'Failed to load the requested website';
        let statusCode = 500;
        
        if (error.code === 'ENOTFOUND') {
            errorMessage = 'Website not found. Please check the URL.';
            statusCode = 404;
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. The website may be down.';
            statusCode = 503;
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Request timed out. The website is taking too long to respond.';
            statusCode = 504;
        } else if (error.response) {
            statusCode = error.response.status;
            if (statusCode === 403) {
                errorMessage = 'Access denied. The website blocked the request (403 Forbidden).';
            } else if (statusCode === 429) {
                errorMessage = 'Too many requests. The website is rate limiting requests.';
            } else {
                errorMessage = `Website returned error ${statusCode}`;
            }
        } else if (error.code === 'CERT_HAS_EXPIRED') {
            errorMessage = 'SSL certificate has expired.';
            statusCode = 526;
        } else if (error.code === 'CERT_UNTRUSTED') {
            errorMessage = 'SSL certificate is not trusted.';
            statusCode = 526;
        }
        
        // Return consistent JSON error format
        res.status(statusCode).json({ 
            error: errorMessage,
            url: targetUrl,
            statusCode: statusCode,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Function to rewrite URLs in HTML content (FIXED: now accepts req parameter)
function rewriteUrls($, baseUrl, req) {
    // Get the correct protocol and host from the request
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'outletbackend.onrender.com';
    const proxyBase = `${protocol}://${host}/proxy?url=`;
    
    // Rewrite links
    $('a[href]').each(function() {
        const href = $(this).attr('href');
        if (href) {
            try {
                const absoluteUrl = new URL(href, baseUrl).href;
                $(this).attr('href', `${proxyBase}${encodeURIComponent(absoluteUrl)}`);
            } catch (e) {
                // Skip invalid URLs
                console.warn('Invalid URL in link:', href);
            }
        }
    });
    
    // Rewrite form actions
    $('form[action]').each(function() {
        const action = $(this).attr('action');
        if (action) {
            try {
                const absoluteUrl = new URL(action, baseUrl).href;
                $(this).attr('action', `${proxyBase}${encodeURIComponent(absoluteUrl)}`);
            } catch (e) {
                console.warn('Invalid URL in form action:', action);
            }
        }
    });
    
    // Rewrite image sources
    $('img[src]').each(function() {
        const src = $(this).attr('src');
        if (src && !src.startsWith('data:')) {
            try {
                const absoluteUrl = new URL(src, baseUrl).href;
                $(this).attr('src', `${proxyBase}${encodeURIComponent(absoluteUrl)}`);
            } catch (e) {
                console.warn('Invalid URL in image src:', src);
            }
        }
    });
    
    // Rewrite script sources
    $('script[src]').each(function() {
        const src = $(this).attr('src');
        if (src && !src.startsWith('data:')) {
            try {
                const absoluteUrl = new URL(src, baseUrl).href;
                $(this).attr('src', `${proxyBase}${encodeURIComponent(absoluteUrl)}`);
            } catch (e) {
                console.warn('Invalid URL in script src:', src);
            }
        }
    });
    
    // Rewrite CSS sources
    $('link[href]').each(function() {
        const href = $(this).attr('href');
        if (href && !href.startsWith('data:')) {
            try {
                const absoluteUrl = new URL(href, baseUrl).href;
                $(this).attr('href', `${proxyBase}${encodeURIComponent(absoluteUrl)}`);
            } catch (e) {
                console.warn('Invalid URL in link href:', href);
            }
        }
    });
}

// Function to check if IP is private
function isPrivateIP(hostname) {
    // This is a simplified check - in production you might want more robust validation
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
        availableEndpoints: ['/health', '/proxy']
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 OutletV1 Backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/proxy?url=<TARGET_URL>`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Trust proxy: ${app.get('trust proxy')}`);
    console.log(`⏱️  Throttling: ${THROTTLE_ENABLED ? `enabled (${THROTTLE_MIN_MS}-${THROTTLE_MAX_MS}ms)` : 'disabled'}`);
    console.log(`🛡️  Anti-bot measures: Enhanced headers, client forwarding, random delays`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;