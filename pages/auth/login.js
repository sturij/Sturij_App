// pages/auth/login.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MagicLinkForm from '../../components/MagicLinkForm';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import { supabase } from '../../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Get the redirect target from query params or localStorage
  const { redirect } = router.query;
  
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // User is already logged in, redirect to dashboard or specified redirect
          const redirectTo = redirect || '/dashboard';
          router.push(redirectTo);
          return;
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Store redirect target in localStorage if provided
    if (redirect) {
      localStorage.setItem('authRedirectTarget', redirect);
    }
  }, [router, redirect]);
  
  const handleMagicLinkSuccess = (data) => {
    setMessage(`Magic link sent to ${data.email}. Please check your inbox.`);
  };
  
  const handleGoogleSuccess = (data) => {
    // This will be handled by the GoogleAuthButton component
    console.log('Google auth success:', data);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Login | Sturij</title>
        <meta name="description" content="Login to your Sturij account" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
            contact us for more information
          </a>
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Sign in with Magic Link</h3>
              <p className="mt-1 text-sm text-gray-500">
                We'll send a login link to your email
              </p>
              <div className="mt-3">
                <MagicLinkForm 
                  onSuccess={handleMagicLinkSuccess} 
                  redirectTo={redirect}
                />
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div>
              <GoogleAuthButton 
                onSuccess={handleGoogleSuccess}
                buttonText="Sign in with Google"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
