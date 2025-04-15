// pages/api/auth/google-callback.js
import { supabaseClient } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the authorization code from the request body
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange the authorization code for tokens
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Supabase code exchange error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Return the session data
    return res.status(200).json({ 
      success: true, 
      session: data.session,
      user: data.user
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({ error: error.message });
  }
}
