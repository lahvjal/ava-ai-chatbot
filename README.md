# AI Chatbot Widget

A modern, embeddable AI chatbot powered by OpenAI's ChatGPT API. Built with Next.js and designed for easy deployment on Vercel.

## Features

- 🤖 **ChatGPT Integration** - Powered by OpenAI's GPT-3.5-turbo model
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 📱 **Mobile Friendly** - Optimized for all screen sizes
- 🔒 **Rate Limited** - Built-in protection against API abuse
- 🌐 **Embeddable** - Easy to integrate into any website
- ⚡ **Fast Deployment** - Ready for Vercel with one click

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file with your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the chatbot in action.

## Deployment on Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Set the `OPENAI_API_KEY` environment variable in Vercel dashboard

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add `OPENAI_API_KEY` as an environment variable
4. Deploy!

## Embedding the Widget

Once deployed, you can embed the chatbot on any website by adding this script tag:

```html
<script src="https://your-domain.vercel.app/embed.js"></script>
```

The widget will appear as a floating chat button in the bottom-right corner of the page.

## Configuration

### Rate Limiting

The API is rate-limited to 20 requests per minute per IP address. You can modify this in `pages/api/rate-limit.ts`.

### Customization

- **Styling**: Modify `components/ChatWidget.tsx` and `public/embed.js`
- **AI Behavior**: Update the system prompt in `pages/api/chat.ts`
- **Widget Position**: Change the position in `public/embed.js`

## API Endpoints

- `POST /api/chat` - Send messages to the AI chatbot
- `GET /embed.js` - Embeddable widget script

## Security Features

- Rate limiting to prevent API abuse
- CORS headers for cross-origin requests
- Input validation and sanitization
- Error handling for API failures

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo
- **Icons**: Lucide React
- **Deployment**: Vercel

## License

MIT License - feel free to use this in your projects!
# Deployment trigger

## Admin Training Page

This project now supports an admin-maintained training document that Ava uses as company knowledge. Admins can edit it at `pages/admin/training.tsx` (route: `/admin/training`). The chat API injects this content into the system prompt.

### Setup

- Create the Supabase table:

```sql
create table if not exists public.ai_training_docs (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Optional RLS (Recommended)
alter table public.ai_training_docs enable row level security;

-- Read policy (public read)
create policy "Public read training docs"
on public.ai_training_docs for select
to anon, authenticated
using (true);

-- Write policy (admins only via server key or email check)
-- If you rely on service role key for writes, you can skip this. If you want authenticated admins to write via RLS, you can create a policy similar to:
-- create policy "Admins can insert"
-- on public.ai_training_docs for insert to authenticated
-- with check (auth.jwt() ->> 'email' = any (string_to_array(coalesce(current_setting('app.admin_emails', true), ''), ',')));
```

Note: For simplicity, this app writes using `supabaseAdmin` (service role key) on the server in `/pages/api/training.ts`. Ensure that only your server can call this route with valid admin auth.

### Environment Variables

Add these variables locally (`.env.local`) and in Vercel:

```env
OPENAI_API_KEY=YOUR_OPENAI_KEY
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Comma-separated admin emails
ADMIN_EMAILS=admin1@example.com,admin2@example.com
NEXT_PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

- `NEXT_PUBLIC_ADMIN_EMAILS` is used on the client UI to show/hide the Save button.
- `ADMIN_EMAILS` is used on the API route `/api/training` to enforce admin-only write access.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server writes to `ai_training_docs`.

### How it works

- UI: `/pages/admin/training.tsx` fetches the latest doc via `GET /api/training` and allows admins to edit and save via `POST /api/training`.
- API: `/pages/api/training.ts` uses `supabaseAdmin` to read/write the `ai_training_docs` table. POST requires an authenticated user whose email is in `ADMIN_EMAILS`.
- Chat: `/pages/api/chat.ts` fetches the latest doc and injects its `content` into the system prompt under a "KNOWLEDGE BASE" section.

### Notes

- Changes take effect on the next chat request; no retraining is required.
- You can version docs by inserting a new row each time (default behavior). The latest `updated_at` is used.
