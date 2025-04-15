// pages/auth/google-callback.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run once the router is ready and we have query parameters
    if (!router.isReady) return;

    const { code, error: queryError } = router.query;

    // Handle error from Google
    if (queryError) {
      console.error('Google auth error:', queryError);
      setError(`Authentication error: ${queryError}`);
      setLoading(false);
      return;
    }

    // Handle missing code
    if (!code) {
      console.error('No authorization code found');
      setError('Authentication error: No authorization code found');
      setLoading(false);
      return;
    }

    // Process the callback on the server
    const processCallback = async () => {
      try {
        const response = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate');
        }

        // Store session in localStorage
        if (data.session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        }

        // Redirect to dashboard or home page
        const redirectTo = localStorage.getItem('authRedirectTarget') || '/dashboard';
        localStorage.removeItem('authRedirectTarget');
        router.push(redirectTo);
      } catch (error) {
        console.error('Error processing callback:', error);
        setError(`Authentication error: ${error.message}`);
        setLoading(false);
      }
    };

    processCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Head>
          <title>Authentication Error | Sturij</title>
        </Head>
        <div className="max-w-md w-full space-y-8 p-8 bg-white shadow rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <p className="mt-4">
              <button
                onClick={() => router.push('/login')}
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