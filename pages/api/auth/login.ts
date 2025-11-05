import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers for embedded widget
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log('🔐 [AUTH-LOGIN] Attempting login for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ [AUTH-LOGIN] Login failed:', error.message);
      return res.status(401).json({ 
        success: false,
        error: error.message 
      });
    }

    if (data.user && data.session) {
      console.log('✅ [AUTH-LOGIN] Login successful for:', email);
      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        access_token: data.session.access_token,
      });
    } else {
      console.error('❌ [AUTH-LOGIN] No user or session returned');
      return res.status(401).json({ 
        success: false,
        error: 'Login failed' 
      });
    }
  } catch (error) {
    console.error('❌ [AUTH-LOGIN] Exception:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}
