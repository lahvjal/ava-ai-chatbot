import { NextApiRequest, NextApiResponse } from 'next';
import { getProjectByEmail, searchPodioData, Project } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Immediate logging to catch all requests
  console.log('🚀 [PROJECT-LOOKUP] Handler started:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    console.log('❌ [PROJECT-LOOKUP] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, email, sessionToken } = req.body;
  
  console.log('📋 [PROJECT-LOOKUP] Request body parsed:', {
    hasQuery: !!query,
    hasEmail: !!email,
    hasSessionToken: !!sessionToken,
    queryLength: query?.length || 0,
    sessionTokenLength: sessionToken?.length || 0
  });
  
  // Extract email from session token if not provided directly
  // Extract user email from session token and validate JWT structure
  let userEmail = null;
  if (sessionToken) {
    try {
      console.log('🔍 [PROJECT-LOOKUP] Session token received:', {
        tokenLength: sessionToken.length,
        tokenStart: sessionToken.substring(0, 20) + '...',
        hasThreeParts: sessionToken.split('.').length === 3
      });
      
      // Decode JWT token to get user email
      const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64').toString());
      userEmail = payload.email;
      
      console.log('🔐 [PROJECT-LOOKUP] JWT payload decoded:', {
        email: userEmail,
        sub: payload.sub,
        role: payload.role,
        aud: payload.aud,
        exp: payload.exp,
        iat: payload.iat,
        isExpired: payload.exp < Date.now() / 1000
      });
    } catch (error) {
      console.error('❌ [PROJECT-LOOKUP] Failed to decode session token:', error);
    }
  }

  console.log('🚀 [PROJECT-LOOKUP] API called with parameters:', {
    query: query ? `"${query}"` : 'not provided',
    email: email ? `"${email}"` : 'not provided',
    userEmail: userEmail ? `"${userEmail}"` : 'not provided',
    hasSessionToken: !!sessionToken,
    sessionTokenLength: sessionToken?.length || 0,
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });

  // Test Supabase connection directly
  console.log('🔧 [PROJECT-LOOKUP] Testing Supabase connection:', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
  });

  try {
    let projects: Project[] = [];

    if (userEmail) {
      console.log('📧 [PROJECT-LOOKUP] Looking up by email in podio_data');
      // Pass the session token to use authenticated client
      const userSession = sessionToken ? {
        access_token: sessionToken
      } : null;
      projects = await getProjectByEmail(userEmail, userSession);
    } else if (query) {
      console.log('🔎 [PROJECT-LOOKUP] Performing general search in podio_data');
      projects = await searchPodioData(query);
    }

    // Format project data for AI response
    const formattedProjects = projects.map(project => ({
      id: project.id,
      email: project.email,
      project_id: project.project_id,
      milestone: project.milestone,
      raw_payload: project.raw_payload,
      parsed_payload: project.parsed_payload,
      updated_at: project.updated_at
    }));

    console.log('📤 [PROJECT-LOOKUP] Returning response:', {
      count: formattedProjects.length,
      projectIds: formattedProjects.map(p => p.project_id),
      emails: formattedProjects.map(p => p.email),
      milestones: formattedProjects.map(p => p.milestone),
      hasParsedPayload: formattedProjects.map(p => !!p.parsed_payload),
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString()
    });

    // Debug environment variables in project lookup
    console.log('🔧 [PROJECT-LOOKUP] Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

    res.status(200).json({ 
      projects: formattedProjects,
      count: formattedProjects.length
    });
  } catch (error) {
    console.error('❌ [PROJECT-LOOKUP] API error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to lookup project data' });
  }
}
