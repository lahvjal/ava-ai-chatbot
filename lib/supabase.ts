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
  created_at: string;
  updated_at: string;
  parsed_payload?: any; // Parsed version of raw_payload
}

// Database functions for project queries
export async function getProjectByEmail(email: string, userSession?: any): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data by email:', {
    email: `"${email}"`,
    timestamp: new Date().toISOString()
  });

  // Test both anon and admin clients
  console.log('🔧 [SUPABASE] Testing both clients...');
  
  // Test admin client first
  try {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('podio_data')
      .select('count', { count: 'exact', head: true });
    
    console.log('🔧 [SUPABASE] Admin client test:', {
      usingAdmin: supabaseAdmin !== supabase,
      canConnect: !adminError,
      error: adminError?.message,
      errorCode: adminError?.code,
      totalRows: adminData
    });
  } catch (adminConnectionError) {
    console.error('❌ [SUPABASE] Admin client failed:', adminConnectionError);
  }

  // Test anon client for comparison
  try {
    const { data: anonData, error: anonError } = await supabase
      .from('podio_data')
      .select('count', { count: 'exact', head: true });
    
    console.log('🔧 [SUPABASE] Anon client test:', {
      canConnect: !anonError,
      error: anonError?.message,
      errorCode: anonError?.code
    });
  } catch (anonConnectionError) {
    console.error('❌ [SUPABASE] Anon client failed:', anonConnectionError);
  }

  const { data, error } = await supabaseAdmin
    .from('podio_data')
    .select('id, email, project_id, milestone, raw_payload, created_at, updated_at')
    .eq('email', email);
  
  if (error) {
    console.error('❌ [SUPABASE] Error fetching from podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Query successful. Found records:', {
    count: data?.length || 0,
    records: data?.map(p => ({
      id: p.id,
      email: p.email,
      project_id: p.project_id,
      milestone: p.milestone,
      hasRawPayload: !!p.raw_payload
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
    .select('id, email, project_id, milestone, raw_payload, created_at, updated_at')
    .or(`email.ilike.%${searchTerm}%,project_id.ilike.%${searchTerm}%,milestone.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });
  
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
