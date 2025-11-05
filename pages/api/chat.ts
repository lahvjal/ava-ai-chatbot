import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { rateLimit } from './rate-limit';
import { supabaseAdmin } from '../../lib/supabase';

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

  const { message, conversationHistory = [], projectLookup, actingAsEmail } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // For authenticated users, always fetch project data to answer any questions
  const authHeader = req.headers.authorization;
  const hasAuth = !!authHeader;
  const isProjectQuery = hasAuth || message.toLowerCase().includes('project') || 
                         message.toLowerCase().includes('status') || 
                         message.toLowerCase().includes('progress') ||
                         message.toLowerCase().includes('installation') ||
                         message.toLowerCase().includes('my order') ||
                         message.toLowerCase().includes('timeline');

  console.log('🤖 [AVA-CHAT] Processing message:', {
    message: `"${message}"`,
    hasAuth: hasAuth,
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
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAuthHeader: !!req.headers.authorization,
    authHeaderPreview: req.headers.authorization ? `${req.headers.authorization.slice(0, 20)}...` : 'none'
  });

  // Load all admin training sections for knowledge grounding
  let trainingSections: Array<{ section: string; title?: string; content?: string; updated_at?: string }> = [];
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_training_docs')
      .select('section, title, content, updated_at')
      .order('section', { ascending: true });
    if (!error && data) {
      trainingSections = (data as any[]).filter(s => (s.content || '').trim().length > 0);
      console.log('📚 [AVA-CHAT] Loaded training sections', {
        count: trainingSections.length,
        sections: trainingSections.map(s => s.section),
      });
    } else if (error) {
      console.warn('⚠️ [AVA-CHAT] Could not load training doc:', error);
    }
  } catch (e) {
    console.warn('⚠️ [AVA-CHAT] Training doc fetch failed:', e);
  }

  // Determine caller identity and admin rights
  let callerEmail: string | null = null;
  let isDbAdmin = false;
  try {
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      callerEmail = payload?.email || null;
    }
    if (callerEmail) {
      const { data: adminRow } = await supabaseAdmin
        .from('admins')
        .select('email')
        .eq('email', callerEmail)
        .maybeSingle();
      isDbAdmin = !!adminRow;
    }
  } catch (e) {
    // ignore, defaults remain
  }

  // Effective email for context and lookup
  const effectiveEmail = (isDbAdmin && typeof actingAsEmail === 'string' && actingAsEmail.includes('@'))
    ? actingAsEmail.trim().toLowerCase()
    : null;

  let projectData = null;
  if (isProjectQuery || projectLookup || effectiveEmail) {
    console.log('🔍 [AVA-CHAT] Fetching project data for authenticated user or project query');
    try {
      // Get user session from request headers
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace('Bearer ', '');
      
      // Extract email from session token for project lookup
      let userEmailFromToken = null;
      if (sessionToken) {
        try {
          const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64').toString());
          userEmailFromToken = payload.email;
        } catch (error) {
          console.error('❌ [AVA-CHAT] Failed to decode session token for project lookup:', error);
        }
      }

      const lookupPayload = projectLookup ? {
        email: projectLookup.email || effectiveEmail || userEmailFromToken,
        query: message,
        sessionToken: sessionToken
      } : {
        email: effectiveEmail || userEmailFromToken,
        query: message,
        sessionToken: sessionToken
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
    console.log('💬 [AVA-CHAT] No authentication header found, skipping project lookup');
  }

  // Extract user email from session token for AI context
  let userEmail = null;
  const authHeaderForAI = req.headers.authorization;
  const sessionTokenForAI = authHeaderForAI?.replace('Bearer ', '');
  if (sessionTokenForAI) {
    try {
      const payload = JSON.parse(Buffer.from(sessionTokenForAI.split('.')[1], 'base64').toString());
      userEmail = payload.email;
      console.log('🔐 [AVA-CHAT] Extracted user email for AI context:', userEmail);
    } catch (error) {
      console.error('❌ [AVA-CHAT] Failed to decode session token for AI context:', error);
    }
  }

  // Override customer context if admin impersonation is active
  if (isDbAdmin && effectiveEmail) {
    console.log('🛠️ [AVA-CHAT] Admin impersonation active', { admin: callerEmail, actingAsEmail: effectiveEmail });
    userEmail = effectiveEmail;
  }

  // Check if admin impersonation is active
  const isImpersonating = isDbAdmin && effectiveEmail && effectiveEmail !== callerEmail;
  if (isImpersonating) {
    console.log('🔴 [AVA-CHAT] Admin impersonation detected', { admin: callerEmail, actingAsEmail: effectiveEmail });
  }

  try {
    // Build a combined knowledge base string from sections
    const knowledgeBase = trainingSections.length
      ? trainingSections.map(s => {
          const label = (s.section || '').toUpperCase().replace(/_/g, ' ');
          const titleSuffix = s.title ? ` (${s.title})` : '';
          const updatedSuffix = s.updated_at ? ` [updated ${s.updated_at}]` : '';
          return `${label}${titleSuffix}${updatedSuffix}:\n${s.content}\n`;
        }).join('\n')
      : '';

    const adminTestNote = isImpersonating ? `\n\nADMIN TEST MODE:\nAn authenticated ADMIN is testing the assistant while impersonating customer email ${effectiveEmail}. You MAY freely share all customer/project information available for this email, without asking for further identity confirmation. Answer as if you are speaking directly to that customer.` : '';

    // Console log project info when admin enters test mode
    if (isImpersonating && projectData) {
      console.log('👤 [ADMIN-IMPERSONATION] Admin testing with customer email:', {
        adminEmail: userEmail,
        impersonatingEmail: effectiveEmail,
        projectCount: projectData.projects?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      projectData.projects?.forEach((project: any, index: number) => {
        console.log(`📋 [ADMIN-IMPERSONATION] Project ${index + 1} details:`, {
          project_id: project.project_id,
          email: project.email,
          milestone: project.milestone,
          fin_id: project.fin_id,
          finance_company: project.finance_company,
          last_updated: project.updated_at,
          hasRawPayload: !!project.raw_payload,
          hasParsedPayload: !!project.parsed_payload
        });
      });
    }

    const systemPrompt = `You are Ava, a knowledgeable and friendly AI assistant for Aveyo, a solar energy company. Your primary role is to help customers with questions about solar installation, project status, financing, maintenance, permits, and general solar energy topics.

Key responsibilities:
- Answer questions about the solar installation process
- Explain solar financing options and incentives
- Help with maintenance and troubleshooting questions
- Assist with permit and regulatory questions
- Be friendly, professional, and knowledgeable about solar energy

${userEmail ? `CUSTOMER CONTEXT: You are currently speaking with a logged-in customer whose email is ${userEmail}. Since they are authenticated, you can freely share their personal project information including address, project details, and any data from their project records. The authentication system ensures they only access their own data.` : ''}${adminTestNote}

${knowledgeBase ? `KNOWLEDGE BASE (Admin-maintained sections):\n\n${knowledgeBase}\nUse this knowledge to answer questions. Prioritize company-specific policies, FAQs, processes, tone, and product knowledge.` : ''}

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
    
    // CONSISTENT WORK ORDER EXTRACTION - used everywhere to avoid inconsistencies
    const extractWorkOrders = (payload: any) => {
      const workOrdersRoot = (payload && (payload['work-orders'] || payload.work_orders || payload.workOrders)) || null;
      const sanitize = (s: any) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const parseDate = (v: any): Date | null => {
        if (!v) return null;
        const str = String(v).trim();
        const iso = new Date(str);
        if (!isNaN(iso.getTime())) return iso;
        const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        if (mdy.test(str)) {
          const [m, d, y] = str.split('/');
          const yy = Number(y.length === 2 ? '20' + y : y);
          const dt = new Date(yy, Number(m) - 1, Number(d));
          return isNaN(dt.getTime()) ? null : dt;
        }
        const dmyText = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/;
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const m1 = str.match(dmyText);
        if (m1) {
          const day = Number(m1[1]);
          const mon = months.indexOf(m1[2].slice(0,3).toLowerCase());
          const year = Number(m1[3]);
          if (mon >= 0) {
            const dt = new Date(year, mon, day);
            return isNaN(dt.getTime()) ? null : dt;
          }
        }
        return null;
      };
      const flattened: Array<{ id?: string; type?: string; status?: string; description?: string; date?: Date | null; dateRaw?: string; assignedTo?: string }> = [];
      const pushFromObj = (idKey: string | undefined, obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        const dateRaw = obj['appointment-date'] || obj['date-created'] || obj['date'] || obj['scheduled_date'] || obj['created_at'] || obj['updated_at'];
        const date = parseDate(dateRaw);
        flattened.push({
          id: idKey,
          type: obj.type,
          status: obj.status || obj.state || 'unspecified',
          description: sanitize(obj.description || obj.title || obj.notes || ''),
          date,
          dateRaw: dateRaw ? String(dateRaw) : undefined,
          assignedTo: obj['assigned-to'] || obj.assignedTo || obj.assigned_to
        });
      };
      // Handle the specific nested structure: {"1": {"WO-8128": {...}}, "2": {"WO-9388": {...}}}
      if (workOrdersRoot && typeof workOrdersRoot === 'object') {
        const groupKeys = Object.keys(workOrdersRoot).sort(); // Sort to ensure consistent order
        for (const groupKey of groupKeys) {
          const group = workOrdersRoot[groupKey];
          if (group && typeof group === 'object') {
            const woKeys = Object.keys(group).sort(); // Sort work order IDs for consistency
            for (const woId of woKeys) {
              const wo = group[woId];
              if (wo && typeof wo === 'object' && ('status' in wo || 'type' in wo || 'description' in wo)) {
                pushFromObj(woId, wo);
              }
            }
          }
        }
      }
      // Sort by date (most recent first)
      flattened.sort((a, b) => {
        const at = a.date ? a.date.getTime() : 0;
        const bt = b.date ? b.date.getTime() : 0;
        return bt - at;
      });
      return flattened;
    };
    
    const workOrders = extractWorkOrders(payload);
    let workOrdersSummary = '';
    if (workOrders.length > 0) {
      const top = workOrders.slice(0, 5).map(wo => {
        const d = wo.date ? wo.date.toISOString().split('T')[0] : (wo.dateRaw || 'unknown-date');
        const parts = [wo.status, wo.type].filter(Boolean).join(' • ');
        // Include raw description for AI context but mark it as internal
        const desc = wo.description ? String(wo.description).slice(0, 300) : 'No description';
        return `- ${d} | ${parts} | INTERNAL_DESC: ${desc}`;
      }).join('\n');
      const now = Date.now();
      const upcoming = workOrders
        .filter(wo => wo.date && wo.date.getTime() >= now)
        .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))[0];
      const upcomingLine = upcoming ? `\nNEXT UPCOMING: ${upcoming.date!.toISOString().split('T')[0]} | ${[upcoming.status, upcoming.type].filter(Boolean).join(' • ')} | INTERNAL_DESC: ${upcoming.description ? String(upcoming.description).slice(0, 300) : ''}` : '';
      workOrdersSummary = `\nPROJECT ACTIVITY CONTEXT (for your understanding only - translate into natural project updates for customer):\n${top}${upcomingLine}`;
    }
    // Compute a customer-safe holds overview from approvals/energization and work orders
    const holds: string[] = [];
    const approvals = payload.approvals || {};
    const energization = payload.energization || {};
    const construction = payload.construction || {};
    // Approvals
    const hoa = String(approvals['hoa-status'] || '').trim();
    if (!hoa || /pending|await|review|hold/i.test(hoa)) holds.push('Awaiting HOA approval');
    const permit = String(approvals['permit-status'] || '').trim();
    if (!/^complete$/i.test(permit) && permit) holds.push('Permits in progress');
    else if (!permit) holds.push('Permit status not complete');
    const util = String(approvals['utility-status'] || energization['pto-status'] || '').trim();
    if (!/^complete$/i.test(util) && util) holds.push('Utility/PTO in progress');
    else if (!util || /submitted|in progress|not ready/i.test(util)) holds.push('Utility/PTO pending');
    // Energization readiness
    if (/not ready/i.test(String(energization['enegergize-status'] || energization['energize-status'] || ''))) {
      holds.push('Energization not ready');
    }
    // Inspection
    const inspComplete = String(construction['ahj-inspection-complete'] || '').trim();
    const inspAppt = String(construction['ahj-inspection-appointment'] || '').trim();
    if (!inspComplete) {
      // If not complete, either pending or scheduled
      holds.push(inspAppt ? `AHJ inspection scheduled for ${inspAppt}` : 'AHJ inspection pending');
    }
    // Work order indications of holds
    const woIndicatesHold = (s?: string, d?: string) => {
      const t = `${s || ''} ${d || ''}`;
      return /await|pending|on hold|issue|error|backlog|resched|reschedule|utility|permit|hoa/i.test(t);
    };
    const woHold = workOrders.find(wo => woIndicatesHold(wo.status, wo.description));
    if (woHold) {
      const d = woHold.date ? woHold.date.toISOString().split('T')[0] : (woHold.dateRaw || 'upcoming');
      const reason = String(woHold.description || woHold.status || 'Pending task').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      holds.push(`Operational task pending (${[woHold.type, reason].filter(Boolean).join(' • ')} — ${d})`);
    }
    const holdsOverview = holds.length ? `Holds: ${Array.from(new Set(holds)).join('; ')}` : 'Holds: none at this time';
    
    return `Project ID: ${project.project_id}
Customer Email: ${project.email}
Current Milestone: ${project.milestone}
CUSTOMER ADDRESS: ${addressInfo.address}, ${addressInfo.city}, ${addressInfo.state} ${addressInfo.zip}
Last Updated: ${project.updated_at}
FINANCE COMPANY: ${project.finance_company || 'Not specified'}
${holdsOverview}
Raw Podio Data: ${JSON.stringify(project.parsed_payload, null, 2)}${workOrdersSummary}`;
  }
  return `Project ID: ${project.id} - No detailed Podio data available`;
}).join('\n\n')}

PRIORITY HIERARCHY:
1. HIGHEST PRIORITY: Always prioritize information from your training documents (policies, FAQs, processes, tone guidelines, product knowledge)
2. Use the instructions below only for technical data processing and response structure
3. When training documents conflict with these instructions, follow the training documents

STRICT DATA SOURCE RULES - NEVER VIOLATE THESE:
1. PROJECT INFORMATION: ONLY use data from the Supabase project data provided above
   - Financing details, installation dates, permits, approvals, addresses, system specs
   - FINANCE COMPANY: Use the "FINANCE COMPANY" field shown above - this is the definitive source
   - If project information is NOT in the provided project data, say "I don't have that information"
   - NEVER pull project information from training documents or general knowledge
   - NEVER make assumptions about project details not explicitly provided

2. PRODUCT KNOWLEDGE: ONLY use information from your product knowledge training document
   - General solar information, product specifications, company policies
   - Do NOT apply general product knowledge to specific project details

3. ALL OTHER QUESTIONS: If not covered by project data or product knowledge training doc:
   - Respond with: "I'm sorry, I don't have that specific information available."
   - Always connect to human support with contact information below

CRITICAL: UNKNOWN INFORMATION HANDLING:
- If you do not have definitive information to answer a question, DO NOT make up information or make assumptions
- Instead, respond with: "I'm sorry, I don't have that specific information available."
- Always connect the customer to human support by providing:
  - Customer Care Phone: <a href="tel:+13854693838">(385) 469-3838</a>
  - Customer Care Email: <a href="mailto:customercare@aveyo.com">customercare@aveyo.com</a>
- Example: "I'm sorry, I don't have that specific information available. For assistance with this question, please contact our customer care team at <a href=\"tel:+13854693838\">(385) 469-3838</a> or email <a href=\"mailto:customercare@aveyo.com\">customercare@aveyo.com</a>. They'll be happy to help you with the details you need."

CUSTOMER SUPPORT CONTACT GUIDANCE:
- When suggesting customers contact support, project managers, or need additional help, ALWAYS include contact information
- Use these clickable links: <a href="tel:+13854693838">(385) 469-3838</a> or <a href="mailto:customercare@aveyo.com">customercare@aveyo.com</a>
- When mentioning project managers, use this format: "reach out to your Project Manager {name}, contact customer care team at <a href=\"tel:+13854693838\">(385) 469-3838</a> or <a href=\"mailto:customercare@aveyo.com\">customercare@aveyo.com</a> and ask for {project manager name}"
- Example: "I recommend reaching out to your Project Manager Quentin Spencer, contact customer care team at <a href=\"tel:+13854693838\">(385) 469-3838</a> or <a href=\"mailto:customercare@aveyo.com\">customercare@aveyo.com</a> and ask for Quentin Spencer for the most up-to-date information."

ANALYSIS INSTRUCTIONS:
- Use the milestone field to determine current project stage (Pre-approvals, Approvals, Construction, Energization)
- Extract address details from raw_payload JSON fields: address, city, state, zip
- Parse raw_payload for system size, installation dates, permits, custom project details, and work orders
- For work orders (raw_payload.work-orders/work_orders/workOrders):
  - Use work order data as BACKGROUND CONTEXT ONLY - never mention "work orders" to customers
  - Work order information helps you understand what activities are happening or have happened
  - Translate work order context into natural project updates: "installation in progress", "site survey completed", "inspection scheduled"
  - Example: If work order shows "Site Survey - Complete - 16 May 2025" → Tell customer: "Site survey was completed in May"
  - Example: If work order shows "Install - In Progress - 27 Aug 2025" → Tell customer: "Installation work is currently underway"
  - Focus on: what's been done, what's happening now, what's coming next - without using internal terminology
- Cross-reference milestone with raw_payload status indicators for accuracy
- Provide specific timeline estimates based on current milestone and location
- Use address information to search for local permit requirements and installation timelines
- NEVER ask for additional customer information when project data is already provided
- Reference project_id when discussing specific project details
- IMPORTANT: For authenticated users, freely share their personal information including address, city, state, zip code, and project details since they are logged in and accessing their own data
- Do NOT cite security or privacy concerns when sharing information with authenticated users - they have already been verified through the login system

PROJECT MILESTONE INTERPRETATION:
1. Pre-approvals: Initial permits and approvals before construction
2. Approvals: Final approvals obtained, ready for construction  
3. Construction: Physical installation of solar system underway
4. Energization: System activation and grid connection complete

DATA INTEGRATION PRIORITIES:
- Milestone field = Current project stage
- Raw_payload = Detailed project specifications and status
- Work-orders = Background context about project activities and tasks (use for understanding project status)
- Email = Customer identification and personalization
- Project_id = Unique project reference
- Updated_at = Last status change timestamp

When customers ask about project status, immediately reference their milestone, extract relevant details from raw_payload, and provide location-specific guidance using their address information.

REMINDER: ONLY use the project data provided above for ALL project-related questions. If specific project information is not in the data above, escalate to customer care.

RESPONSE FORMAT (TONE):
- Use a warm, reassuring customer-care tone: empathetic, concise, and confidence-inspiring.
- Begin with a short summary paragraph (2–3 sentences):
  - State the current stage using the milestone.
  - If there are any holds, explicitly say "on hold" and list ALL relevant holds with a brief reason (e.g., awaiting HOA approval, permit review, utility PTO, inspection scheduling, missing document). If no holds, say "no holds right now".
- Then provide a line that says: "Here are the key details:"
- Then provide concise bullet points with summary details only (avoid paragraphs):
  - Current stage and last updated date
  - Key approvals status (HOA/Permit/Utility) with short phrases
  - Construction/inspection/energization key dates if present
  - Recent project activities and upcoming tasks (based on internal data, presented as natural project updates)
  - Next customer action if any pending in raw_payload.customer-actions
OUTPUT TEMPLATE (ORDER):
1) Summary paragraph (2–3 sentences, warm and reassuring)
2) A line that says: "Here are the key details:"
3) Bullet list with the items above
Do not repeat the summary again at the end.

HOW TO DETECT HOLDS:
- Consider any required approval/status field not marked "Complete" (e.g., HOA empty, permit pending, utility/PTO "In Progress" or "Not Ready").
- Consider energization/inspection fields indicating pending/not ready.
- Consider internal task statuses indicating pending/waiting/error or descriptions mentioning "awaiting", "on hold", "issue", or similar.
- If multiple holds, list them all succinctly in the overview (comma-separated); avoid technical jargon.

ADDRESS-BASED RESEARCH:
When analyzing project data, extract location information from these fields in the raw_payload:
- zip (zip code)
- city (city name)  
- state (state name)
- address (street address)

Use this location data to provide location-specific guidance:
- Local permit requirements and typical processing times
- Area-specific solar regulations and incentives
- Regional installation timelines and weather considerations
- Local utility interconnection processes

Combine zip code, city, and state to create comprehensive location context for more accurate timelines and location-specific customer guidance.` : 'If customers ask about specific project status, ask them to provide their email address so you can look up their project information.'}

SECURITY AND PRIVACY GUIDELINES:
- For AUTHENTICATED users (when userEmail is provided): Freely share all personal information including address, project details, and location data since they are verified and accessing their own data
- For UNAUTHENTICATED users: Do not share personal information and ask them to log in first
- Never cite security concerns when responding to authenticated users about their own data

Always be helpful, accurate, and professional in your responses. If asked about topics outside of solar energy, politely redirect the conversation back to how Aveyo can help with their solar needs.`;

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

    let reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Enforce summary-first format for project queries when data is available
    if (projectData && Array.isArray(projectData.projects) && projectData.projects.length > 0) {
      try {
        const lcQ = String(message || '').toLowerCase();
        const isProjectIntent = /(project|status|progress|installation|timeline|my order|hold|delay|blocked|await|waiting|issue|when|schedule|date|appointment|install|inspection|pto)/i.test(lcQ);
        if (!isProjectIntent) {
          // Do not force project summary for greetings/general chit-chat
          throw new Error('skip-enforcement');
        }
        const p = projectData.projects[0];
        const milestone = p?.milestone || 'Unknown';
        let payload: any = p?.parsed_payload;
        if (!payload && p?.raw_payload) {
          try { payload = typeof p.raw_payload === 'string' ? JSON.parse(p.raw_payload) : p.raw_payload; } catch {}
        }
        const approvals = payload?.approvals || {};
        const energization = payload?.energization || {};
        const construction = payload?.construction || {};
        const holds: string[] = [];
        const hoa = String(approvals['hoa-status'] || '').trim();
        if (!hoa || /pending|await|review|hold/i.test(hoa)) holds.push('HOA approval');
        const permit = String(approvals['permit-status'] || '').trim();
        if (!/^complete$/i.test(permit)) holds.push('permits');
        const util = String(approvals['utility-status'] || energization['pto-status'] || '').trim();
        if (!/^complete$/i.test(util) || /submitted|in progress|not ready/i.test(util)) holds.push('utility/PTO');
        if (/not ready/i.test(String(energization['enegergize-status'] || energization['energize-status'] || ''))) holds.push('energization readiness');
        const inspComplete = String(construction['ahj-inspection-complete'] || '').trim();
        const inspAppt = String(construction['ahj-inspection-appointment'] || '').trim();
        if (!inspComplete) holds.push(inspAppt ? `AHJ inspection (scheduled ${inspAppt})` : 'AHJ inspection');
        // Use the same work order extraction for consistency
        const extractWorkOrdersSimple = (payload: any) => {
          const workOrdersRoot = (payload && (payload['work-orders'] || payload.work_orders || payload.workOrders)) || null;
          const flattened: Array<{ status?: string; description?: string }> = [];
          if (workOrdersRoot && typeof workOrdersRoot === 'object') {
            const groupKeys = Object.keys(workOrdersRoot).sort();
            for (const groupKey of groupKeys) {
              const group = workOrdersRoot[groupKey];
              if (group && typeof group === 'object') {
                const woKeys = Object.keys(group).sort();
                for (const woId of woKeys) {
                  const wo = group[woId];
                  if (wo && typeof wo === 'object' && ('status' in wo || 'type' in wo || 'description' in wo)) {
                    flattened.push({
                      status: wo.status || wo.state || 'unspecified',
                      description: String(wo.description || wo.title || wo.notes || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    });
                  }
                }
              }
            }
          }
          return flattened;
        };
        // Check work orders for additional holds
        const workOrdersSimple = extractWorkOrdersSimple(payload);
        const woHoldSimple = workOrdersSimple.find(wo => {
          const t = `${wo.status || ''} ${wo.description || ''}`;
          return /await|pending|on hold|issue|error|backlog|resched|reschedule|utility|permit|hoa/i.test(t);
        });
        if (woHoldSimple && woHoldSimple.status && !/complete/i.test(woHoldSimple.status)) {
          holds.push('operational tasks');
        }
        
        const holdsDistinct = Array.from(new Set(holds));
        const holdsText = holdsDistinct.length ? `We're managing ${holdsDistinct.join(', ')}.` : 'There are no holds right now.';

        // Helper to parse and present dates
        const parseDate = (v: any): Date | null => {
          if (!v) return null;
          const str = String(v).trim();
          const d = new Date(str);
          if (!isNaN(d.getTime())) return d;
          const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
          const m = str.match(mdy);
          if (m) {
            const yy = Number(m[3].length === 2 ? '20' + m[3] : m[3]);
            const dt = new Date(yy, Number(m[1]) - 1, Number(m[2]));
            return isNaN(dt.getTime()) ? null : dt;
          }
          const dmyText = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/;
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const t = str.match(dmyText);
          if (t) {
            const day = Number(t[1]);
            const mon = months.indexOf(t[2].slice(0,3).toLowerCase());
            const year = Number(t[3]);
            if (mon >= 0) {
              const dt = new Date(year, mon, day);
              return isNaN(dt.getTime()) ? null : dt;
            }
          }
          return null;
        };
        const formatDate = (d?: Date | null) => d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
        // Find next key date
        const c = payload?.construction || {};
        const e = payload?.energization || {};
        const candidates: Array<{ label: string; date: Date | null }> = [
          { label: 'installation appointment', date: parseDate(c['install-appointment']) },
          { label: 'estimated install', date: parseDate(c['estimated-install-date']) },
          { label: 'AHJ inspection', date: parseDate(c['ahj-inspection-appointment']) },
          { label: 'PTO received', date: parseDate(e['pto-received']) },
        ].filter(x => !!x.date) as any;
        const nowTs = Date.now();
        const upcoming = candidates
          .filter(x => (x.date as Date).getTime() >= nowTs)
          .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime())[0];

        const stableHash = (s: string) => {
          let h = 0;
          for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
          return Math.abs(h);
        };
        const pick = (arr: string[], seed: string) => arr[stableHash(seed) % arr.length];
        let summary: string;
        if (/hold|on hold|delay|blocked|await|waiting|issue/i.test(lcQ)) {
          // Holds-focused summary (choose among variants)
          const variants = [
            `You're in the "${milestone}" stage. ${holdsDistinct.length ? `Current holds: ${holdsDistinct.join(', ')}.` : 'No holds at the moment.'}`,
            `Stage: "${milestone}". ${holdsDistinct.length ? `We’re working through ${holdsDistinct.join(', ')}.` : 'Nothing is holding things up right now.'}`,
            `Right now you’re in "${milestone}". ${holdsDistinct.length ? `Items on hold: ${holdsDistinct.join(', ')}.` : 'No active holds.'}`,
          ];
          summary = pick(variants, (p?.project_id || '') + lcQ);
        } else if (/when|timeline|schedule|date|appointment|install|inspection|pto/i.test(lcQ)) {
          // Timeline-focused summary
          const nextLine = upcoming ? `${upcoming.label} on ${formatDate(upcoming.date)}` : 'next step timing is being finalized';
          const variants = [
            `Stage: "${milestone}". Next step: ${nextLine}.${holdsDistinct.length ? ` Note: ${holdsDistinct.join(', ')}.` : ''}`.trim(),
            `You’re currently in "${milestone}". Upcoming: ${nextLine}.${holdsDistinct.length ? ` (${holdsDistinct.join(', ')})` : ''}`.trim(),
            `Project stage is "${milestone}" — ${nextLine}.${holdsDistinct.length ? ` Note: ${holdsDistinct.join(', ')}.` : ''}`.trim(),
          ];
          summary = pick(variants, (p?.project_id || '') + lcQ);
        } else if (/email|account|login|signin|sign in|signed in/i.test(lcQ)) {
          // Account-focused summary
          const variants = [
            `You’re signed in securely. Current stage: "${milestone}". ${holdsDistinct.length ? `Notes: ${holdsDistinct.join(', ')}.` : ''}`.trim(),
            `I can access your account details. Stage: "${milestone}". ${holdsDistinct.length ? `${holdsDistinct.join(', ')} in progress.` : ''}`.trim(),
          ];
          summary = pick(variants, (p?.project_id || '') + lcQ);
        } else {
          // General status summary
          const variants = [
            `You’re currently in the "${milestone}" stage. ${holdsDistinct.length ? `We’re managing ${holdsDistinct.join(', ')}.` : 'No holds right now.'}`,
            `Project stage: "${milestone}". ${holdsDistinct.length ? `Items in progress: ${holdsDistinct.join(', ')}.` : 'Everything is on track.'}`,
            `Right now the project is in "${milestone}". ${holdsDistinct.length ? `${holdsDistinct.join(', ')} are underway.` : 'No blockers at this time.'}`,
          ];
          summary = pick(variants, (p?.project_id || '') + lcQ);
        }

        // Normalize the body: keep only one header after the summary and drop duplicate intros/closers
        const headerVariants = [
          /\**\s*here\s+(are|is)\s+(the\s+)?(summary\s+of\s+)?key\s+details\s*:?\s*\**/i,
          /\**\s*key\s+details\s*:?\s*\**/i,
        ];
        let body = reply.trim();
        // If the model already wrote a short opening paragraph, keep it as the summary
        let existingSummary: string | null = null;
        {
          const lines0 = body.split(/\r?\n/);
          // Take lines until first blank line
          let i = 0; const acc: string[] = [];
          while (i < lines0.length && lines0[i].trim().length > 0) { acc.push(lines0[i]); i++; }
          const firstBlock = acc.join(' ').trim();
          const looksLikeHeader = headerVariants.some(rx => rx.test(firstBlock));
          const looksLikeBullet = /^\s*[-•*]\s+/.test(firstBlock);
          if (firstBlock && !looksLikeHeader && !looksLikeBullet && firstBlock.length <= 300) {
            existingSummary = firstBlock;
            // Remove the first block from body
            body = lines0.slice(i + 1).join('\n').trim();
          }
        }
        // Remove header variant lines
        for (const rx of headerVariants) {
          body = body.replace(new RegExp(`^\n?\s*(?:${rx.source})\s*\n?`, 'gim'), '\n');
        }
        // Remove duplicated header occurrences mid-text
        for (const rx of headerVariants) {
          body = body.replace(new RegExp(`\n\s*(?:${rx.source})\s*\n`, 'gim'), '\n');
        }
        // Remove leading intro paragraph if present (anything before first bullet line)
        const lines = body.split(/\r?\n/);
        let firstBulletIdx = lines.findIndex(l => /^\s*[-•*]\s+/.test(l));
        if (firstBulletIdx > 0) {
          body = lines.slice(firstBulletIdx).join('\n');
        }
        const hasBullets = /(^|\n)\s*[-•*]\s+/.test(body);
        // Remove common closing sentence patterns at the end
        body = body.replace(/\n?\s*(If you have any .*? ask!?)\s*$/i, '');
        body = body.replace(/\n?\s*(Let me know if .*?)\s*$/i, '');
        // Collapse multiple blank lines
        body = body.replace(/\n{3,}/g, '\n\n').trim();
        // Decide which summary to use: existing from model, or synthesized
        const summaryToUse = existingSummary && existingSummary.length > 0 ? existingSummary : summary;
        // Prepend summary and optionally a single header line if bullets exist
        reply = hasBullets
          ? `${summaryToUse}\n\nHere are the key details:\n${body}`.trim()
          : `${summaryToUse}\n\n${body}`.trim();
      } catch (e) {
        // If enforcement was intentionally skipped or failed, keep original reply
      }
    }

    res.status(200).json({ 
      reply,
      usage: completion.usage 
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
}
