// pages/auth/google-callback.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run once the router is ready and we have the query parameters
    if (!router.isReady) return;

    const { code, state, error: googleError } = router.query;

    if (googleError) {
      setError(`Google authentication error: ${googleError}`);
      setLoading(false);
      return;
    }

    if (!code) {
      setError('No authorization code found');
      setLoading(false);
      return;
    }

    // Process the Google OAuth callback
    async function processGoogleCallback() {
      try {
        // Exchange the code for a token
        const response = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Get the redirect target from localStorage or default to dashboard
        const redirectTo = localStorage.getItem('authRedirectTarget') || '/dashboard';
        localStorage.removeItem('authRedirectTarget');

        // Redirect to the target page
        router.push(redirectTo);
      } catch (error) {
        console.error('Error processing Google callback:', error);
        setError(error.message || 'Authentication failed');
        setLoading(false);
      }
    }

    processGoogleCallback();
  }, [router.isReady, router.query, router]); // Added router to dependency array

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Head>
          <title>Google Authentication | Sturij</title>
        </Head>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Head>
          <title>Authentication Error | Sturij</title>
        </Head>
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <p className="mt-2">
              <button 
                onClick={() => router.push('/auth/login')}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Return to login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Head>
        <title>Redirecting... | Sturij</title>
      </Head>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
