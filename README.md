# OutletBackend - Learning Service

A Node.js + Express backend service that uses headless Chrome (Puppeteer) to learn from external websites and return fully rendered HTML content. This service is designed to handle JavaScript-heavy sites like Google, YouTube, and Reddit that typically return 403 errors with traditional HTTP requests.

## 🌟 Features

- **Headless Browser**: Uses Puppeteer with Chrome for full JavaScript rendering
- **Realistic Browser Simulation**: Windows Chrome user agent and headers
- **Network Idle Waiting**: Waits for `networkidle2` to ensure complete page load
- **Anti-Bot Protection**: Throttling, realistic headers, and browser behavior
- **Render-Ready**: Optimized for deployment on Render with proper Chrome args
- **Error Handling**: Comprehensive error handling with specific error messages
- **Resource Management**: Proper browser instance management and cleanup

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Chrome/Chromium (installed automatically with Puppeteer)

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Test the learning endpoint**
   ```bash
   curl "http://localhost:10000/learn?url=https://www.google.com"
   ```

## 🌐 API Endpoints

### Learning Endpoint
```
GET /learn?url=<TARGET_URL>
```

**Description**: Learns from the target website using a headless browser and returns the fully rendered HTML.

**Parameters**:
- `url` (required): The target website URL to learn from

**Response**: Full HTML content of the rendered page

**Example**:
```bash
curl "https://outletbackend.onrender.com/learn?url=https://www.youtube.com"
```

### Health Check
```
GET /health
```

**Description**: Returns server status and feature information.

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "port": 10000,
  "environment": "production",
  "features": {
    "headlessBrowser": true,
    "antiBotMeasures": true,
    "headerForwarding": true,
    "throttling": true,
    "redirectHandling": true,
    "enhancedLogging": true
  }
}
```

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 10000)
- `NODE_ENV`: Environment (development/production)
- `THROTTLE_ENABLED`: Enable request throttling (default: true)
- `THROTTLE_MIN_MS`: Minimum throttle delay in ms (default: 100)
- `THROTTLE_MAX_MS`: Maximum throttle delay in ms (default: 500)

### Chrome Arguments

The headless browser is configured with these arguments for Render compatibility:
- `--no-sandbox`: Required for Render deployment
- `--disable-setuid-sandbox`: Security sandbox disable
- `--disable-dev-shm-usage`: Memory optimization
- `--disable-gpu`: GPU acceleration disable
- `--disable-web-security`: CORS bypass for learning

## 🛡️ Anti-Bot Measures

### Browser Simulation
- **Realistic User Agent**: Windows Chrome 120
- **Complete Headers**: Accept, Accept-Language, DNT, Sec-Fetch-*
- **Viewport**: 1920x1080 desktop resolution
- **Network Idle**: Waits for network to be idle before returning content

### Request Throttling
- **Random Delays**: 100-500ms between requests
- **Configurable**: Can be disabled via environment variables
- **Anti-Detection**: Reduces likelihood of being flagged as automated

### Header Forwarding
- **Client Headers**: Forwards User-Agent, Accept, Accept-Language
- **Authentication**: Preserves Cookies and Authorization headers
- **Referer**: Maintains referrer chain for proper navigation

## 📊 Performance

### Resource Usage
- **Memory**: ~100-200MB per browser instance
- **CPU**: Moderate usage during page rendering
- **Network**: Full page content transfer
- **Time**: 2-5 seconds per request (including throttling)

### Optimization
- **Browser Reuse**: Single browser instance for all requests
- **Page Cleanup**: Automatic page closure after each request
- **Timeout Handling**: 30-second timeout for page loads
- **Error Recovery**: Graceful handling of browser crashes

## 🚀 Deployment

### Render Deployment

1. **Connect Repository**
   - Link your GitHub repository to Render
   - Select the `outlet_backend` folder as root directory

2. **Configure Build**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18.x

3. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   THROTTLE_ENABLED=true
   ```

4. **Deploy**
   - Render will automatically install Puppeteer and Chrome
   - The service will be available at `https://your-app.onrender.com`

### Other Platforms

The service can be deployed on any platform that supports:
- Node.js 16+
- Chrome/Chromium installation
- Sufficient memory (512MB+ recommended)

## 🔍 Monitoring

### Logs
The service provides detailed logging:
- `🔍 Learning from: <URL>` - Request start
- `⏱️ Throttling request by Xms` - Throttling applied
- `📄 Loading page: <URL>` - Page navigation
- `✅ Successfully learned from <URL>` - Success
- `❌ Learning error for <URL>` - Errors

### Health Monitoring
Use the `/health` endpoint to monitor:
- Server uptime
- Feature status
- Browser availability
- Configuration settings

## 🚨 Troubleshooting

### Common Issues

1. **Browser Launch Failures**
   - Ensure Chrome is installed
   - Check memory availability
   - Verify Chrome arguments

2. **Page Load Timeouts**
   - Increase timeout in code
   - Check network connectivity
   - Verify target URL accessibility

3. **Memory Issues**
   - Monitor browser instance usage
   - Restart service if needed
   - Check for memory leaks

4. **403 Errors**
   - Verify anti-bot measures are enabled
   - Check throttling configuration
   - Ensure realistic headers are set

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and additional logging.

## 📝 Examples

### Basic Learning Request
```bash
curl "https://outletbackend.onrender.com/learn?url=https://www.google.com"
```

### With Custom Headers
```bash
curl -H "Cookie: session=abc123" \
     -H "User-Agent: Custom Browser" \
     "https://outletbackend.onrender.com/learn?url=https://www.youtube.com"
```

### Health Check
```bash
curl "https://outletbackend.onrender.com/health"
```

## 🔄 Migration from Proxy

This service replaces the previous HTTP-based proxy with a headless browser approach:

- **Old Endpoint**: `/proxy?url=<TARGET_URL>`
- **New Endpoint**: `/learn?url=<TARGET_URL>`
- **Old Method**: HTTP fetch with headers
- **New Method**: Headless Chrome with full rendering

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for OutletV1 Learning Platform**
