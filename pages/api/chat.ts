import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { rateLimit } from './rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Apply rate limiting middleware
const rateLimitMiddleware = rateLimit(20, 60000); // 20 requests per minute

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  }).catch(() => {
    return; // Rate limit response already sent
  });
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], projectLookup } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check if the user is asking about project status or progress
  const isProjectQuery = message.toLowerCase().includes('project') || 
                         message.toLowerCase().includes('status') || 
                         message.toLowerCase().includes('progress') ||
                         message.toLowerCase().includes('installation') ||
                         message.toLowerCase().includes('my order') ||
                         message.toLowerCase().includes('timeline');

  console.log('🤖 [AVA-CHAT] Processing message:', {
    message: `"${message}"`,
    isProjectQuery: isProjectQuery,
    hasProjectLookup: !!projectLookup,
    projectLookupData: projectLookup,
    timestamp: new Date().toISOString()
  });

  // Debug environment variables in production
  console.log('🔧 [AVA-CHAT] Environment check:', {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
  });

  let projectData = null;
  if (isProjectQuery || projectLookup) {
    console.log('🔍 [AVA-CHAT] Detected project query or structured lookup, calling project lookup API');
    try {
      const lookupPayload = projectLookup ? {
        email: projectLookup.email,
        query: message
      } : {
        query: message
      };

      console.log('📋 [AVA-CHAT] Project lookup payload:', lookupPayload);

      const projectResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/project-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lookupPayload),
      });
      
      if (projectResponse.ok) {
        projectData = await projectResponse.json();
        console.log('✅ [AVA-CHAT] Project data retrieved:', {
          projectCount: projectData?.count || 0,
          hasProjects: projectData?.projects?.length > 0
        });
      } else {
        console.log('⚠️ [AVA-CHAT] Project lookup API returned error status:', projectResponse.status);
      }
    } catch (error) {
      console.error('❌ [AVA-CHAT] Project lookup failed:', error);
    }
  } else {
    console.log('💬 [AVA-CHAT] General solar query, skipping project lookup');
  }

  try {
    const systemPrompt = `You are Ava, a knowledgeable and friendly AI assistant for Aveyo, a solar energy company. Your primary role is to help customers with questions about solar installation, project status, financing, maintenance, permits, and general solar energy topics.

Key responsibilities:
- Answer questions about the solar installation process
- Provide project status updates when customers provide their information
- Explain solar financing options and incentives
- Help with maintenance and troubleshooting questions
- Assist with permit and regulatory questions
- Be friendly, professional, and knowledgeable about solar energy

${projectData ? `IMPORTANT: The customer is asking about project status. Here is the current project data from our database:

PROJECT RECORDS:
${JSON.stringify(projectData.projects.map((project: any) => ({
  ...project,
  // Remove parsed_payload from the main record to avoid duplication
  parsed_payload: undefined
})), null, 2)}

DETAILED PROJECT DATA FROM PODIO:
${projectData.projects.map((project: any) => {
  if (project.parsed_payload) {
    const payload = project.parsed_payload;
    const addressInfo = {
      address: payload.address || 'Not specified',
      city: payload.city || 'Not specified', 
      state: payload.state || 'Not specified',
      zip: payload.zip || 'Not specified'
    };
    
    return `Project ID: ${project.id}
Customer: ${project.customer_name} (${project.email})
CUSTOMER ADDRESS: ${addressInfo.address}, ${addressInfo.city}, ${addressInfo.state} ${addressInfo.zip}
Raw Podio Data: ${JSON.stringify(project.parsed_payload, null, 2)}`;
  }
  return `Project ID: ${project.id} - No detailed Podio data available`;
}).join('\n\n')}

ANALYSIS INSTRUCTIONS:
- Use both the structured project data AND the detailed Podio raw_payload data to provide comprehensive answers
- The raw_payload contains the original Podio data with all project details, custom fields, and status information
- Cross-reference information between the structured data and raw Podio data for accuracy
- Extract relevant details from the raw_payload JSON to answer specific customer questions
- If there are discrepancies between structured data and raw_payload, prioritize the raw_payload as it's the source of truth
- NEVER ask for additional customer information when project data is already provided
- Provide specific project details immediately using the available data
- ALWAYS check the raw_payload for address information in fields: zip, city, state, address
- When customers ask about their address or location, reference these specific fields from the raw_payload
- If address fields exist in the raw_payload, acknowledge and use this information in your responses

PROJECT STAGE KNOWLEDGE:
Solar installation projects have 4 distinct stages that you must understand and communicate clearly:
1. Pre-approvals - Initial permits and approvals before construction begins
2. Approvals - Final approvals and permits obtained, ready for construction
3. Construction - Physical installation of the solar system is underway
4. Energization - System activation and grid connection, project completion

When analyzing the raw_payload JSON data, look for stage indicators, status fields, or progress markers that correspond to these 4 stages. Always explain the current stage in customer-friendly terms and what comes next in the process.

ADDRESS-BASED RESEARCH:
When analyzing project data, extract location information from these fields in the raw_payload:
- zip (zip code)
- city (city name)
- state (state name)
- address (street address)

Use this location data to web search and research:
- Local permit requirements and typical processing times
- Municipal solar installation regulations
- Area-specific utility interconnection processes
- Regional solar incentives or rebates
- Local contractor availability and scheduling
- Weather patterns that might affect installation timing

Combine zip code, city, and state to create comprehensive location context for more accurate timelines and location-specific customer guidance.` : 'If customers ask about specific project status, ask them to provide their email address so you can look up their project information.'}
- Accurate when providing project status information

If asked about topics outside of solar energy, politely redirect the conversation back to how Aveyo can help with their solar needs.`;

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.status(200).json({ 
      reply,
      usage: completion.usage 
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
}
