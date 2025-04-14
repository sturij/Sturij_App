// pages/auth/test-magic-link.js
import { useState } from 'react';
import Head from 'next/head';

export default function TestMagicLink() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Test both the standard and custom magic link endpoints
      const standardResponse = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          redirectTo: `${window.location.origin}/auth/callback`
        }),
      });

      const standardData = await standardResponse.json();
      
      if (standardData.success) {
        setMessage({
          type: 'success',
          text: 'Magic link sent successfully! Check your email for the login link.'
        });
        
        // Log success for testing purposes
        console.log('Standard magic link sent successfully');
        
        // Also test the custom magic link endpoint
        const customResponse = await fetch('/api/auth/custom-magic-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email,
            redirectTo: `${window.location.origin}/auth/callback`
          }),
        });
        
        const customData = await customResponse.json();
        console.log('Custom magic link test result:', customData);
        
        setEmail('');
      } else {
        setMessage({
          type: 'error',
          text: standardData.error || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      console.error('Magic link test error:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Test Magic Link - Sturij</title>
      </Head>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Test Magic Link Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This page tests the magic link authentication flow
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSendMagicLink}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className={`rounded-md p-4 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <p>{message.text}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Sending...' : 'Test Magic Link'}
            </button>
          </div>
        </form>
        
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Implementation Details</h2>
          <p className="mb-2">This test uses:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Supabase Authentication with Magic Links</li>
            <li>Next.js API routes for authentication</li>
            <li>Custom email templates for branded emails</li>
          </ul>
          
          <p className="mb-2">Make sure you've set up the following environment variables:</p>
          <ul className="list-disc pl-5">
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
            <li><code>NEXT_PUBLIC_SITE_URL</code> (for redirects)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
