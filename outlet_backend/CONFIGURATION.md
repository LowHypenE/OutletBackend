# OutletBackend Configuration

## Environment Variables

### Server Configuration
- `PORT`: Server port (default: 10000)
- `NODE_ENV`: Environment (development/production)

### Anti-Bot Configuration
- `THROTTLE_ENABLED`: Enable request throttling (default: true)
- `THROTTLE_MIN_MS`: Minimum throttle delay in milliseconds (default: 100)
- `THROTTLE_MAX_MS`: Maximum throttle delay in milliseconds (default: 500)

## Features Added for 403 Error Reduction

### 1. Enhanced Headers
- **Modern User-Agent**: Updated to Chrome 120
- **Complete Accept Headers**: Includes modern image formats (AVIF, WebP, APNG)
- **Security Headers**: Sec-Fetch-* headers for better browser simulation
- **Client Header Forwarding**: Forwards User-Agent, Accept, Accept-Language, Cookies, Referer, Authorization

### 2. Request Throttling
- **Random Delays**: 100-500ms random delay between requests
- **Configurable**: Can be disabled via `THROTTLE_ENABLED=false`
- **Anti-Bot Protection**: Reduces likelihood of being flagged as automated traffic

### 3. Improved Redirect Handling
- **Increased Limit**: Up to 10 redirects (was 5)
- **Better Compatibility**: Handles complex redirect chains

### 4. Enhanced Logging
- **Request Tracking**: Logs each proxied request with status
- **Error Details**: Better error messages for different failure types
- **Throttling Info**: Shows delay applied to each request

### 5. Better Error Handling
- **403 Specific**: Special handling for forbidden errors
- **429 Handling**: Rate limiting detection
- **SSL Errors**: Certificate validation errors
- **Consistent Format**: All errors return JSON with error, url, statusCode

## Usage Examples

### Basic Request
```bash
curl "https://outletbackend.onrender.com/proxy?url=https://www.google.com"
```

### With Custom Headers
```bash
curl -H "User-Agent: Custom Browser" \
     -H "Accept-Language: en-US,en;q=0.9" \
     "https://outletbackend.onrender.com/proxy?url=https://www.youtube.com"
```

### Health Check
```bash
curl "https://outletbackend.onrender.com/health"
```

## Monitoring

The server now logs:
- ✅ Successful requests with status codes
- ❌ Failed requests with error details
- ⏱️ Throttling delays applied
- 🔍 Request details for debugging

## Performance Impact

- **Throttling**: Adds 100-500ms delay per request
- **Header Processing**: Minimal overhead
- **Redirect Handling**: Slightly increased memory usage for complex redirects
- **Overall**: Negligible impact on server performance
