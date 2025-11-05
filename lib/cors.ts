import { NextApiRequest, NextApiResponse } from 'next';

// Allowed domains for embedded widget
const ALLOWED_EMBED_DOMAINS = [
  'https://aveyo.webflow.io',
  'https://aveyo.com',
  'https://www.aveyo.com',
  'https://ava-ai-chatbot.vercel.app',
  'http://localhost:3000',
  'https://localhost:3000',
  // Add more domains as needed
];

export function setCorsHeaders(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  
  // Always set CORS headers for API routes
  if (origin && ALLOWED_EMBED_DOMAINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Allow all origins for development and flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Log CORS headers for debugging
  console.log('🌐 [CORS] Headers set:', {
    origin: origin || 'none',
    allowedOrigin: origin && ALLOWED_EMBED_DOMAINS.includes(origin) ? origin : '*',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

export function handleCorsPreflightAndContinue(req: NextApiRequest, res: NextApiResponse): boolean {
  setCorsHeaders(req, res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🌐 [CORS] Preflight request handled');
    res.status(200).end();
    return false; // Don't continue processing
  }
  
  return true; // Continue processing
}
