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
