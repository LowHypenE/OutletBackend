# OutletBackend - Vercel Serverless

A serverless Node.js backend service that uses headless Chrome (Puppeteer) to learn from external websites and return fully rendered HTML content. Optimized for Vercel deployment with minimal cold start times.

## 🌟 Features

- **Serverless Architecture**: Optimized for Vercel Lambda functions
- **Headless Browser**: Uses Puppeteer with chrome-aws-lambda for serverless compatibility
- **Realistic Browser Simulation**: Windows Chrome user agent and headers
- **Network Idle Waiting**: Waits for `networkidle2` to ensure complete page load
- **Anti-Bot Protection**: Throttling, realistic headers, and browser behavior
- **Fast Cold Starts**: Optimized for minimal Lambda execution time
- **Error Handling**: Comprehensive error handling with specific error messages
- **Resource Management**: Automatic browser cleanup

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Vercel CLI installed globally

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   vercel dev
   ```

4. **Test the learning endpoint**
   ```bash
   curl "http://localhost:3000/api/learn?url=https://www.google.com"
   ```

## 🌐 API Endpoints

### Learning Endpoint
```
GET /api/learn?url=<TARGET_URL>
```

**Description**: Learns from the target website using a headless browser and returns the fully rendered HTML.

**Parameters**:
- `url` (required): The target website URL to learn from

**Response**: Full HTML content of the rendered page

**Example**:
```bash
curl "https://your-app.vercel.app/api/learn?url=https://www.youtube.com"
```

### Health Check
```
GET /api/health
```

**Description**: Returns server status and feature information.

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "platform": "Vercel Serverless",
  "features": {
    "headlessBrowser": true,
    "antiBotMeasures": true,
    "headerForwarding": true,
    "throttling": true,
    "redirectHandling": true,
    "enhancedLogging": true,
    "serverless": true
  },
  "endpoints": {
    "learn": "/api/learn?url=<TARGET_URL>",
    "health": "/api/health"
  }
}
```

## 🔧 Configuration

### Environment Variables

- `NODE_ENV`: Environment (development/production)
- `THROTTLE_ENABLED`: Enable request throttling (default: true)
- `THROTTLE_MIN_MS`: Minimum throttle delay in ms (default: 100)
- `THROTTLE_MAX_MS`: Maximum throttle delay in ms (default: 500)

### Vercel Configuration

The `vercel.json` file configures:
- **Max Duration**: 30 seconds (Vercel Pro limit)
- **Environment**: Production mode
- **Function Settings**: Optimized for serverless execution

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

### Serverless Optimization
- **Cold Start**: ~2-3 seconds (includes browser launch)
- **Warm Start**: ~1-2 seconds (browser reuse)
- **Memory**: ~256MB per execution
- **Timeout**: 25 seconds (Vercel limit)

### Resource Management
- **Browser Cleanup**: Automatic browser and page closure
- **Memory Optimization**: Single browser instance per request
- **Error Recovery**: Graceful handling of browser crashes

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   ```bash
   vercel env add THROTTLE_ENABLED
   vercel env add THROTTLE_MIN_MS
   vercel env add THROTTLE_MAX_MS
   ```

### GitHub Integration

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Vercel will auto-deploy on push to main

2. **Configure Settings**
   - Root Directory: `outlet_backend`
   - Build Command: `npm install`
   - Output Directory: `api`

3. **Environment Variables**
   - Set in Vercel dashboard or via CLI
   - `NODE_ENV=production`
   - `THROTTLE_ENABLED=true`

## 🔍 Monitoring

### Vercel Analytics
- **Function Logs**: Available in Vercel dashboard
- **Performance Metrics**: Execution time and memory usage
- **Error Tracking**: Automatic error logging and alerts

### Health Monitoring
Use the `/api/health` endpoint to monitor:
- Server status
- Feature availability
- Platform information
- Endpoint documentation

## 🚨 Troubleshooting

### Common Issues

1. **Cold Start Timeouts**
   - Increase Vercel Pro plan for 30s timeout
   - Optimize browser launch arguments
   - Use connection pooling

2. **Memory Issues**
   - Monitor Lambda memory usage
   - Ensure proper browser cleanup
   - Check for memory leaks

3. **Chrome Launch Failures**
   - Verify chrome-aws-lambda installation
   - Check Vercel function logs
   - Ensure proper Chrome arguments

4. **403 Errors**
   - Verify anti-bot measures are enabled
   - Check throttling configuration
   - Ensure realistic headers are set

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and additional logging.

## 📝 Examples

### Basic Learning Request
```bash
curl "https://your-app.vercel.app/api/learn?url=https://www.google.com"
```

### With Custom Headers
```bash
curl -H "Cookie: session=abc123" \
     -H "User-Agent: Custom Browser" \
     "https://your-app.vercel.app/api/learn?url=https://www.youtube.com"
```

### Health Check
```bash
curl "https://your-app.vercel.app/api/health"
```

## 🔄 Migration from Express

This serverless version replaces the Express server:

- **Old**: Express server with persistent browser
- **New**: Vercel serverless functions with per-request browser
- **Old Endpoint**: `/learn?url=<TARGET_URL>`
- **New Endpoint**: `/api/learn?url=<TARGET_URL>`

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for OutletV1 Learning Platform - Vercel Serverless Edition**