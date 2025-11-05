import { NextApiRequest, NextApiResponse } from 'next';
import { getProjectByEmail, searchPodioData, Project, supabaseAdmin } from '../../lib/supabase';

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

  const { query, email } = req.body;
  let sessionToken: string | undefined = req.body?.sessionToken;
  if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.substring('Bearer '.length);
  }
  
  console.log('📋 [PROJECT-LOOKUP] Request body parsed:', {
    hasQuery: !!query,
    hasEmail: !!email,
    hasSessionToken: !!sessionToken,
    queryLength: query?.length || 0,
    sessionTokenLength: sessionToken?.length || 0
  });
  
  // Extract user email and admin flags from session token and validate JWT structure
  let userEmailFromToken: string | null = null;
  let isAdminJwt = false;
  if (sessionToken) {
    try {
      console.log('🔍 [PROJECT-LOOKUP] Session token received:', {
        tokenLength: sessionToken.length,
        tokenStart: sessionToken.substring(0, 20) + '...',
        hasThreeParts: sessionToken.split('.').length === 3
      });
      
      // Decode JWT token to get user email
      const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64').toString());
      userEmailFromToken = payload.email;
      // Prefer admin from JWT metadata
      const am = payload?.app_metadata || {};
      const um = payload?.user_metadata || payload?.raw_user_meta_data || {};
      if (am?.is_admin === true) isAdminJwt = true;
      if (typeof um?.user_type === 'string' && um.user_type.toLowerCase() === 'admin') isAdminJwt = true;
      
      console.log('🔐 [PROJECT-LOOKUP] JWT payload decoded:', {
        email: userEmailFromToken,
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
    userEmailFromToken: userEmailFromToken ? `"${userEmailFromToken}"` : 'not provided',
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

    // Determine effective email: prefer explicit 'email' (e.g., admin impersonation), otherwise fall back to token email
    const effectiveEmail: string | null = (typeof email === 'string' && email.includes('@'))
      ? email.trim().toLowerCase()
      : (userEmailFromToken ? String(userEmailFromToken).trim().toLowerCase() : null);

    // Determine if caller is admin (JWT preferred, DB fallback)
    let isDbAdmin = isAdminJwt;
    if (!isDbAdmin && userEmailFromToken) {
      try {
        const { data: adminRow } = await supabaseAdmin
          .from('admins')
          .select('email')
          .eq('email', userEmailFromToken)
          .maybeSingle();
        isDbAdmin = !!adminRow;
      } catch {}
    }

    // Helper to parse raw records to Project[]
    const parseRows = async (rows: any[]): Promise<Project[]> => {
      const projects = await Promise.all((rows || []).map(async (project: any) => {
        let parsedPayload: any = null;
        if (project.raw_payload) {
          try {
            parsedPayload = typeof project.raw_payload === 'string'
              ? JSON.parse(project.raw_payload)
              : project.raw_payload;
          } catch {}
        }
        
        // Look up finance company separately if fin_id exists
        let financeCompany: string | null = null;
        if (project.fin_id) {
          try {
            console.log(`🔍 [FINANCE-LOOKUP] Looking up finance company for project ${project.project_id} with fin_id: ${project.fin_id}`);
            
            const { data: financierData, error: financeError } = await supabaseAdmin
              .from('financier')
              .select('company_name')
              .eq('fin_id', project.fin_id)
              .single();
            
            financeCompany = financierData?.company_name || null;
            console.log(`💰 [FINANCE-LOOKUP] Result for project ${project.project_id}:`, {
              fin_id: project.fin_id,
              company_name: financeCompany,
              hasError: !!financeError,
              error: financeError?.message
            });
          } catch (error) {
            console.log(`❌ [FINANCE-LOOKUP] Failed for project ${project.project_id}:`, {
              fin_id: project.fin_id,
              error: error instanceof Error ? error.message : error
            });
          }
        } else {
          console.log(`ℹ️ [FINANCE-LOOKUP] No fin_id for project ${project.project_id}, skipping finance lookup`);
        }
        
        return {
          id: project.id,
          email: project.email,
          project_id: project.project_id || project.id,
          milestone: project.milestone || 'Unknown',
          raw_payload: project.raw_payload,
          updated_at: project.updated_at,
          parsed_payload: parsedPayload,
          fin_id: project.fin_id,
          finance_company: financeCompany,
        } as Project;
      }));
      return projects;
    };

    let matchPath: 'none' | 'exact' | 'ilike' | 'username' = 'none';
    let exactCount = 0, ilikeCount = 0, usernameCount = 0;

    if (effectiveEmail) {
      console.log('📧 [PROJECT-LOOKUP] Looking up by email in podio_data', { effectiveEmail, isDbAdmin });
      if (isDbAdmin) {
        // Use service client to bypass RLS for admins - simple email lookup first
        const { data: exactRows } = await supabaseAdmin
          .from('podio_data')
          .select('id, email, project_id, milestone, raw_payload, updated_at, fin_id')
          .eq('email', effectiveEmail);
        exactCount = exactRows?.length || 0;
        console.log('🔍 [PROJECT-LOOKUP] Exact match results:', {
          effectiveEmail,
          foundProjects: exactCount,
          projectDetails: exactRows?.map(row => ({
            id: row.id,
            email: row.email,
            project_id: row.project_id,
            milestone: row.milestone,
            fin_id: row.fin_id,
            hasRawPayload: !!row.raw_payload
          }))
        });
        
        if (exactCount > 0) {
          matchPath = 'exact';
          projects = await parseRows(exactRows || []);
          
          // Log finance company lookup results for admin impersonation
          console.log('💰 [PROJECT-LOOKUP] Finance company details:', {
            effectiveEmail,
            projectsWithFinance: projects.map(p => ({
              project_id: p.project_id,
              email: p.email,
              fin_id: p.fin_id,
              finance_company: p.finance_company,
              financeStatus: p.finance_company ? 'Found' : (p.fin_id ? 'Lookup failed' : 'No fin_id')
            }))
          });
        } else {
          const { data: ilikeRows } = await supabaseAdmin
            .from('podio_data')
            .select('id, email, project_id, milestone, raw_payload, updated_at, fin_id')
            .ilike('email', `%${effectiveEmail}%`);
          ilikeCount = ilikeRows?.length || 0;
          if (ilikeCount > 0) {
            matchPath = 'ilike';
            projects = await parseRows(ilikeRows || []);
          } else {
            const username = effectiveEmail.split('@')[0];
            const { data: userRows } = await supabaseAdmin
              .from('podio_data')
              .select('id, email, project_id, milestone, raw_payload, updated_at, fin_id')
              .ilike('email', `%${username}%`);
            usernameCount = userRows?.length || 0;
            if (usernameCount > 0) {
              matchPath = 'username';
              projects = await parseRows(userRows || []);
            }
          }
        }
      } else {
        // Non-admin: use existing helper with session context
        const userSession = sessionToken ? { access_token: sessionToken } : null;
        projects = await getProjectByEmail(effectiveEmail, userSession);
        // We can't easily compute matchPath here without duplicating logic; leave as 'none'
      }
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
      updated_at: project.updated_at,
      fin_id: project.fin_id,
      finance_company: project.finance_company
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
      count: formattedProjects.length,
      debug: { matchPath, exactCount, ilikeCount, usernameCount }
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
