import Head from 'next/head';
import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Ava - Aveyo Solar Assistant</title>
        <meta name="description" content="Meet Ava, your intelligent solar installation assistant from Aveyo" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ava - Aveyo Solar Assistant</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meet Ava, your intelligent solar installation assistant. Get instant answers about 
            solar panels, installation process, financing, and more from Aveyo's AI expert.
          </p>
        </div>

        <div className="flex justify-center">
          <ChatWidget />
        </div>

        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Embed</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 mb-4">
              To embed Ava on your website, add the following script tag to your HTML:
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{`<script src="https://your-domain.vercel.app/embed.js"></script>`}</code>
            </pre>
            <p className="text-sm text-gray-500 mt-2">
              Replace "your-domain" with your actual Vercel deployment URL.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
