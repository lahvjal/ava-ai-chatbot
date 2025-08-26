import { NextApiRequest, NextApiResponse } from 'next';
import { getProjectByEmail, searchPodioData, Project } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, email, sessionToken } = req.body;
  
  // Extract email from session token if not provided directly
  let userEmail = email;
  if (!userEmail && sessionToken) {
    try {
      // Decode JWT token to get user email
      const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64').toString());
      userEmail = payload.email;
      console.log('🔐 [PROJECT-LOOKUP] Extracted email from session:', userEmail);
    } catch (error) {
      console.error('❌ [PROJECT-LOOKUP] Failed to decode session token:', error);
    }
  }

  console.log('🚀 [PROJECT-LOOKUP] API called with parameters:', {
    query: query ? `"${query}"` : 'not provided',
    email: email ? `"${email}"` : 'not provided',
    userEmail: userEmail ? `"${userEmail}"` : 'not provided',
    hasSessionToken: !!sessionToken,
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
      hasParsedPayload: formattedProjects.map(p => !!p.parsed_payload)
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
    console.error('❌ [PROJECT-LOOKUP] API error:', error);
    res.status(500).json({ error: 'Failed to lookup project data' });
  }
}
