/**
 * Google Authentication Integration for Sturij
 * 
 * This script extends the existing SturijAuthSystem to fully integrate
 * Google authentication with the enquiry form and calendar booking system.
 */

// Configuration
const GOOGLE_CLIENT_ID = '149888504463-g1rnmb9fm3di45rh8tqi4snivtfhi3dc.apps.googleusercontent.com';
const AUTH_STORAGE_KEY = 'sturijUserInfo';
const REDIRECT_STORAGE_PREFIX = 'sturijRedirect_';
const AUTH_PAGE = 'auth.html';
const CALENDAR_PAGE = 'calendar.html';
const CUSTOMER_PORTAL_PATH = '/customer-portal.html';

/**
 * Google Authentication Manager
 * 
 * Extends the existing SturijAuthSystem with enhanced Google authentication
 */
class GoogleAuthManager {
  constructor() {
    this.initialized = false;
    this.googleAuthInitialized = false;
    this.googleUser = null;
    
    // Initialize on creation
    this.initialize();
  }
  
  /**
   * Initialize the Google authentication manager
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing GoogleAuthManager');
    
    // Load Google Sign-In API script
    this.loadGoogleSignInAPI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.initialized = true;
  }
  
  /**
   * Load Google Sign-In API script
   */
  loadGoogleSignInAPI() {
    // Check if script is already loaded
    if (document.getElementById('google-signin-api')) {
      console.log('Google Sign-In API script already loaded');
      return;
    }
    
    console.log('Loading Google Sign-In API script');
    
    // Create script element
    const script = document.createElement('script');
    script.id = 'google-signin-api';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    // Add onload handler
    script.onload = () => {
      console.log('Google Sign-In API script loaded');
      this.initializeGoogleAuth();
    };
    
    // Add error handler
    script.onerror = (error) => {
      console.error('Error loading Google Sign-In API script:', error);
    };
    
    // Add script to document
    document.head.appendChild(script);
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for DOM content loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.onDOMContentLoaded();
      });
    } else {
      this.onDOMContentLoaded();
    }
    
    // Listen for storage events (for cross-tab synchronization)
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_STORAGE_KEY) {
        console.log('Auth storage changed in another tab');
        this.checkAuthState();
      }
    });
  }
  
  /**
   * Handle DOM content loaded
   */
  onDOMContentLoaded() {
    console.log('DOM content loaded');
    
    // Check if we're on the auth page
    const isAuthPage = window.location.pathname.includes(AUTH_PAGE);
    
    if (isAuthPage) {
      console.log('Auth page detected');
      
      // Initialize Google authentication
      if (!this.googleAuthInitialized) {
        this.initializeGoogleAuth();
      }
    }
    
    // Check authentication state
    this.checkAuthState();
  }
  
  /**
   * Initialize Google authentication
   */
  initializeGoogleAuth() {
    // Check if Google Sign-In API is loaded
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
      console.log('Google Sign-In API not loaded yet, waiting...');
      setTimeout(() => this.initializeGoogleAuth(), 500);
      return;
    }
    
    try {
      console.log('Initializing Google Auth');
      console.log('Using Client ID:', GOOGLE_CLIENT_ID.substring(0, 10) + '...');
      
      // Initialize Google Sign-In
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      
      // Render Google Sign-In button if it exists
      const signInButton = document.getElementById('g_id_signin');
      if (signInButton) {
        console.log('Rendering Google Sign-In button');
        google.accounts.id.renderButton(
          signInButton,
          { theme: 'outline', size: 'large', width: 250 }
        );
        console.log('Google Sign-In button rendered successfully');
      } else {
        console.log('Google Sign-In button element not found');
      }
      
      // Display One Tap prompt
      console.log('Displaying One Tap prompt');
      google.accounts.id.prompt();
      console.log('One Tap prompt displayed');
      
      this.googleAuthInitialized = true;
      console.log('Google Auth initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
    }
  }
  
  /**
   * Handle Google credential response
   */
  handleCredentialResponse(response) {
    console.log('Google credential response received');
    
    try {
      // Decode JWT token
      const token = response.credential;
      const payload = this.decodeJWT(token);
      
      console.log('Google authentication successful');
      
      // Create user object
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        token: token,
        auth_method: 'google'
      };
      
      // Store user info
      this.setAuthState(user);
      
      // Handle redirect
      this.handleAuthSuccess(user);
    } catch (error) {
      console.error('Error handling Google credential response:', error);
    }
  }
  
  /**
   * Decode JWT token
   */
  decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      throw error;
    }
  }
  
  /**
   * Set authentication state
   */
  setAuthState(user) {
    try {
      this.googleUser = user;
      
      // Store in localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      console.log('Auth state updated: User authenticated', user.email);
      
      // Dispatch event
      this.dispatchAuthEvent(true, user);
      
      // Update UI if needed
      this.updateUI(true, user);
    } catch (error) {
      console.error('Error setting auth state:', error);
    }
  }
  
  /**
   * Clear authentication state
   */
  clearAuthState() {
    try {
      this.googleUser = null;
      
      // Remove from localStorage
      localStorage.removeItem(AUTH_STORAGE_KEY);
      
      console.log('Auth state cleared: User logged out');
      
      // Dispatch event
      this.dispatchAuthEvent(false, null);
      
      // Update UI if needed
      this.updateUI(false, null);
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }
  
  /**
   * Check authentication state
   */
  checkAuthState() {
    try {
      const userInfoString = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!userInfoString) {
        console.log('User is not authenticated');
        this.googleUser = null;
        this.updateUI(false, null);
        return false;
      }
      
      const userInfo = JSON.parse(userInfoString);
      if (!userInfo || !userInfo.token) {
        console.log('Invalid user info in storage');
        this.googleUser = null;
        this.updateUI(false, null);
        return false;
      }
      
      console.log('User is authenticated:', userInfo.email);
      this.googleUser = userInfo;
      this.updateUI(true, userInfo);
      return true;
    } catch (error) {
      console.error('Error checking auth state:', error);
      return false;
    }
  }
  
  /**
   * Dispatch authentication event
   */
  dispatchAuthEvent(isAuthenticated, user) {
    window.dispatchEvent(new CustomEvent('sturijAuthStateChanged', {
      detail: {
        isAuthenticated: isAuthenticated,
        user: user
      }
    }));
  }
  
  /**
   * Update UI based on authentication state
   */
  updateUI(isAuthenticated, user) {
    // Update auth status element if it exists
    const authStatusElement = document.getElementById('auth-status');
    if (authStatusElement) {
      if (isAuthenticated && user) {
        authStatusElement.textContent = `Signed in as: ${user.email}`;
        authStatusElement.classList.add('authenticated');
        authStatusElement.classList.remove('unauthenticated');
      } else {
        authStatusElement.textContent = 'Not signed in';
        authStatusElement.classList.add('unauthenticated');
        authStatusElement.classList.remove('authenticated');
      }
    }
    
    // Update user info elements if they exist
    if (isAuthenticated && user) {
      // Update user name
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) {
        userNameElement.textContent = user.name || '';
      }
      
      // Update user email
      const userEmailElement = document.getElementById('user-email');
      if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
      }
      
      // Update user image
      const userImageElement = document.getElementById('user-image');
      if (userImageElement && user.picture) {
        userImageElement.src = user.picture;
        userImageElement.style.display = 'block';
      }
    }
    
    // Show/hide elements based on authentication state
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = isAuthenticated ? 'block' : 'none';
    });
    
    document.querySelectorAll('.auth-not-required').forEach(el => {
      el.style.display = isAuthenticated ? 'none' : 'block';
    });
  }
  
  /**
   * Handle successful authentication
   */
  handleAuthSuccess(user) {
    console.log('Authentication successful, handling redirect');
    
    // Check for redirect target
    const redirectTarget = this.getRedirectTarget();
    
    if (redirectTarget) {
      console.log('Redirecting to:', redirectTarget);
      window.location.href = redirectTarget;
    } else {
      // Default redirect to calendar page
      console.log('No redirect target found, redirecting to calendar page');
      window.location.href = CALENDAR_PAGE;
    }
  }
  
  /**
   * Store redirect target
   */
  storeRedirectTarget(url = window.location.href) {
    const key = REDIRECT_STORAGE_PREFIX + 'google_auth';
    sessionStorage.setItem(key, url);
    console.log('Stored redirect target:', url);
  }
  
  /**
   * Get redirect target
   */
  getRedirectTarget() {
    const key = REDIRECT_STORAGE_PREFIX + 'google_auth';
    const url = sessionStorage.getItem(key);
    
    if (url) {
      // Clear redirect target
      sessionStorage.removeItem(key);
      return url;
    }
    
    return null;
  }
  
  /**
   * Sign out
   */
  signOut() {
    console.log('Signing out');
    
    // Clear auth state
    this.clearAuthState();
    
    // Redirect to auth page
    window.location.href = AUTH_PAGE;
  }
  
  /**
   * Get current user
   */
  getCurrentUser() {
    return this.googleUser;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.googleUser !== null;
  }
}

// Create singleton instance
const googleAuthManager = new GoogleAuthManager();

// Export for use in other scripts
window.googleAuthManager = googleAuthManager;

// Convenience functions for common auth operations
window.isGoogleAuthenticated = () => googleAuthManager.isAuthenticated();
window.getGoogleUser = () => googleAuthManager.getCurrentUser();
window.googleSignOut = () => googleAuthManager.signOut();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Google Authentication Manager initialized');
});
