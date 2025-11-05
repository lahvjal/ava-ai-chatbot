import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// CORS headers for embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, specify allowed domains
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], domain } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Log embed usage
  console.log('🌐 [EMBED] Chat request:', {
    domain: domain || 'unknown',
    messageLength: message.length,
    historyLength: conversationHistory.length,
    timestamp: new Date().toISOString()
  });

  try {
    // Import the main chat handler logic
    const { default: mainChatHandler } = await import('../chat');
    
    // Create a modified request object for the main handler
    const modifiedReq = {
      ...req,
      body: {
        message,
        conversationHistory,
        // Don't include project lookup for embedded version
        projectLookup: undefined,
        actingAsEmail: undefined,
      }
    };

    // Create a response interceptor to add CORS headers
    const modifiedRes = {
      ...res,
      json: (data: any) => {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        return res.json(data);
      }
    };

    // Call the main chat handler
    return await mainChatHandler(modifiedReq as NextApiRequest, modifiedRes as NextApiResponse);

  } catch (error) {
    console.error('❌ [EMBED] Chat error:', error);
    return res.status(500).json({ 
      error: 'Failed to process chat request',
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
}
