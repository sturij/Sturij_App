// pages/api/auth/google.js
import { supabaseClient } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the token from the request body
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Exchange the Google token for a Supabase session
    const { data, error } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token,
    });

    if (error) {
      console.error('Supabase Google auth error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Return the session data
    return res.status(200).json({ 
      success: true, 
      session: data.session,
      user: data.user
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: error.message });
  }
}
