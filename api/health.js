// Health check endpoint for Vercel
export default function handler(req, res) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  };

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

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    platform: 'Vercel Serverless',
    features: {
      headlessBrowser: true,
      antiBotMeasures: true,
      headerForwarding: true,
      throttling: process.env.THROTTLE_ENABLED !== 'false',
      redirectHandling: true,
      enhancedLogging: true,
      serverless: true
    },
    endpoints: {
      learn: '/api/learn?url=<TARGET_URL>',
      health: '/api/health'
    }
  });
}
