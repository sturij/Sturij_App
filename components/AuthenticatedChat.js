import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import AIChatInterface from './AIChatInterface';

/**
 * AuthenticatedChat Component
 * 
 * This component handles authentication for the chat interface.
 * It shows the chat interface for authenticated users and an auth form for unauthenticated users.
 * It also provides a way to toggle between authenticated and guest modes.
 */
const AuthenticatedChat = ({ initialOpen = false }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  
  // Check if user is authenticated or in guest mode
  const isAuthenticated = !!user || guestMode;
  
  // Reset states when user changes
  useEffect(() => {
    if (user) {
      setShowAuth(false);
      setGuestMode(false);
    }
  }, [user]);
  
  // Handle auth toggle
  const handleAuthToggle = () => {
    if (!user) {
      setShowAuth(!showAuth);
      setGuestMode(false);
      setIsMinimized(false);
    }
  };
  
  // Handle guest mode toggle
  const handleGuestModeToggle = () => {
    setGuestMode(!guestMode);
    setShowAuth(false);
    setIsMinimized(false);
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
  };
  
  // Render chat or auth UI based on authentication state
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Show chat interface if authenticated or in guest mode */}
      {isAuthenticated && !showAuth && (
        <AIChatInterface initialOpen={initialOpen} />
      )}
      
      {/* Show auth UI if not authenticated and auth is toggled */}
      {!user && showAuth && !guestMode && (
        <div className="bg-white rounded-lg shadow-xl w-80 sm:w-96 p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Sign in for personalized assistance</h3>
            <button 
              onClick={handleAuthToggle}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
          
          <Auth
            supabaseClient={supabaseClient}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={['google']}
            redirectTo={`${window.location.origin}/auth/callback`}
            magicLink={true}
          />
          
          <div className="mt-4 text-center">
            <button
              onClick={handleGuestModeToggle}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Continue as guest
            </button>
          </div>
        </div>
      )}
      
      {/* User menu for authenticated users */}
      {user && !isMinimized && (
        <div className="mb-2 flex justify-end">
          <div className="bg-white rounded-lg shadow-md p-2 text-sm flex items-center">
            <span className="mr-2">Signed in as {user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
      
      {/* Auth toggle button for unauthenticated users not in guest mode */}
      {!user && !showAuth && !guestMode && !isMinimized && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={handleAuthToggle}
            className="bg-white rounded-lg shadow-md px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Sign in for personalized assistance
          </button>
        </div>
      )}
      
      {/* Guest mode indicator */}
      {guestMode && !isMinimized && (
        <div className="mb-2 flex justify-end">
          <div className="bg-white rounded-lg shadow-md p-2 text-sm flex items-center">
            <span className="mr-2">Guest mode</span>
            <button
              onClick={handleAuthToggle}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthenticatedChat;
