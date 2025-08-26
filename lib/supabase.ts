import { createClient } from '@supabase/supabase-js';

// Debug service role key loading
console.log('🔧 [SUPABASE] Service role key debug:', {
  NODE_ENV: process.env.NODE_ENV,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  isVercel: !!process.env.VERCEL,
  willUseAdmin: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ugolpzpaykhrumlwcpue.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2xwenBheWtocnVtbHdjcHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNDYxMjQsImV4cCI6MjA1OTYyMjEyNH0.6QBjm_II-N1NcZQnzeF5QXwDWMUp8s4zuHX5AXgRdG0';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public operations (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

// Types for project data
export interface Project {
  id: string;
  email: string;
  project_id: string;
  milestone: string;
  raw_payload: any; // JSON data from Podio containing address and other details
  updated_at: string;
  parsed_payload?: any; // Parsed version of raw_payload
}

// Database functions for project queries
export async function getProjectByEmail(email: string, userSession?: any): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data by email:', {
    email: `"${email}"`,
    emailLength: email.length,
    emailTrimmed: email.trim(),
    hasUserSession: !!userSession,
    timestamp: new Date().toISOString()
  });

  // Use authenticated client with user session
  const authenticatedClient = userSession ? 
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${userSession.access_token}`
          }
        }
      }
    ) : supabase;

  console.log('🔧 [SUPABASE] Using client:', {
    hasUserSession: !!userSession,
    usingAuthenticatedClient: !!userSession,
    clientType: userSession ? 'authenticated' : 'anon'
  });

  // First, let's check if the table exists and what data is in it
  console.log('🔧 [SUPABASE] Testing table access...');
  
  // Try to get table info first
  const { data: tableTest, error: tableError } = await authenticatedClient
    .from('podio_data')
    .select('*')
    .limit(1);
  
  if (tableError) {
    console.error('❌ [SUPABASE] Table access error:', {
      code: tableError.code,
      message: tableError.message,
      details: tableError.details,
      hint: tableError.hint
    });
    return [];
  }
  
  // Get all data to see what's actually in the table
  const { data: allData, error: allError } = await authenticatedClient
    .from('podio_data')
    .select('*')
    .limit(10);
  
  console.log('🔍 [SUPABASE] Table structure and sample data:', {
    count: allData?.length || 0,
    columns: allData?.[0] ? Object.keys(allData[0]) : [],
    sampleEmails: allData?.map(p => p.email) || [],
    sampleData: allData?.slice(0, 2) || [],
    searchingFor: email
  });

  // Try exact match first with all columns
  const { data, error } = await authenticatedClient
    .from('podio_data')
    .select('*')
    .eq('email', email.trim());
  
  // If no exact match, try case-insensitive search
  if (data && data.length === 0) {
    console.log('🔍 [SUPABASE] No exact match, trying case-insensitive search...');
    const { data: caseInsensitiveData, error: caseInsensitiveError } = await authenticatedClient
      .from('podio_data')
      .select('*')
      .ilike('email', email.trim());
    
    if (caseInsensitiveData && caseInsensitiveData.length > 0) {
      console.log('✅ [SUPABASE] Found match with case-insensitive search');
      // Process the case-insensitive data the same way as exact match
      const processedCaseInsensitiveData = caseInsensitiveData?.map(project => {
        let parsedPayload = null;
        if (project.raw_payload) {
          try {
            parsedPayload = typeof project.raw_payload === 'string' 
              ? JSON.parse(project.raw_payload) 
              : project.raw_payload;
          } catch (parseError) {
            console.error('❌ [SUPABASE] Error parsing raw_payload:', parseError);
          }
        }

        return {
          id: project.id,
          email: project.email,
          project_id: project.project_id || project.id,
          milestone: project.milestone || 'Unknown',
          raw_payload: project.raw_payload,
          updated_at: project.updated_at,
          parsed_payload: parsedPayload
        };
      }) || [];
      
      return processedCaseInsensitiveData;
    }
  }
  
  if (error) {
    console.error('❌ [SUPABASE] Error fetching from podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Query successful. Found records:', {
    count: data?.length || 0,
    exactMatchFound: data?.length > 0,
    records: data?.map(p => ({
      id: p.id,
      email: p.email,
      project_id: p.project_id || p.id,
      milestone: p.milestone || 'Unknown',
      hasRawPayload: !!p.raw_payload,
      updated_at: p.updated_at
    }))
  });
  
  // Parse raw_payload JSON data for each project
  const processedData = data?.map(project => {
    let parsedPayload = null;
    if (project.raw_payload) {
      try {
        parsedPayload = typeof project.raw_payload === 'string' 
          ? JSON.parse(project.raw_payload) 
          : project.raw_payload;
        console.log('📋 [SUPABASE] Parsed raw_payload for project:', {
          project_id: project.id,
          payload_keys: Object.keys(parsedPayload || {}),
          payload_size: JSON.stringify(parsedPayload).length
        });
      } catch (parseError) {
        console.error('❌ [SUPABASE] Failed to parse raw_payload for project:', project.id, parseError);
      }
    }
    
    return {
      ...project,
      parsed_payload: parsedPayload
    };
  }) || [];
  
  return processedData;
}

export async function searchPodioData(searchTerm: string): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data with term:', {
    searchTerm: `"${searchTerm}"`,
    searchFields: ['email', 'project_id', 'milestone'],
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabaseAdmin
    .from('podio_data')
    .select('id, email, project_id, milestone, raw_payload, updated_at')
    .or(`email.ilike.%${searchTerm}%,project_id.ilike.%${searchTerm}%,milestone.ilike.%${searchTerm}%`)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('❌ [SUPABASE] Error searching podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Search results:', {
    searchTerm: searchTerm,
    count: data?.length || 0,
    records: data?.map(p => ({
      id: p.id,
      email: p.email,
      project_id: p.project_id,
      milestone: p.milestone,
      hasRawPayload: !!p.raw_payload
    })) || []
  });

  // Parse raw_payload JSON data for each project
  const processedData = data?.map(project => {
    let parsedPayload = null;
    if (project.raw_payload) {
      try {
        parsedPayload = typeof project.raw_payload === 'string' 
          ? JSON.parse(project.raw_payload) 
          : project.raw_payload;
        console.log('📋 [SUPABASE] Parsed raw_payload for search result:', {
          project_id: project.id,
          payload_keys: Object.keys(parsedPayload || {}),
          payload_size: JSON.stringify(parsedPayload).length
        });
      } catch (parseError) {
        console.error('❌ [SUPABASE] Failed to parse raw_payload for project:', project.id, parseError);
      }
    }
    
    return {
      ...project,
      parsed_payload: parsedPayload
    };
  }) || [];
  
  return processedData;
}
