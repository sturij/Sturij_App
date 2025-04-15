// components/GoogleAuthButton.js
import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const GoogleAuthButton = ({ onSuccess, buttonText = "Sign in with Google" }) => {
  const router = useRouter();

  // Handle the response from Google - wrapped in useCallback to prevent recreation on each render
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Send the token to our API
      const apiResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || 'Failed to authenticate with Google');
      }

      const data = await apiResponse.json();
      
      // Store session in localStorage
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess(data);
      } else {
        // Redirect to dashboard or home page
        const redirectTo = localStorage.getItem('authRedirectTarget') || '/dashboard';
        localStorage.removeItem('authRedirectTarget');
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      alert('Authentication failed: ' + error.message);
    }
  }, [onSuccess, router]);

  useEffect(() => {
    // Load the Google API script
    const loadGoogleScript = () => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      script.onload = initializeGoogleAuth;
    };

    // Initialize Google Auth
    const initializeGoogleAuth = () => {
      if (!window.google) return;
      
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };

    loadGoogleScript();
    
    // Cleanup
    return () => {
      // Remove any Google Auth related elements
      const googleButtons = document.querySelectorAll('.google-auth-button');
      googleButtons.forEach(button => button.remove());
    };
  }, [handleGoogleResponse]); // Added handleGoogleResponse to dependency array

  // Render the Google Sign-In button
  const renderGoogleButton = useCallback(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        }
      );
    }
  }, []);

  useEffect(() => {
    // Render the button when the component mounts
    if (window.google && window.google.accounts) {
      renderGoogleButton();
    } else {
      // If Google API is not loaded yet, wait for it
      window.addEventListener('load', renderGoogleButton);
    }

    return () => {
      window.removeEventListener('load', renderGoogleButton);
    };
  }, [renderGoogleButton]); // Added renderGoogleButton to dependency array

  return (
    <div className="google-auth-container">
      <div 
        id="google-signin-button" 
        className="google-auth-button"
        aria-label="Sign in with Google"
      ></div>
      
      {/* Fallback button in case Google button doesn't render */}
      <button
        className="google-auth-fallback hidden"
        onClick={() => {
          if (window.google && window.google.accounts) {
            window.google.accounts.id.prompt();
          } else {
            alert('Google authentication is not available. Please try again later.');
          }
        }}
      >
        {buttonText}
      </button>
      
      <style jsx>{`
        .google-auth-container {
          margin: 1rem 0;
          display: flex;
          justify-content: center;
        }
        .hidden {
          display: none;
        }
        .google-auth-fallback {
          padding: 0.75rem 1.5rem;
          background-color: #4285F4;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .google-auth-fallback:hover {
          background-color: #357ae8;
        }
      `}</style>
    </div>
  );
};

export default GoogleAuthButton;