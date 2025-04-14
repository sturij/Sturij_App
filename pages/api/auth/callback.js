// pages/api/auth/callback.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Get the authorization code from the URL
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return res.redirect('/auth/error?message=' + encodeURIComponent(error.message));
    }

    // Successful authentication, redirect to the dashboard or home page
    const redirectTo = req.cookies['authRedirectTarget'] || '/dashboard';
    res.setHeader('Set-Cookie', 'authRedirectTarget=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    
    return res.redirect(redirectTo);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return res.redirect('/auth/error?message=' + encodeURIComponent('Authentication failed'));
  }
}
