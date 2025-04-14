// pages/auth/callback.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState('Processing your login...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User has been signed in, redirect to dashboard or home page
        router.push('/dashboard');
      }
    });

    // Handle the initial session
    const handleInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          // User is already signed in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // No session found, might be an error with the magic link
          setError('No valid session found. The magic link may have expired.');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError('An error occurred while processing your login.');
      }
    };

    handleInitialSession();

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <h2 className="text-xl font-medium text-red-800 mb-2">Login Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <h2 className="mt-6 text-center text-xl font-medium text-gray-900">{message}</h2>
            <p className="mt-2 text-sm text-gray-600">You'll be redirected automatically once you're logged in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
