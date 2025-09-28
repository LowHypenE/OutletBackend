# Vercel Deployment Guide

## 🚀 Deploy OutletBackend to Vercel

### Prerequisites

1. **Node.js 18+** installed locally
2. **Vercel CLI** installed globally
3. **GitHub account** for repository hosting

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the authentication flow in your browser.

### Step 3: Deploy Backend

1. **Navigate to backend directory**
   ```bash
   cd outlet_backend
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Follow the prompts**:
   - Link to existing project? **No**
   - Project name: `outlet-backend` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings? **No**

### Step 4: Configure Environment Variables

```bash
# Set throttling configuration
vercel env add THROTTLE_ENABLED
# Enter: true

vercel env add THROTTLE_MIN_MS
# Enter: 100

vercel env add THROTTLE_MAX_MS
# Enter: 500

# Set environment
vercel env add NODE_ENV
# Enter: production
```

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

### Step 6: Test Your Deployment

1. **Get your Vercel URL** from the deployment output
2. **Test the health endpoint**:
   ```bash
   curl "https://your-app.vercel.app/api/health"
   ```

3. **Test the learning endpoint**:
   ```bash
   curl "https://your-app.vercel.app/api/learn?url=https://www.google.com"
   ```

## 🔧 Configuration

### Vercel Dashboard Settings

1. **Go to your project** in Vercel dashboard
2. **Settings** → **Functions**
3. **Max Duration**: 30 seconds (Vercel Pro required)
4. **Memory**: 1024MB (recommended)

### Environment Variables

Set these in Vercel dashboard or via CLI:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `THROTTLE_ENABLED` | `true` | Enable request throttling |
| `THROTTLE_MIN_MS` | `100` | Minimum throttle delay |
| `THROTTLE_MAX_MS` | `500` | Maximum throttle delay |

## 📊 Performance Optimization

### Cold Start Optimization

1. **Use Vercel Pro** for 30-second timeout
2. **Optimize Chrome args** (already configured)
3. **Minimize dependencies** (puppeteer-core + chrome-aws-lambda only)

### Memory Management

1. **Set memory to 1024MB** in Vercel settings
2. **Monitor usage** in Vercel dashboard
3. **Ensure proper cleanup** (already implemented)

## 🔍 Monitoring

### Vercel Analytics

1. **Function Logs**: Available in Vercel dashboard
2. **Performance Metrics**: Execution time and memory usage
3. **Error Tracking**: Automatic error logging

### Health Monitoring

```bash
# Check health
curl "https://your-app.vercel.app/api/health"

# Expected response
{
  "status": "OK",
  "platform": "Vercel Serverless",
  "features": {
    "headlessBrowser": true,
    "serverless": true
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Function Timeout**
   - Upgrade to Vercel Pro for 30s timeout
   - Optimize browser launch arguments
   - Check function logs

2. **Chrome Launch Failures**
   - Verify chrome-aws-lambda is installed
   - Check Vercel function logs
   - Ensure proper Chrome arguments

3. **Memory Issues**
   - Increase memory allocation in Vercel settings
   - Monitor memory usage in dashboard
   - Check for memory leaks

4. **Cold Start Issues**
   - Use Vercel Pro for better performance
   - Optimize function size
   - Consider connection pooling

### Debug Steps

1. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```

2. **Test Locally**:
   ```bash
   vercel dev
   ```

3. **Check Environment Variables**:
   ```bash
   vercel env ls
   ```

## 🔄 Frontend Integration

### Update Frontend URL

1. **Get your Vercel URL** from deployment
2. **Update frontend** `PortalFrame.js`:
   ```javascript
   const backendUrl = 'https://your-app.vercel.app';
   ```

3. **Redeploy frontend** to Netlify/Vercel

### Test Complete Flow

1. **Deploy frontend** with updated backend URL
2. **Test learning endpoint** through frontend
3. **Verify JavaScript sites** work (Google, YouTube, Reddit)

## 📈 Scaling

### Vercel Pro Features

- **30-second timeout** (vs 10s on Hobby)
- **Unlimited bandwidth**
- **Advanced analytics**
- **Priority support**

### Performance Tips

1. **Use Vercel Pro** for production
2. **Monitor function metrics**
3. **Optimize for cold starts**
4. **Set appropriate memory limits**

## 🎯 Success Metrics

### Expected Performance

- **Cold Start**: 2-3 seconds
- **Warm Start**: 1-2 seconds
- **Success Rate**: 95%+ for JavaScript sites
- **Memory Usage**: ~256MB per execution

### Monitoring

- **Function execution time**
- **Memory usage**
- **Error rates**
- **Cold start frequency**

---

**Your OutletBackend is now ready for Vercel serverless deployment! 🚀**
